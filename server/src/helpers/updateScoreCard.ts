import { ScoreCardModel } from "../models/ScoreCardModel";
import { ScoreCardTypes } from "../types";
import { sendTelegramMessage } from "../config/telegram";
import { getTelegramChannelIds } from "./getTelegramChannelId";
import buildExitTelegramMessage from "./buildExitTelegramMessage";
import { getMcxPnlMultiplier } from "./mcxLotMultipliers";
import { isWithinTradingHours } from "./marketHours";
import { ServiceModel } from "../models/PostModels";
import { sendNotification } from "./sendNotification";

/* ---------------- NORMALIZER ---------------- */
function normalizeTargets(item: any) {
  if (!item.targets || item.targets.length === 0) {
    item.targets = [{ price: item.target }];
  }
  return item;
}

/**
 * Updates open scorecards with latest LTPs,
 * handles trigger, SL, TP and timeout logic safely.
 *
 * IMPORTANT: This function now fetches fresh data from DB to avoid
 * stale data issues that caused incorrect SL triggers after targets were hit.
 */
export default async function updateScoreCard(
  data: ScoreCardTypes[],
  fetchedPrices: { symbolToken: string; ltp: string }[],
  now: Date
) {
  const openTrades = data.filter((item) => item.status === "open");

  for (let rawItem of openTrades) {
    try {
      /* ---------------- FETCH FRESH STATE FROM DB ---------------- */
      // Critical fix: Always fetch the latest trade state from DB
      // to avoid race conditions with stale data from queue
      const freshTradeDoc = await ScoreCardModel.findById(rawItem._id);

      // Skip if trade no longer exists or is already closed
      if (!freshTradeDoc || freshTradeDoc.status !== "open") {
        continue;
      }

      const item = normalizeTargets(freshTradeDoc.toObject()); // Use fresh data

      /* ---------------- MARKET-HOURS GATE ---------------- */
      // No tracking, close decisions, or Telegram messages outside the IST
      // trading window for this exchange. End-of-session sweep handles any
      // straggling expired-triggered trades.
      if (!isWithinTradingHours(item.exchange)) {
        continue;
      }

      /* ---------------- PRICE FETCH ---------------- */
      const matched = fetchedPrices.find(
        (price) => price.symbolToken === item.token
      );
      if (!matched) continue;

      const currLtp = Number(matched.ltp);
      if (isNaN(currLtp)) continue;

      // Always update LTP
      await ScoreCardModel.findByIdAndUpdate(item._id, {
        $set: { ltp: currLtp },
      });

      /* ---------------- TRIGGER LOGIC ---------------- */
      let shouldTrigger = false;

      if (item.rate) {
        shouldTrigger =
          item.triggerType === "below"
            ? currLtp <= Number(item.rate)
            : currLtp >= Number(item.rate);
      } else {
        // Range fallback
        shouldTrigger =
          currLtp >= Number(item.lowerRange) &&
          currLtp <= Number(item.upperRange);
      }

      if (shouldTrigger && item.istriggered === "not triggered") {
        await ScoreCardModel.findByIdAndUpdate(item._id, {
          $set: {
            istriggered: "triggered",
            entryPrice: item.rate ?? currLtp,
            triggeredAt: now,
          },
        });

        item.istriggered = "triggered";
      }

      // ⛔ Skip SL / TP / Timeout if not triggered
      if (item.istriggered !== "triggered") continue;

      /* ---------------- PnL BASE ---------------- */
      const entry = Number(item.entryPrice);
      const sl = Number(item.stoploss);
      const lotSize = item.lotsize ?? 1;
      const mcxMultiplier = getMcxPnlMultiplier(item.exchange, item.scriptname);
      const effectiveQty = lotSize * mcxMultiplier;

      let pnl = 0;
      let isSL = false;

      if (item.entryType === "buy") {
        pnl = (currLtp - entry) * effectiveQty;
        isSL = sl > 0 && currLtp <= sl;
      } else {
        pnl = (entry - currLtp) * effectiveQty;
        isSL = sl > 0 && currLtp >= sl;
      }

      const investment = entry * effectiveQty;
      const pnlPercentage =
        investment > 0 ? ((pnl / investment) * 100).toFixed(2) : "0.00";

      /* ---------------- CHECK IF ANY TARGET ALREADY HIT ---------------- */
      // Critical fix: If any target was already hit, don't trigger SL
      // This prevents the race condition where SL triggers after target
      const anyTargetHit = item.targets?.some((t: any) => t.isHit === true);

      /* ---------------- TIMEOUT ---------------- */
      const validityDate = new Date(item.validity);
      if (!isNaN(validityDate.getTime()) && now > validityDate) {
        if (anyTargetHit) {
          // Validity expired AFTER a target hit → silent TP close at last hit target
          let lastHitIdx = -1;
          for (let i = item.targets.length - 1; i >= 0; i--) {
            if (item.targets[i].isHit) {
              lastHitIdx = i;
              break;
            }
          }
          const lastHit = item.targets[lastHitIdx];

          const tpPnl =
            item.entryType === "buy"
              ? (lastHit.price - entry) * effectiveQty
              : (entry - lastHit.price) * effectiveQty;

          const tpPct =
            investment > 0 ? ((tpPnl / investment) * 100).toFixed(2) : "0.00";

          await closeTrade(
            item,
            "tp",
            lastHit.price,
            tpPnl,
            tpPct,
            lotSize,
            now
          );
          continue;
        }

        const closed = await closeTrade(
          item,
          "timeout",
          currLtp,
          pnl,
          pnlPercentage,
          lotSize,
          now
        );

        if (closed) {
          await sendToTelegram(
            item,
            buildExitTelegramMessage({
              scriptname: item.scriptname,
              exitPrice: currLtp,
              pnl,
              pnlPercentage,
              reason: "timeout",
            })
          );
        }
        continue;
      }

      /* ---------------- MULTI TARGET LOGIC (Check BEFORE SL) ---------------- */
      // Process target logic FIRST to ensure we don't miss targets
      let targetHitIndex = -1;

      for (let i = 0; i < item.targets.length; i++) {
        const t = item.targets[i];
        if (t.isHit) continue;

        if (
          (item.entryType === "buy" && currLtp >= t.price) ||
          (item.entryType === "sell" && currLtp <= t.price)
        ) {
          targetHitIndex = i;
          break;
        }
      }

      if (targetHitIndex !== -1) {
        const hitTarget = item.targets[targetHitIndex];

        // Mark target hit atomically
        await ScoreCardModel.findByIdAndUpdate(item._id, {
          $set: {
            [`targets.${targetHitIndex}.isHit`]: true,
            [`targets.${targetHitIndex}.hitAt`]: now,
          },
        });

        // 🔥 Last target => CLOSE TRADE
        if (targetHitIndex === item.targets.length - 1) {
          const tpPnl =
            item.entryType === "buy"
              ? (hitTarget.price - entry) * effectiveQty
              : (entry - hitTarget.price) * effectiveQty;

          const tpPct =
            investment > 0 ? ((tpPnl / investment) * 100).toFixed(2) : "0.00";

          const closed = await closeTrade(
            item,
            "tp",
            hitTarget.price,
            tpPnl,
            tpPct,
            lotSize,
            now
          );

          if (closed) {
            await sendToTelegram(
              item,
              buildExitTelegramMessage({
                scriptname: item.scriptname,
                exitPrice: hitTarget.price,
                pnl: tpPnl,
                pnlPercentage: tpPct,
                reason: `target ${targetHitIndex + 1}`,
              })
            );
          }
        }

        // Target was hit (partial or final) => skip SL check for this cycle
        continue;
      }

      /* ---------------- STOP LOSS ---------------- */
      // Only check SL if NO target has been hit yet
      // This prevents incorrect SL notification after target was achieved
      if (isSL && !anyTargetHit) {
        const slPnl =
          item.entryType === "buy"
            ? (sl - entry) * effectiveQty
            : (entry - sl) * effectiveQty;

        const slPct =
          investment > 0 ? ((slPnl / investment) * 100).toFixed(2) : "0.00";

        const closed = await closeTrade(
          item,
          "sl",
          sl,
          slPnl,
          slPct,
          lotSize,
          now
        );

        if (closed) {
          await sendToTelegram(
            item,
            buildExitTelegramMessage({
              scriptname: item.scriptname,
              exitPrice: sl,
              pnl: slPnl,
              pnlPercentage: slPct,
              reason: "sl",
            })
          );
        }
        continue;
      }

      /* ---------------- LIVE UPDATE ---------------- */
      await ScoreCardModel.findByIdAndUpdate(item._id, {
        $set: {
          pnl: pnl.toFixed(2),
          pnlpercentage: pnlPercentage,
          ltp: currLtp,
        },
      });
    } catch (err) {
      console.error("Error updating trade:", err);
    }
  }
}

/* ---------------- SAFE CLOSE ---------------- */
async function closeTrade(
  item: ScoreCardTypes,
  result: "sl" | "tp" | "timeout",
  exitRate: number,
  pnl: number,
  pnlPercentage: string,
  lotSize: number,
  now: Date
) {
  const updated = await ScoreCardModel.findOneAndUpdate(
    {
      _id: item._id,
      status: "open",
      ...(result === "timeout" && { validity: { $lte: now } }),
    },
    {
      $set: {
        status: "closed",
        result,
        exitRate,
        exitDate: now,
        pnl: pnl.toFixed(2),
        pnlpercentage: pnlPercentage,
        closedAt: now,
        closeReason: `${result.toUpperCase()} hit (Lot Size: ${lotSize})`,
      },
    },
    { new: true }
  );

  // Note: the in-app + PWA push notification used to fire here with a short
  // one-line summary. It's been moved into `sendToTelegram` so the bell and
  // OS banner carry the IDENTICAL multi-line body that goes to Telegram —
  // single source of truth, no message-format drift between channels.

  return !!updated;
}

/* ---------------- TELEGRAM ---------------- */
async function sendToTelegram(item: ScoreCardTypes, message: string) {
  try {
    if (!item.shareWithPlans?.length) return;

    const channelIds = await getTelegramChannelIds(item.shareWithPlans);
    if (channelIds.length) {
      await Promise.all(
        channelIds.map((id) =>
          sendTelegramMessage(id, message).catch(() => null),
        ),
      );
    }

    // Mirror the same Telegram body to the in-app bell + PWA push so
    // subscribers see identical content regardless of channel. Plans without
    // a Telegram channel still get the in-app notification.
    await fanOutExitInAppNotification(item, message);
  } catch {
    // Never block trade flow
  }
}

async function fanOutExitInAppNotification(
  item: ScoreCardTypes,
  message: string,
): Promise<void> {
  try {
    const planIds = (item.shareWithPlans || []) as any[];
    if (planIds.length === 0) return;

    const plans = await ServiceModel.find({ _id: { $in: planIds } }).select(
      "subscribedBy",
    );
    const subscribers = new Set<string>();
    for (const plan of plans) {
      (plan.subscribedBy || []).forEach((s: any) => subscribers.add(String(s)));
    }

    const author = (item as any).authorData || {};
    const authorId = author?.id ? String(author.id) : "";
    const sentBy = {
      id: authorId || "system",
      name: author.name || "Service Provider",
    };

    // The author (RA) gets the SAME price-triggered exit alert as subscribers,
    // but the two audiences need different CTAs: the subscriber link opens the
    // user recommendations page (which 403s for an RA account), while the RA's
    // own alert must open their provider dashboard. sendNotification bakes a
    // single postLink per doc, so we fan out to the two audiences separately
    // and keep the author out of the subscriber set.
    if (authorId) subscribers.delete(authorId);

    if (subscribers.size > 0) {
      await sendNotification({
        recipientIds: Array.from(subscribers),
        recipientRole: "both",
        message,
        type: "recommendation-closed",
        category: "sp",
        sentBy,
        postLink: "/dashboard/user/recommendations",
        ctaLabel: "View Outcome",
      });
    }

    if (authorId) {
      await sendNotification({
        recipientIds: [authorId],
        recipientRole: "provider",
        message,
        type: "recommendation-closed",
        category: "sp",
        sentBy,
        postLink: "/dashboard/serviceprovider/recommendations/myrecommendations",
        ctaLabel: "View Outcome",
      });
    }
  } catch (err) {
    console.error("[updateScoreCard] exit notification fan-out failed:", err);
  }
}
