import type { Request, Response } from "express";
import type { Socket } from "socket.io";
import { sendBotPublicMessage, sendTelegramMessage } from "../config/telegram";
import { adminNotify } from "../helpers/Notify";
import { sendNotification } from "../helpers/sendNotification";
import { getCachedPrice, getCachedPriceBulk, requestPrice } from "../services/PriceCache";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import { ServiceModel } from "../models/PostModels";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { parseExpiry } from "../utils/parseExpiry";
// Scorecard queues removed - tracking now handled by GlobalTradeTracker
import {
  addOpenTrade,
  removeOpenTrade,
  getOpenTradesByAuthor,
  getOpenTradesByAuthors,
  getOpenTradesByPlans,
  getOpenTradesByMarketplace,
} from "../services/OpenTradeRegistry";
import { getProfileFamilyIds } from "../utils/profileHelpers";
import { isAnyMarketOpen } from "../utils/marketHours";
import { MarketplaceModel } from "../models/MarketplaceModel";
import { getAllRelevantRAIds } from "./MarketplaceController";
import { publishScorecardChange, onScorecardChange } from "../services/ScorecardPubSub";
import { attachServiceNamesCached } from "../services/ServiceNameCache";
import {
  addBulkWhatsappMessagesToQueue,
  type WhatsappMessageJob,
} from "../queues/WhatsappMessageQueue";
import { formatScorecardForWhatsappTemplate } from "./WhatsappController";
import { fetchCMP } from "../helpers/ScoreCardData";

export const GetCmp = async (req: Request, res: Response) => {
  const { token, exchange } = req.body;

  if (!token || !exchange) {
    return res.status(400).json({
      success: false,
      message: "No Token Provided",
    });
  }

   try {
    const data = await fetchCMP(token, exchange);

    return res.status(200).json({
      success: true,
      message: "CMP fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Cmp",
      error: error,
    });
  }
};

export const createScoreCard = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: "No Data provided",
    });
  }

  const expectedKeys = [
    "name",
    "email",
    "id",
    "type",
    "authorImage",
    "exchange",
    "scriptname",
    "entryType",
    "token",
    "entryPrice",
    "stoploss",
    "validity",
  ];

  try {
    const parsedBody = JSON.parse(req.body.data);

    const allElementsPresent = expectedKeys.every((key) =>
      parsedBody.hasOwnProperty(key)
    );

    if (!allElementsPresent)
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });

    const files = req.files as {
      [fieldname: string]: Express.MulterS3.File[];
    };

    const recommendationPDF = files?.["recommendationPDF"]?.[0]?.location;

    const {
      name,
      email,
      id,
      type,
      authorImage,
      exchange,
      scriptname,
      entryType,

      targets, // 🔥 NEW
      target, // legacy

      token,
      rate,
      entryPrice,
      stoploss,
      validity: validityISO,
      upperRange,
      lowerRange,
      shareWith,
      shareWithPlans,
      isIntraday,
      riskRewardRatio,
      ltp,
      notes,
      link,
      lotsize,
      isRateRange,
      isCMPChecked,
      shareWithMarketplaces,
      expiry,
    } = parsedBody;

    /* ---------------- VALIDATE TARGETS ---------------- */

    let finalTargets = [];

    if (Array.isArray(targets) && targets.length > 0) {
      finalTargets = targets;
    } else if (target) {
      // BACKWARD SUPPORT
      finalTargets = [{ price: target }];
    } else {
      return res.status(400).json({
        success: false,
        message: "At least one target is required",
      });
    }

    const primaryTarget = finalTargets[0].price;

    /* ---------------- VALIDITY ---------------- */

    // Backend computes the exact IST market-close timestamp.
    // Frontend sends only a "YYYY-MM-DD" date string (or any ISO date for intraday).
    // MCX closes at 23:15 IST; all other exchanges close at 15:15 IST.
    const isMCX = exchange === "MCX";
    const closeTime = isMCX ? "23:15:00" : "15:15:00";

    let validity: Date;

    if (isIntraday === "intraday") {
      // Derive today's date in IST so midnight crossovers don't give the wrong day
      const nowIST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const yyyy = nowIST.getFullYear();
      const mm = String(nowIST.getMonth() + 1).padStart(2, "0");
      const dd = String(nowIST.getDate()).padStart(2, "0");
      validity = new Date(`${yyyy}-${mm}-${dd}T${closeTime}+05:30`);
    } else {
      // validityISO is "YYYY-MM-DD" from the frontend
      const dateOnly = String(validityISO).split("T")[0]; // safe if full ISO is sent
      validity = new Date(`${dateOnly}T${closeTime}+05:30`);
    }

    if (isNaN(validity.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid validity date",
      });
    }

    // For FnO / MCX trades, the contract has its own expiry. Validity must
    // not outlive that — otherwise the trade keeps "running" past the
    // option expiry which is meaningless. Only enforced when an expiry
    // string was actually provided (cash equity sends nothing here).
    {
      const expiryDate = parseExpiry(expiry);
      if (expiryDate && validity > expiryDate) {
        return res.status(400).json({
          success: false,
          message: "Validity cannot exceed contract expiry",
        });
      }
    }

    /* ---------------- ENTRY PRICE RESOLUTION ---------------- */

    let effectiveEntryPrice: number;

    try {
      effectiveEntryPrice = resolveEntryPrice({
        isRateRange,
        isCMPChecked,
        rate,
        cmp: ltp,
        upperRange,
        lowerRange,
        entryType,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    /* ---------------- TRIGGER LOGIC ---------------- */

    let triggerType: "above" | "below" | "immediate";
    let finalEntryPrice = effectiveEntryPrice;

    if (isRateRange === "range") {
      // Range trade: trigger immediately if CMP is already inside the range.
      // Entry is taken at current LTP, matching what the tracker does on
      // delayed triggers (GlobalTradeTracker/updateScoreCard set entryPrice = currLtp).
      if (ltp >= lowerRange && ltp <= upperRange) {
        triggerType = "immediate";
        finalEntryPrice = ltp;
      } else if (ltp < lowerRange) {
        triggerType = "above";
      } else {
        triggerType = "below";
      }
    } else {
      if (effectiveEntryPrice > ltp) {
        triggerType = "above";
      } else if (effectiveEntryPrice < ltp) {
        triggerType = "below";
      } else {
        triggerType = "immediate";
      }
    }

    const isTriggered =
      triggerType === "immediate" ? "triggered" : "not triggered";

    /* ---------------- SAVE ---------------- */

    const newScoreCard = new ScoreCardModel({
      authorData: {
        id,
        name,
        email,
        authorImage,
        type,
      },

      exchange,
      scriptname,
      entryType,

      targets: finalTargets, // 🔥 NEW
      target: primaryTarget, // legacy support

      ltp,
      rate: isRateRange === "rate" ? effectiveEntryPrice : undefined,

      token,
      entryPrice: finalEntryPrice,
      stoploss,
      validity,
      expiry, // contract expiry for FnO / MCX (undefined for cash equity)
      upperRange,
      lowerRange,
      shareWith,

      pnl: 0,
      pnlpercentage: 0,

      shareWithPlans,
      holdingPeriod: isIntraday,
      riskRewardRatio,

      istriggered: isTriggered,

      ...(notes && { notes }),
      ...(link && { link }),
      ...(recommendationPDF && { recommendationPDF }),

      lotsize,
      triggerType,
      shareWithMarketplaces,
    });

    await newScoreCard.save();

    // Add to Redis registry for real-time tracking
    await addOpenTrade(newScoreCard);

    // Notify live socket handlers about the new trade
    await publishScorecardChange({
      type: "created",
      tradeId: newScoreCard._id.toString(),
      authorId: id,
      planIds: shareWithPlans,
      marketplaceIds: (shareWithMarketplaces || []).map((m: any) => m.toString()),
    });

    /* ---------------- TELEGRAM ---------------- */

    if (shareWith.includes("subscribers") && shareWithPlans.length > 0) {
      const plans = await ServiceModel.find({
        _id: { $in: shareWithPlans },
      });

      // Build the recommendation message once and reuse it across every
      // surface (Telegram, in-app bell, PWA push). The only difference
      // between formats is the PDF link: Telegram's HTML mode supports
      // <a href="..."> for nice "Click Here" rendering, while the in-app
      // bell shows plain text — so we emit the raw URL there.
      const baseLines: string[] = [];
      baseLines.push("📈 New Recommendation");
      baseLines.push(
        `${newScoreCard.entryType.toUpperCase()}: ${newScoreCard.scriptname}`,
      );
      // Skip Lotsize for MCX (uses its own multiplier) and for Equity
      // recommendations. Equity scorecards have no `expiry` (set only on
      // FnO / derivatives), so its presence is the discriminator since
      // `segment` isn't persisted on this model.
      if (
        newScoreCard.lotsize &&
        newScoreCard.exchange !== "MCX" &&
        newScoreCard.expiry
      ) {
        baseLines.push(`Lotsize: ${newScoreCard.lotsize}`);
      }
      if (newScoreCard.rate !== undefined) {
        baseLines.push(`Rate: ${newScoreCard.rate}`);
      }
      if (newScoreCard.lowerRange || newScoreCard.upperRange) {
        baseLines.push(
          `Range: ${newScoreCard.lowerRange || ""} - ${newScoreCard.upperRange || ""}`,
        );
      }
      if (newScoreCard.targets?.length) {
        baseLines.push("Targets:");
        newScoreCard.targets.forEach((t: any, i: number) => {
          baseLines.push(`🎯 T${i + 1}: ${t.price}`);
        });
      }
      baseLines.push(`Stop Loss: ${newScoreCard.stoploss}`);
      baseLines.push(`CMP: ${newScoreCard.ltp}`);
      if (newScoreCard.validity) {
        baseLines.push(
          `Validity: ${formatValidityForTelegram(
            newScoreCard.validity,
            newScoreCard.holdingPeriod,
          )}`,
        );
      }
      if (newScoreCard.notes) {
        baseLines.push(`🖊️ Notes: ${newScoreCard.notes}`);
      }
      const reportTelegramLine = newScoreCard.recommendationPDF
        ? `📄 Report: <a href="${newScoreCard.recommendationPDF}">Click Here</a>`
        : null;
      const reportPlainLine = newScoreCard.recommendationPDF
        ? `📄 Report: ${newScoreCard.recommendationPDF}`
        : null;
      const linkLine = newScoreCard.link ? `🔗 Link: ${newScoreCard.link}` : null;

      const telegramMessage = [...baseLines, reportTelegramLine, linkLine]
        .filter(Boolean)
        .join("\n");
      const inAppMessage = [...baseLines, reportPlainLine, linkLine]
        .filter(Boolean)
        .join("\n");

      for (const plan of plans) {
        if (plan.telegramChannelId) {
          await sendTelegramMessage(plan.telegramChannelId, telegramMessage);
        }

        // WhatsApp remains unchanged
        if (plan.subscribedBy?.length) {
          await sendWhatsappMessagesToSubscribers(
            plan.subscribedBy,
            newScoreCard,
            plan._id.toString(),
            id,
            "new_recommendation"
          );
        }

        // In-app bell + PWA push fan-out to plan subscribers. Same content as
        // the Telegram message so a subscriber sees identical details no
        // matter which channel reaches them first. The push helper truncates
        // to a single-line OS banner; the bell row renders the full text.
        const subs = (plan.subscribedBy || []).map(String);
        if (subs.length > 0) {
          await sendNotification({
            recipientIds: subs,
            recipientRole: "both",
            message: inAppMessage,
            type: "recommendation-new",
            category: "sp",
            sentBy: { id, name },
            postLink: "/dashboard/user/recommendations",
            ctaLabel: "View Recommendation",
            sendToLabel: `Subscribers of ${plan.title}`,
          });
        }
      }

      // Notify the RA themself — once, regardless of how many plans the rec
      // was shared with — so they see the same multi-line Telegram-style
      // entry in their own bell + PWA push as confirmation of the post.
      // CTA links to their own recommendations dashboard, not the user side.
      if (id) {
        await sendNotification({
          recipientIds: [String(id)],
          recipientRole: "provider",
          message: inAppMessage,
          type: "recommendation-new",
          category: "sp",
          sentBy: { id, name },
          postLink: "/dashboard/serviceprovider/recommendations/myrecommendations",
          ctaLabel: "View Recommendation",
        });
      }
    }

    await adminNotify(
      `${newScoreCard.authorData?.name} has uploaded a new Recommendation`
    );

    return res.status(200).json({
      success: true,
      message: "Scorecard Saved",
      data: newScoreCard,
    });
  } catch (error) {
    console.log("error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save scorecard",
      error,
    });
  }
};


export const updateNotes = async (req: Request, res: Response) => {
  try {
    const { scorecardId } = req.params;
    const { notes } = req.body;

    if (!scorecardId) {
      return res.status(400).json({
        success: false,
        message: "Scorecard ID is required",
      });
    }

    // Find the existing scorecard
    const existingScorecard = await ScoreCardModel.findById(scorecardId);

    if (!existingScorecard) {
      return res.status(404).json({
        success: false,
        message: "Scorecard not found",
      });
    }

    // Check if the trade is closed
    if (existingScorecard.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a closed trade",
      });
    }

    // Update notes field
    const updatedScorecard = await ScoreCardModel.findByIdAndUpdate(
      scorecardId,
      {
        $set: {
          notes: notes || "",
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedScorecard) {
      return res.status(404).json({
        success: false,
        message: "Scorecard not found after update",
      });
    }

    // Send notifications to subscribers if needed
    const { shareWith, shareWithPlans } = existingScorecard;

    if (shareWith?.includes("subscribers") && shareWithPlans?.length > 0) {
      const plans = await ServiceModel.find({ _id: { $in: shareWithPlans } });

      for (const plan of plans) {
        if (plan.telegramChannelId) {
          let botMessage = `📝 Additional Information Updated\n\n`;
          botMessage += `📊 Script: ${updatedScorecard.scriptname}\n`;
          botMessage += `Type: ${
            updatedScorecard.entryType?.toUpperCase() || "N/A"
          }\n`;

          if (notes) {
            // Truncate if too long for Telegram
            const truncatedInfo =
              notes.length > 200 ? notes.substring(0, 200) + "..." : notes;
            botMessage += `📋 Additional Info: ${truncatedInfo}\n`;
          }

          await sendTelegramMessage(plan.telegramChannelId, botMessage);
        }

        // WhatsApp notifications for subscribers
        if (plan.subscribedBy && plan.subscribedBy.length > 0) {
          await sendWhatsappMessagesToSubscribers(
            plan.subscribedBy,
            updatedScorecard,
            plan._id.toString(),
            updatedScorecard.authorData?.id || "",
            "trade_change",
            "Additional Information Updated",
            `Additional info updated for ${updatedScorecard.scriptname}`
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Additional information updated successfully",
      data: updatedScorecard,
    });
  } catch (error) {
    console.error("Error updating additional information:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update additional information",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const modifyScoreCard = async (req: Request, res: Response) => {
  try {
    const { scorecardId } = req.params;
    const updateData = req.body;

    if (!scorecardId) {
      return res.status(400).json({
        success: false,
        message: "Scorecard ID is required",
      });
    }

    const existingScorecard = await ScoreCardModel.findById(scorecardId);

    if (!existingScorecard) {
      return res.status(404).json({
        success: false,
        message: "Scorecard not found",
      });
    }

    if (existingScorecard.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a closed trade",
      });
    }

    const allowedUpdates: any = {};
    const validationErrors: string[] = [];

    // Resolve the holding period the trade SHOULD have after this request. If
    // the payload sends a valid new value, that takes precedence; otherwise we
    // stick with whatever the trade was created with. Used by
    // computeModifyValidity so a provider switching intraday → forward (or
    // vice versa) gets the correct close time computed.
    const targetHoldingPeriod:
      | "intraday"
      | "btst"
      | "forward"
      | undefined =
      updateData.holdingPeriod === "intraday" ||
      updateData.holdingPeriod === "btst" ||
      updateData.holdingPeriod === "forward"
        ? updateData.holdingPeriod
        : (existingScorecard.holdingPeriod as
            | "intraday"
            | "btst"
            | "forward"
            | undefined);

    // Compute validity as IST market-close. For intraday trades the date is
    // forced to today (same behavior as the create flow) since the submitted
    // date string, when parsed as UTC midnight, becomes 5:30 AM IST and
    // causes the trade to immediately time-out.
    const computeModifyValidity = (
      raw: unknown,
      effectiveHoldingPeriod: "intraday" | "btst" | "forward" | undefined
    ): Date | null => {
      const isMCX = existingScorecard.exchange === "MCX";
      const closeTime = isMCX ? "23:15:00" : "15:15:00";

      if (effectiveHoldingPeriod === "intraday") {
        const nowIST = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );
        const yyyy = nowIST.getFullYear();
        const mm = String(nowIST.getMonth() + 1).padStart(2, "0");
        const dd = String(nowIST.getDate()).padStart(2, "0");
        const d = new Date(`${yyyy}-${mm}-${dd}T${closeTime}+05:30`);
        return isNaN(d.getTime()) ? null : d;
      }

      // forward: need a real YYYY-MM-DD from the payload OR fall back to the
      // existing trade's validity date (lets a holding-period-only change go
      // through without the frontend having to resend the date).
      let dateOnly = String(raw ?? "").split("T")[0];
      if (!dateOnly && existingScorecard.validity) {
        dateOnly = new Date(existingScorecard.validity).toISOString().split("T")[0];
      }
      if (!dateOnly) return null;
      const d = new Date(`${dateOnly}T${closeTime}+05:30`);
      return isNaN(d.getTime()) ? null : d;
    };

    // When the holding period changes, validity MUST be recomputed even if the
    // frontend didn't touch the date field, so an intraday-converted-to-forward
    // doesn't keep today's close, and a forward-converted-to-intraday doesn't
    // keep a far-future date.
    const holdingPeriodChanged =
      targetHoldingPeriod !== existingScorecard.holdingPeriod;

    /* =====================================================
       NOT TRIGGERED
    ===================================================== */
    if (existingScorecard.istriggered === "not triggered") {
      const allowedFields = [
        "entryPrice",
        "rate",
        "upperRange",
        "lowerRange",
        "validity",
        "target",
        "stoploss",
        "notes",
        "link",
        "lotsize",
        "shareWithPlans",
        "shareWithMarketplaces",
        "holdingPeriod",
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] === undefined) return;

        if (field === "validity") {
          const validityDate = computeModifyValidity(
            updateData.validity,
            targetHoldingPeriod
          );
          if (!validityDate) {
            validationErrors.push("Invalid validity date");
          } else {
            allowedUpdates.validity = validityDate;
          }
        } else if (field === "holdingPeriod") {
          if (
            updateData.holdingPeriod !== "intraday" &&
            updateData.holdingPeriod !== "btst" &&
            updateData.holdingPeriod !== "forward"
          ) {
            validationErrors.push("Invalid holding period");
          } else {
            allowedUpdates.holdingPeriod = updateData.holdingPeriod;
          }
        } else {
          allowedUpdates[field] = updateData[field];
        }
      });

      // If the holding period changed but the payload didn't send a new
      // validity, recompute anyway so the stored validity matches the new
      // period (e.g. intraday→forward shouldn't keep today's close).
      if (holdingPeriodChanged && allowedUpdates.validity === undefined) {
        const validityDate = computeModifyValidity(
          updateData.validity,
          targetHoldingPeriod
        );
        if (validityDate) allowedUpdates.validity = validityDate;
      }

      if (updateData.entryPrice !== undefined && updateData.entryPrice <= 0) {
        validationErrors.push("Entry price must be greater than 0");
      }

      // Sync entryPrice to rate for not-triggered rate-based trades
      if (updateData.entryPrice !== undefined && existingScorecard.rate) {
        allowedUpdates.rate = updateData.entryPrice;
      }

      // Handle targets array update
      if (Array.isArray(updateData.targets) && updateData.targets.length > 0) {
        allowedUpdates.targets = updateData.targets;
        allowedUpdates.target = updateData.targets[0]?.price || updateData.target;
      }

      if (
        updateData.target > 0 &&
        existingScorecard.entryType === "buy" &&
        updateData.target <= existingScorecard.entryPrice
      ) {
        validationErrors.push(
          "For BUY, target must be higher than entry price"
        );
      }

      if (
        updateData.target > 0 &&
        existingScorecard.entryType === "sell" &&
        updateData.target >= existingScorecard.entryPrice
      ) {
        validationErrors.push(
          "For SELL, target must be lower than entry price"
        );
      }

      if (
        updateData.stoploss > 0 &&
        existingScorecard.entryType === "buy" &&
        updateData.stoploss >= existingScorecard.entryPrice
      ) {
        validationErrors.push(
          "For BUY, stoploss must be lower than entry price"
        );
      }

      if (
        updateData.stoploss > 0 &&
        existingScorecard.entryType === "sell" &&
        updateData.stoploss <= existingScorecard.entryPrice
      ) {
        validationErrors.push(
          "For SELL, stoploss must be higher than entry price"
        );
      }
    } else if (existingScorecard.istriggered === "triggered") {

    /* =====================================================
       TRIGGERED
    ===================================================== */
      if (updateData.holdingPeriod !== undefined) {
        if (
          updateData.holdingPeriod !== "intraday" &&
          updateData.holdingPeriod !== "btst" &&
          updateData.holdingPeriod !== "forward"
        ) {
          validationErrors.push("Invalid holding period");
        } else {
          allowedUpdates.holdingPeriod = updateData.holdingPeriod;
        }
      }

      if (updateData.validity !== undefined) {
        const validityDate = computeModifyValidity(
          updateData.validity,
          targetHoldingPeriod
        );
        if (!validityDate) {
          validationErrors.push("Invalid validity date");
        } else {
          allowedUpdates.validity = validityDate;
        }
      }

      // Same holding-period-change safeguard as the not-triggered branch.
      if (holdingPeriodChanged && allowedUpdates.validity === undefined) {
        const validityDate = computeModifyValidity(
          updateData.validity,
          targetHoldingPeriod
        );
        if (validityDate) allowedUpdates.validity = validityDate;
      }

      if (updateData.target !== undefined) {
        allowedUpdates.target = updateData.target;

        if (
          updateData.target > 0 &&
          existingScorecard.entryType === "buy" &&
          updateData.target <= existingScorecard.entryPrice
        ) {
          validationErrors.push(
            "For BUY, target must be higher than entry price"
          );
        }

        if (
          updateData.target > 0 &&
          existingScorecard.entryType === "sell" &&
          updateData.target >= existingScorecard.entryPrice
        ) {
          validationErrors.push(
            "For SELL, target must be lower than entry price"
          );
        }
      }

      // Handle targets array update for triggered trades
      if (Array.isArray(updateData.targets) && updateData.targets.length > 0) {
        allowedUpdates.targets = updateData.targets;
        allowedUpdates.target = updateData.targets[0]?.price || updateData.target;
      }

      if (updateData.stoploss !== undefined) {
        allowedUpdates.stoploss = updateData.stoploss;

        if (
          updateData.stoploss > 0 &&
          existingScorecard.entryType === "buy" &&
          updateData.stoploss >= existingScorecard.entryPrice
        ) {
          validationErrors.push(
            "For BUY, stoploss must be lower than entry price"
          );
        }

        if (
          updateData.stoploss > 0 &&
          existingScorecard.entryType === "sell" &&
          updateData.stoploss <= existingScorecard.entryPrice
        ) {
          validationErrors.push(
            "For SELL, stoploss must be higher than entry price"
          );
        }
      }

      if (
        updateData.target !== undefined ||
        updateData.stoploss !== undefined
      ) {
        const newTarget = updateData.target ?? existingScorecard.target;
        const newStoploss = updateData.stoploss ?? existingScorecard.stoploss;

        allowedUpdates.riskRewardRatio = calculateRatio(
          newTarget,
          existingScorecard.entryPrice,
          newStoploss,
          existingScorecard.entryType.toLowerCase()
        );
      }
    }

    // Final guard: if a new validity was computed AND the trade carries a
    // contract expiry (FnO / MCX), the new validity must not outlive the
    // contract. Cash-equity trades have no `expiry` so this is a no-op.
    if (allowedUpdates.validity instanceof Date) {
      const expiryDate = parseExpiry((existingScorecard as any).expiry);
      if (expiryDate && allowedUpdates.validity > expiryDate) {
        validationErrors.push("Validity cannot exceed contract expiry");
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const updatedScorecard = await ScoreCardModel.findByIdAndUpdate(
      scorecardId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    // Merge old and new plan/marketplace IDs for notifications
    const oldPlans = existingScorecard.shareWithPlans || [];
    const newPlans = updatedScorecard?.shareWithPlans || oldPlans;
    const allPlanIds = [...new Set([...oldPlans, ...newPlans.map((p: any) => p.toString())])];

    const oldMarketplaces = (existingScorecard.shareWithMarketplaces || []).map((m: any) => m.toString());
    const newMarketplaces = (updatedScorecard?.shareWithMarketplaces || oldMarketplaces).map((m: any) => m.toString());
    const allMarketplaceIds = [...new Set([...oldMarketplaces, ...newMarketplaces])];

    // Sync modified fields to Redis so live socket handler sees them
    if (updatedScorecard && existingScorecard.status === "open") {
      const { updateCachedTrade } = await import("../services/OpenTradeRegistry.js");
      // Carry the fresh updatedAt into the cache too — otherwise the live
      // re-emit keeps the old timestamp and the client's dedupe guard
      // (sameRows) can't tell the row changed when nothing else did (e.g. a
      // target tweak after market hours, when ltp/pnl are static).
      await updateCachedTrade(scorecardId, {
        ...allowedUpdates,
        updatedAt: (updatedScorecard as any).updatedAt
          ? new Date((updatedScorecard as any).updatedAt).toISOString()
          : new Date().toISOString(),
      });

      await publishScorecardChange({
        type: "modified",
        tradeId: scorecardId,
        authorId: existingScorecard.authorData?.id || "",
        planIds: allPlanIds,
        marketplaceIds: allMarketplaceIds,
      });
    }

    const { shareWith } = existingScorecard;

    if (shareWith?.includes("subscribers") && allPlanIds.length > 0) {
      const plans = await ServiceModel.find({ _id: { $in: allPlanIds } });

      // Build the modify diff once — it depends only on the before/after of
      // the scorecard, not on which plan it's fanning out to. Null when no
      // user-facing field actually changed (e.g. only internal recompute).
      const modifyMessage = buildModifyTelegramMessage(
        existingScorecard.toObject() as ScoreCardTypes,
        updatedScorecard?.toObject() as ScoreCardTypes,
        allowedUpdates,
      );

      if (modifyMessage) {
        const authorId = String(existingScorecard.authorData?.id || "");
        const authorName = String(existingScorecard.authorData?.name || "");

        for (const plan of plans) {
          if (plan.telegramChannelId) {
            await sendTelegramMessage(plan.telegramChannelId, modifyMessage);
          }

          // In-app bell + PWA push fan-out to plan subscribers — same body as
          // Telegram so subscribers see the identical diff regardless of
          // channel. Mirrors the createScoreCard flow.
          const subs = (plan.subscribedBy || []).map(String);
          if (subs.length > 0) {
            await sendNotification({
              recipientIds: subs,
              recipientRole: "both",
              message: modifyMessage,
              type: "recommendation-modified",
              category: "sp",
              sentBy: { id: authorId, name: authorName },
              postLink: "/dashboard/user/recommendations",
              ctaLabel: "View Recommendation",
              sendToLabel: `Subscribers of ${plan.title}`,
            });
          }
        }

        // RA self-notification — fires once for the modification, regardless
        // of how many plans the trade is shared with.
        if (authorId) {
          await sendNotification({
            recipientIds: [authorId],
            recipientRole: "provider",
            message: modifyMessage,
            type: "recommendation-modified",
            category: "sp",
            sentBy: { id: authorId, name: authorName },
            postLink: "/dashboard/serviceprovider/recommendations/myrecommendations",
            ctaLabel: "View Recommendation",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Scorecard updated successfully",
      data: updatedScorecard,
    });
  } catch (error) {
    console.error("Error modifying scorecard:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to modify scorecard",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Reuse your existing calculateRatio function
function calculateRatio(
  target: number,
  entryPrice: number,
  stoploss: number,
  entryType: string
): string {
  let risk, reward;

  if (entryType === "buy") {
    risk = entryPrice - stoploss;
    reward = target - entryPrice;
  } else {
    risk = stoploss - entryPrice;
    reward = entryPrice - target;
  }

  if (risk === 0) return "N/A";

  const ratio = (reward / risk).toFixed(2);
  return `1:${ratio}`;
}

/**
 * Heavy / modal-only fields excluded from the live dashboard payload.
 * The detail modal calls this on open to enrich whatever it already has
 * from the table row. Keeping this endpoint thin lets us trim ~60-80%
 * off the per-tick socket bandwidth.
 */
export const getScorecardDetails = async (req: Request, res: Response) => {
  try {
    // Route is `GET /:scorecardId/details` — match the param name from
    // the route definition. Earlier this destructured `id` and the
    // endpoint always 400'd because `req.params.id` was undefined.
    const { scorecardId } = req.params;
    if (!scorecardId) {
      return res
        .status(400)
        .json({ success: false, message: "Trade ID is required" });
    }
    const doc = await ScoreCardModel.findById(scorecardId)
      .select(
        "rational notes link recommendationPDF rationalPDF rationalText",
      )
      .lean();
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Trade not found" });
    }
    return res.status(200).json({
      success: true,
      data: {
        rational: (doc as any).rational ?? "",
        notes: (doc as any).notes ?? "",
        link: (doc as any).link ?? "",
        recommendationPDF: (doc as any).recommendationPDF ?? "",
        rationalPDF: (doc as any).rationalPDF ?? "",
        rationalText: (doc as any).rationalText ?? "",
      },
    });
  } catch (err) {
    console.error("[getScorecardDetails] failed:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const FetchMyRecommendations = async (req: Request, res: Response) => {
  const { id, planId } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Provider ID is required",
    });
  }

  try {
    // For Non-Individual profiles, include sub-profile recommendations
    const authorIds = await getProfileFamilyIds(id as string);

    const services = await ServiceModel.find({
      "authorData.id": { $in: authorIds },
    }).select("_id title");

    const baseQuery: any = { "authorData.id": { $in: authorIds } };

    if (planId && planId !== "all") {
      baseQuery.shareWithPlans = planId;
    }

    const data = await ScoreCardModel.find(baseQuery).sort({ createdAt: -1 });

    // RA roster for the firm (master + every sub-profile) so the Performance
    // page can offer a per-RA filter that lists EVERY RA — including ones who
    // haven't posted a recommendation yet. Deriving the list from the trades
    // alone would hide brand-new sub-profiles. Single-RA families (solo RA /
    // user sub) just get themselves, so the frontend hides the filter.
    const raDocs = await ServiceProviderRegModel.find({
      _id: { $in: authorIds },
    })
      .select("_id RegName name")
      .lean();
    const ras = raDocs.map((r: any) => ({
      id: String(r._id),
      name: r.RegName || r.name || "RA",
    }));

    return res.status(200).json({
      success: true,
      message: "Recommendations fetched successfully",
      data,
      plans: services,
      ras,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations",
      error: error,
    });
  }
};

export const getsharedwithplans = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "No id provided",
    });
  }

  try {
    const { id } = req.query;

    const scorecard = await ScoreCardModel.findById(id);

    const plans = await ServiceModel.find({
      _id: { $in: scorecard?.shareWithPlans },
    }).select("title");

    return res.status(200).json({
      success: true,
      message: "Plans fetched",
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getAllClosedTrades = async (req: Request, res: Response) => {
  try {
    const trades = await ScoreCardModel.aggregate([
      {
        $match: { status: "closed" },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 50,
      },
      {
        $addFields: {
          SharedBy: "$authorData.name",
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$$ROOT", { SharedBy: "$SharedBy" }] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Trades fetched",
      data: trades,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getClosedTradesSharedWithPlan = async (
  req: Request,
  res: Response
) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch",
    });
  }

  try {
    const trades = await ScoreCardModel.aggregate([
      {
        $match: {
          status: "closed",
          shareWithPlans: id,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 50,
      },
      {
        $addFields: {
          SharedBy: "$authorData.name",
        },
      },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$$ROOT", { SharedBy: "$SharedBy" }] },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Trades fetched",
      data: trades,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getCMPForTable = async (req: Request, res: Response) => {
  const { values } = req.body;
  if (!values) {
    return res
      .status(400)
      .json({ success: false, message: "No Data provided" });
  }

  try {
    // Read prices from Redis cache (populated by MarketPriceFetcher)
    const exchangeTokens = values.exchangeTokens || {};
    const tokenList: Array<{ exchange: string; token: string }> = [];

    for (const [exchange, tokens] of Object.entries(exchangeTokens)) {
      if (Array.isArray(tokens)) {
        for (const token of tokens) {
          tokenList.push({ exchange, token });
        }
      }
    }

    const priceMap = await getCachedPriceBulk(tokenList);

    // Format response to match the old fetchCMPInGroup format
    const data = Array.from(priceMap.entries()).map(([symbolToken, ltp]) => ({
      symbolToken,
      ltp: String(ltp),
    }));

    return res.status(200).json({
      success: true,
      message: "data fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const manualTradeExit = async (req: Request, res: Response) => {
  const { id, pnl, pnlpercentage, ltp, exitDate } = req.body;
  if (!id || pnl == null || pnlpercentage == null || ltp == null || !exitDate) {
    return res.status(400).json({
      success: false,
      message: "No data provided",
    });
  }

  try {
    const trade = await ScoreCardModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "closed",
          result: "manual",
          pnl,
          pnlpercentage: Number(pnlpercentage) || 0,
          exitRate: ltp,
          exitDate,
        },
      },
      { new: true }
    );

    if (!trade) {
      return res
        .status(404)
        .json({ success: false, message: "Trade not found" });
    }

    // Remove from Redis registry
    await removeOpenTrade(trade._id.toString(), trade.exchange, trade.token);

    // Notify live socket handlers about the manual exit
    await publishScorecardChange({
      type: "manual_exit",
      tradeId: trade._id.toString(),
      authorId: trade.authorData?.id || "",
      planIds: trade.shareWithPlans || [],
      marketplaceIds: (trade.shareWithMarketplaces || []).map((m: any) => m.toString()),
    });

    const script = await ScoreCardModel.findById(id);

    const entryPrice =
      typeof trade.entryPrice === "number"
        ? trade.entryPrice
        : Number(trade.rate) || 0;

    const lotSize =
      typeof trade.lotsize === "number" && trade.lotsize > 0
        ? trade.lotsize
        : 1;

    const totalInvestment = entryPrice * lotSize;

    const pnlPercent =
      totalInvestment > 0
        ? ((Number(pnl) / totalInvestment) * 100).toFixed(2)
        : "0.00";

    const isLoss = Number(pnl) < 0;
    const returnSign = isLoss ? "-" : "+";
    const absPct = Math.abs(parseFloat(pnlPercent)).toFixed(2);
    const footer = isLoss ? "" : "\nHappy Trading 🚀";

    const botMessage = `
📉 Trade Exited

${script?.scriptname}
Exit Rate: ${ltp}

${isLoss ? "Loss" : "Profit"}: ₹${Math.abs(Number(pnl))}
Return: ${returnSign}${absPct}%
${footer}
`;

    // Check if the trade was shared with subscribers
    if (trade.shareWith.includes("subscribers")) {
      // Get all plan IDs from shareWithPlans
      const planIds = trade.shareWithPlans || [];

      // Find all services in the ServiceModel that have these plan IDs
      const services = await ServiceModel.find({ _id: { $in: planIds } });

      const authorId = String(trade.authorData?.id || "");
      const authorName = String(trade.authorData?.name || "");
      const allSubscriberIds = new Set<string>();

      if (services.length > 0) {
        for (const service of services) {
          const telegramChannelId = service.telegramChannelId;

          if (telegramChannelId) {
            // Send the bot message to each Telegram channel
            await sendTelegramMessage(telegramChannelId, botMessage);
          }
          // WhatsApp messaging logic for subscribers
          if (service.subscribedBy && service.subscribedBy.length > 0) {
            await sendWhatsappMessagesToSubscribers(
              service.subscribedBy,
              trade,
              service._id.toString(),
              trade.authorData?.id || "",
              "trade_change",
              "Trade Exited",
              `Exit ${script?.scriptname} at ${ltp} with ${pnl}`
            );
          }

          // Collect subscribers for the bell + PWA push fan-out below.
          for (const sub of service.subscribedBy || []) {
            allSubscriberIds.add(String(sub));
          }
        }
      }

      // In-app bell + PWA push — identical body to the Telegram bot message
      // so subscribers see the exit details no matter which channel reaches
      // them first. Mirrors the auto-close (SL/TP/timeout) flow.
      if (allSubscriberIds.size > 0) {
        await sendNotification({
          recipientIds: Array.from(allSubscriberIds),
          recipientRole: "both",
          message: botMessage,
          type: "recommendation-closed",
          category: "sp",
          sentBy: { id: authorId, name: authorName },
          postLink: "/dashboard/user/recommendations",
          ctaLabel: "View Recommendation",
        });
      }

      // RA self-notification — confirms the manual exit on the RA's own bell
      // + push, same body as subscribers see.
      if (authorId) {
        await sendNotification({
          recipientIds: [authorId],
          recipientRole: "provider",
          message: botMessage,
          type: "recommendation-closed",
          category: "sp",
          sentBy: { id: authorId, name: authorName },
          postLink: "/dashboard/serviceprovider/recommendations/myrecommendations",
          ctaLabel: "View Recommendation",
        });
      }
    }

    if (trade.shareWith.includes("all")) {
      await sendBotPublicMessage(botMessage);
    }

    return res.status(200).json({
      success: true,
      message: "status updated",
      data: trade,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error,
    });
  }
};

// ########################################################

const SCORECARD_PAGE_SIZE = 10;

// Fields the dashboard row needs from a closed Mongo doc. Anything heavy
// (rational, recommendationPDF, link, notes, rationalPDF, rationalText) is
// fetched on demand by TradeDetailsModal via GET /api/scorecard/:id/details.
const CLOSED_DASHBOARD_SELECT =
  "_id exchange scriptname entryType entryPrice rate stoploss targets target validity istriggered ltp lotsize upperRange lowerRange shareWithPlans shareWith holdingPeriod shareWithMarketplaces status pnl pnlpercentage createdAt updatedAt riskRewardRatio exitRate exitDate result token triggerType authorData";

export const updateLiveScoreCardDashboard = async (socket: Socket) => {
  // Per-socket cleanup. Stashed on the socket so a repeated `details` emit
  // (reconnect, role switch, dev-mode StrictMode double-mount) can tear down
  // the previous interval + pubsub before setting up new ones. Without this,
  // each duplicate emit leaks a 1.5s interval forever.
  let socketCleanup: (() => void) | null = null;

  // Register disconnect synchronously, once per connection — independent of
  // whether `details` ever fires.
  socket.on("disconnect", () => {
    if (socketCleanup) {
      socketCleanup();
      socketCleanup = null;
    }
  });

  socket.on("details", async ({ id, role, page, openPage, closedPage }) => {
    if (!id) return;

    // Tear down any prior `details` setup on this same socket.
    if (socketCleanup) {
      socketCleanup();
      socketCleanup = null;
    }

    // Backwards compat: clients that only send `page` get it applied to open
    // trades. New clients send openPage/closedPage explicitly.
    const initialOpenPage = openPage ?? page ?? 0;

    let liveInterval: NodeJS.Timeout | null = null;
    let unsubPubSub: (() => void) | null = null;

    // Outer state — populated by the async setup below. The synchronously-
    // registered `loadMore` handler awaits `ready` so any user click that
    // fires during setup queues correctly instead of being silently
    // dropped (the previous bug: loadMore was registered AFTER awaits).
    let authorIds: string[] = [];
    let closedFilter: any = null;
    let closedTrades: any[] = [];
    let totalClosedTrades: number = 0;

    const ready = (async () => {
      authorIds = await getProfileFamilyIds(id);
      const authorIdSet = new Set(authorIds);
      closedFilter = {
        "authorData.id": { $in: authorIds },
        status: "closed",
      };

      // Page 0 of closed trades + total count for the infinite-scroll bound.
      // .select(...) keeps the row payload tight — the modal fetches heavy
      // fields (rational/PDF/link/notes) on demand.
      const fetchClosedPage0 = async () => {
        const raw = await ScoreCardModel.find(closedFilter)
          .select(CLOSED_DASHBOARD_SELECT)
          .sort({ createdAt: -1 })
          .limit(SCORECARD_PAGE_SIZE)
          .lean();
        return attachServiceNamesCached(raw);
      };

      // The find and the count are independent; running them in parallel
      // halves the initial wait on the closed tab.
      const [closedTradesInit, totalClosedTradesInit] = await Promise.all([
        fetchClosedPage0(),
        ScoreCardModel.countDocuments(closedFilter),
      ]);
      closedTrades = closedTradesInit;
      totalClosedTrades = totalClosedTradesInit;

      // --- Helper: emit only the open-trade tab from Redis ---
      // Runs on the 1.5s live tick. Closed trades have their own emit
      // path below — they only change on pub/sub events, so re-shipping
      // them every 1.5s was wasted bandwidth + render work.
      const emitOpenFromRedis = async () => {
        try {
          const { trades: openTradesRedis, total: totalOpenTrades } =
            authorIds.length > 1
              ? await getOpenTradesByAuthors(authorIds, initialOpenPage, SCORECARD_PAGE_SIZE)
              : await getOpenTradesByAuthor(id, initialOpenPage, SCORECARD_PAGE_SIZE);

          const openTrades = await attachServiceNamesCached(openTradesRedis);

          socket.emit("scorecardOpen", { openTrades, totalOpenTrades });
        } catch (err) {
          console.error("[Dashboard] open emit error:", err);
        }
      };

      const emitClosedFromCache = () => {
        try {
          socket.emit("scorecardClosed", {
            closedTrades,
            totalClosedTrades,
          });
        } catch (err) {
          console.error("[Dashboard] closed emit error:", err);
        }
      };

      // --- Initial emit: open + closed in one round trip ---
      await emitOpenFromRedis();
      emitClosedFromCache();

      // --- Live polling from Redis every 1.5s — OPEN ONLY ---
      // Outside market hours LTPs don't change (MarketPriceFetcher isn't
      // receiving ticks), so re-emitting the same snapshot is wasted CPU
      // + bandwidth. The interval still fires every 1.5s; the body is a
      // no-op when no market is open. Pubsub-driven emits below bypass
      // the gate so create/close/manual_exit still update the UI.
      liveInterval = setInterval(() => {
        if (!isAnyMarketOpen()) return;
        emitOpenFromRedis();
      }, 1500);

      // --- Pub/Sub: react to state changes (close/create/delete) ---
      // The inner handler is async but the pubsub dispatcher invokes it
      // sync — wrap in try/catch so unhandled rejections (e.g. transient
      // Mongo error) don't kill the dispatcher and cascade across handlers.
      unsubPubSub = onScorecardChange((event) => {
        if (!authorIdSet.has(event.authorId)) return;
        (async () => {
          try {
            if (
              event.type === "closed" ||
              event.type === "manual_exit" ||
              event.type === "deleted"
            ) {
              const [refreshed, refreshedCount] = await Promise.all([
                fetchClosedPage0(),
                ScoreCardModel.countDocuments(closedFilter),
              ]);
              closedTrades = refreshed;
              totalClosedTrades = refreshedCount;
              emitClosedFromCache();
            }
            // Always nudge the open tab — a close removes a trade, a
            // create/triggered modifies one.
            await emitOpenFromRedis();
          } catch (err) {
            console.error("[Dashboard] pubsub handler error:", err);
          }
        })();
      });
    })();

    // Register `loadMore` SYNCHRONOUSLY — before any await — so a click
    // during the setup window queues correctly. The handler awaits
    // `ready` before doing anything that depends on the closed filter
    // / author ids.
    socket.on(
      "loadMore",
      async ({ tab, page: requestedPage }: { tab: "open" | "closed"; page: number }) => {
        try {
          await ready;
          if (tab === "open") {
            const { trades: openRedis, total } =
              authorIds.length > 1
                ? await getOpenTradesByAuthors(
                    authorIds,
                    requestedPage,
                    SCORECARD_PAGE_SIZE,
                  )
                : await getOpenTradesByAuthor(
                    id,
                    requestedPage,
                    SCORECARD_PAGE_SIZE,
                  );
            const trades = await attachServiceNamesCached(openRedis);
            socket.emit("loadMoreResult", {
              tab: "open",
              page: requestedPage,
              trades,
              total,
            });
          } else {
            const raw = await ScoreCardModel.find(closedFilter)
              .select(CLOSED_DASHBOARD_SELECT)
              .sort({ createdAt: -1 })
              .skip(requestedPage * SCORECARD_PAGE_SIZE)
              .limit(SCORECARD_PAGE_SIZE)
              .lean();
            const trades = await attachServiceNamesCached(raw);
            socket.emit("loadMoreResult", {
              tab: "closed",
              page: requestedPage,
              trades,
              total: totalClosedTrades,
            });
          }
        } catch (err) {
          console.error("[Dashboard] loadMore error:", err);
        }
      },
    );

    // Cleanup hook for THIS details setup. Called by the disconnect
    // listener registered up top, or by a subsequent `details` emit on
    // the same socket.
    socketCleanup = () => {
      if (liveInterval) {
        clearInterval(liveInterval);
        liveInterval = null;
      }
      if (unsubPubSub) {
        unsubPubSub();
        unsubPubSub = null;
      }
      socket.removeAllListeners("loadMore");
    };

    // Surface setup errors instead of letting them silently abort the
    // dashboard. The cleanup above still runs via disconnect.
    try {
      await ready;
    } catch (error) {
      console.error("[Dashboard] Setup error:", error);
      if (socketCleanup) socketCleanup();
      socketCleanup = null;
    }
  });
};

export const updateLiveScoreCardForSubscribed = async (socket: Socket) => {
  // Same idempotent-handler pattern as the SP dashboard: register
  // disconnect once, and let a re-emit of `details` tear down the prior
  // setup before installing a new one. Without this a reconnect during
  // dev (or a transient socket bounce in prod) leaks the 1.5s interval.
  let socketCleanup: (() => void) | null = null;

  socket.on("disconnect", () => {
    if (socketCleanup) {
      socketCleanup();
      socketCleanup = null;
    }
  });

  socket.on("details", async ({ id, role, page }) => {
    if (!id) return;

    if (socketCleanup) {
      socketCleanup();
      socketCleanup = null;
    }

    let liveInterval: NodeJS.Timeout | null = null;
    let unsubPubSub: (() => void) | null = null;

    try {
      // Role gate — only customers and providers (who may also be subscribers
      // of another RA's plan) reach this socket. We no longer dereference the
      // user doc; the active-orders fetch below is authoritative.
      if (role !== "user" && role !== "provider") return;

      // Scope to ACTIVE subscription windows only. The customer should see a
      // recommendation only if (a) they have a currently-active order for the
      // plan it was shared with, and (b) the rec was created on or after the
      // order's startDate (i.e. the user was subscribed when the RA posted it).
      // Once a subscription expires, the corresponding recs disappear from
      // both the open and closed tabs.
      const now = new Date();
      const activeOrders = await OrderModel.find({
        "orderdBy.id": String(id),
        type: { $in: ["service", "package"] },
        isExpired: { $ne: true },
        $or: [
          { endDate: { $gt: now } },
          { endDate: null },
          { endDate: { $exists: false } },
        ],
      })
        .select("subscribedToId startDate endDate")
        .lean();

      if (activeOrders.length === 0) return;

      // Normalise once: { planId: string; from: Date } pairs. `from` is the
      // earliest moment the user was entitled to see that plan's recs.
      type ActiveWindow = { planId: string; from: Date };
      const windows: ActiveWindow[] = activeOrders.map((o: any) => ({
        planId: String(o.subscribedToId),
        from: o.startDate ? new Date(o.startDate) : new Date(0),
      }));

      const planIdStrings = Array.from(
        new Set(windows.map((w) => w.planId)),
      );

      // For multiple active orders on the same plan (e.g. overlapping
      // packages), pick the EARLIEST start so recs in either window stay
      // visible — strictly an "or" of the windows on a per-plan basis.
      const earliestStartByPlan = new Map<string, Date>();
      for (const w of windows) {
        const prev = earliestStartByPlan.get(w.planId);
        if (!prev || w.from < prev) earliestStartByPlan.set(w.planId, w.from);
      }

      // MongoDB filter for closed trades: $or across plans, each branch
      // constraining createdAt to that plan's earliest-start onwards.
      const closedFilter = {
        shareWith: "subscribers" as const,
        status: "closed" as const,
        $or: Array.from(earliestStartByPlan.entries()).map(
          ([planId, from]) => ({
            shareWithPlans: planId,
            createdAt: { $gte: from },
          }),
        ),
      };

      // Predicate reused by the open-trade Redis path (in-process filter).
      const isWithinWindow = (trade: any): boolean => {
        const createdAt = trade?.createdAt ? new Date(trade.createdAt) : null;
        if (!createdAt) return false;
        const tradePlanIds: string[] = (trade?.shareWithPlans || []).map(String);
        return tradePlanIds.some((pid) => {
          const from = earliestStartByPlan.get(pid);
          return !!from && createdAt >= from;
        });
      };

      // --- Fetch page-0 of closed trades + total count in parallel ---
      // .select(...) keeps row payload tight — heavy fields (rational, PDF,
      // link, notes) come from /api/scorecard/:id/details on modal open.
      const fetchClosedPage0 = async () => {
        const raw = await ScoreCardModel.find(closedFilter)
          .select(CLOSED_DASHBOARD_SELECT)
          .sort({ createdAt: -1 })
          .limit(SCORECARD_PAGE_SIZE)
          .lean();
        return raw;
      };

      const [closedTradesInit, totalClosedTradesInit] = await Promise.all([
        fetchClosedPage0(),
        ScoreCardModel.countDocuments(closedFilter),
      ]);
      let closedTrades: any[] = closedTradesInit;
      let totalClosedTrades: number = totalClosedTradesInit;

      // --- Helper: open-only emit on the 1.5s tick ---
      // We over-fetch (3× the page size) and then filter in-process so a
      // small window-trimmed page still lands close to SCORECARD_PAGE_SIZE
      // when most fetched trades pass the window check. Trades that pre-date
      // the user's subscription startDate are dropped here.
      const emitOpenFromRedis = async () => {
        try {
          const { trades: rawOpen, total: rawTotal } =
            await getOpenTradesByPlans(
              planIdStrings,
              page ?? 0,
              SCORECARD_PAGE_SIZE * 3,
            );
          const filtered = (rawOpen || []).filter(isWithinWindow);
          const openTrades = filtered.slice(0, SCORECARD_PAGE_SIZE);
          // Total is approximate — Redis count doesn't apply the window. We
          // shrink it by the dropped ratio so the UI counter is still close.
          const keepRatio = rawOpen?.length
            ? filtered.length / rawOpen.length
            : 1;
          const totalOpenTrades = Math.max(
            openTrades.length,
            Math.round(rawTotal * keepRatio),
          );
          socket.emit("scorecardOpen", { openTrades, totalOpenTrades });
        } catch (err) {
          console.error("[Subscribed] open emit error:", err);
        }
      };

      // --- Helper: closed emit from in-memory cache ---
      const emitClosedFromCache = () => {
        try {
          socket.emit("scorecardClosed", { closedTrades, totalClosedTrades });
        } catch (err) {
          console.error("[Subscribed] closed emit error:", err);
        }
      };

      // --- Initial emit (both tabs) ---
      await emitOpenFromRedis();
      emitClosedFromCache();

      // --- Live polling: open only, gated on market hours ---
      // Outside market hours LTPs aren't moving, so re-emitting the same
      // snapshot is wasted work. Pubsub still fires on create/close/etc.
      liveInterval = setInterval(() => {
        if (!isAnyMarketOpen()) return;
        emitOpenFromRedis();
      }, 1500);

      // --- Pub/Sub: react to state changes ---
      const planSet = new Set(planIdStrings);

      unsubPubSub = onScorecardChange((event) => {
        const eventPlans = event.planIds || [];
        const isRelevant = eventPlans.some((p) => planSet.has(p));
        if (!isRelevant) return;

        (async () => {
          try {
            if (
              event.type === "closed" ||
              event.type === "manual_exit" ||
              event.type === "deleted"
            ) {
              const [refreshed, refreshedCount] = await Promise.all([
                fetchClosedPage0(),
                ScoreCardModel.countDocuments(closedFilter),
              ]);
              closedTrades = refreshed;
              totalClosedTrades = refreshedCount;
              emitClosedFromCache();
            }
            // Always nudge the open tab — a create/triggered modifies one.
            await emitOpenFromRedis();
          } catch (err) {
            console.error("[Subscribed] pubsub handler error:", err);
          }
        })();
      });

      socketCleanup = () => {
        if (liveInterval) {
          clearInterval(liveInterval);
          liveInterval = null;
        }
        if (unsubPubSub) {
          unsubPubSub();
          unsubPubSub = null;
        }
      };
    } catch (error) {
      console.error("[Subscribed] Setup error:", error);
      if (liveInterval) clearInterval(liveInterval);
      if (unsubPubSub) unsubPubSub();
    }
  });
};

export const updateLiveScoreCardForMarketplace = async (socket: Socket) => {
  socket.on("details", async ({ marketplaceId }) => {
    if (!marketplaceId) return;

    let liveInterval: NodeJS.Timeout | null = null;
    let unsubPubSub: (() => void) | null = null;

    try {
      console.log(`[Marketplace] Socket connected, marketplaceId=${marketplaceId}`);

      const marketplace = await MarketplaceModel.findById(marketplaceId).lean();
      if (!marketplace) {
        console.log(`[Marketplace] Marketplace not found: ${marketplaceId}`);
        return;
      }

      const activeRaIds = ((marketplace as any).activeRaIds || []).map(
        (id: any) => id.toString()
      );
      const allAuthorIds = await getAllRelevantRAIds(activeRaIds);
      const authorSet = new Set(allAuthorIds);

      console.log(`[Marketplace] Resolved ${allAuthorIds.length} author IDs from ${activeRaIds.length} active RAs`);

      const marketplaceObjId = new mongoose.Types.ObjectId(marketplaceId);

      const closedTradesRaw = await ScoreCardModel.find({
        "authorData.id": { $in: allAuthorIds },
        shareWithMarketplaces: marketplaceObjId,
        status: "closed",
      })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      let closedTrades = closedTradesRaw;

      console.log(`[Marketplace] Initial load: ${closedTrades.length} closed trades from MongoDB`);

      const emitScorecardFromRedis = async () => {
        try {
          const { trades: openTrades, total: totalOpen } =
            await getOpenTradesByMarketplace(marketplaceId, allAuthorIds);

          const allRecs = [...openTrades, ...closedTrades];
          allRecs.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          socket.emit("scorecard", {
            recommendations: allRecs,
            total: totalOpen + closedTrades.length,
          });
        } catch (err) {
          console.error("[Marketplace] Redis emit error:", err);
        }
      };

      await emitScorecardFromRedis();

      liveInterval = setInterval(emitScorecardFromRedis, 1500);

      unsubPubSub = onScorecardChange(async (event) => {
        const isRelevantByMarketplace =
          event.marketplaceIds?.includes(marketplaceId);
        const isRelevantByAuthor = authorSet.has(event.authorId);

        if (!isRelevantByMarketplace && !isRelevantByAuthor) return;

        if (
          event.type === "closed" ||
          event.type === "manual_exit" ||
          event.type === "deleted" ||
          event.type === "created"
        ) {
          const freshClosed = await ScoreCardModel.find({
            "authorData.id": { $in: allAuthorIds },
            shareWithMarketplaces: marketplaceObjId,
            status: "closed",
          })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

          closedTrades = freshClosed;
        }

        await emitScorecardFromRedis();
      });

      socket.on("disconnect", () => {
        console.log(`[Marketplace] Socket disconnected, marketplaceId=${marketplaceId}`);
        if (liveInterval) clearInterval(liveInterval);
        if (unsubPubSub) unsubPubSub();
      });
    } catch (error) {
      console.error("[Marketplace] Setup error:", error);
      if (liveInterval) clearInterval(liveInterval);
      if (unsubPubSub) unsubPubSub();
    }
  });
};

export const deleteTrade = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(400).json({
      success: false,
      message: "No Id Provided",
    });
  }

  try {
    const { id } = req.body;

    const deleteScorecard = await ScoreCardModel.findById(id);

    if (!deleteScorecard) {
      return res.status(404).json({
        success: false,
        message: "Trade not found",
      });
    }

    // Update service provider's recommendationStats BEFORE deleting
    const authorId = deleteScorecard.authorData?.id;
    if (authorId) {
      await ServiceProviderRegModel.findByIdAndUpdate(authorId, {
        $inc: {
          "stats.recommendationStats.total": -1,
          "stats.recommendationStats.close":
            deleteScorecard.status === "closed" ? -1 : 0,
          "stats.recommendationStats.open":
            deleteScorecard.status === "open" ? -1 : 0,
        },
      });

      // Recalculate returnRatio and returnPercentage
      const updatedProvider = await ServiceProviderRegModel.findById(authorId);
      const stats = updatedProvider?.stats?.recommendationStats;

      if (stats) {
        const closeTrades = stats.close || 0;
        const totalTrades = stats.total || 0;

        const returnRatio = totalTrades > 0 ? closeTrades / totalTrades : 0;
        const returnPercentage = returnRatio * 100;

        await ServiceProviderRegModel.findByIdAndUpdate(authorId, {
          $set: {
            "stats.recommendationStats.returnRatio": returnRatio,
            "stats.recommendationStats.returnPercentage": returnPercentage,
          },
        });
      }
    }

    // Send notifications logic (your existing code)
    if (
      deleteScorecard?.shareWith.includes("followers") ||
      deleteScorecard?.shareWith.includes("all")
    ) {
      const authorData = await ServiceProviderRegModel.findById(
        deleteScorecard.authorData?.id
      ).select("stats.Followers RegName");
      const followersArray = (authorData?.stats?.Followers || []).map(String);

      if (followersArray.length > 0) {
        await sendNotification({
          recipientIds: followersArray,
          recipientRole: "both",
          message: `${authorData?.RegName} deleted a recommendation`,
          type: "recommendation-closed",
          category: "sp",
          sentBy: {
            id: deleteScorecard.authorData?.id?.toString() || "system",
            name: deleteScorecard.authorData?.name || "Service Provider",
          },
          postLink: "/dashboard/user/recommendations",
          ctaLabel: "View Recommendations",
          sendToLabel: `Followers of ${authorData?.RegName}`,
        });
      }
    }

    if (
      deleteScorecard?.shareWith.includes("subscribers") &&
      deleteScorecard?.shareWithPlans.length > 0
    ) {
      const plans = await ServiceModel.find({
        _id: { $in: deleteScorecard?.shareWithPlans },
      });

      for (const plan of plans) {
        const subs = (plan.subscribedBy || []).map(String);
        if (subs.length === 0) continue;
        await sendNotification({
          recipientIds: subs,
          recipientRole: "both",
          message: `${deleteScorecard.authorData?.name} deleted a recommendation for plan ${plan.title}`,
          type: "recommendation-closed",
          category: "sp",
          sentBy: {
            id: id?.toString() || "system",
            name: deleteScorecard.authorData?.name || "Service Provider",
          },
          postLink: "/dashboard/user/recommendations",
          ctaLabel: "View Recommendations",
          sendToLabel: `Subscribers of ${plan.title}`,
        });
      }
    }

    // Delete the scorecard
    await ScoreCardModel.findByIdAndDelete(id);

    // Remove from Redis registry (if trade was open)
    if (deleteScorecard.status === "open") {
      await removeOpenTrade(id, deleteScorecard.exchange, deleteScorecard.token);
    }

    // Notify live socket handlers about the deletion
    await publishScorecardChange({
      type: "deleted",
      tradeId: id,
      authorId: deleteScorecard.authorData?.id || "",
      planIds: deleteScorecard.shareWithPlans || [],
      marketplaceIds: (deleteScorecard.shareWithMarketplaces || []).map((m: any) => m.toString()),
    });

    console.log("Deleted Scorecard with ID:", id);

    return res.status(200).json({
      success: true,
      message: "Trade deleted and stats updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete trade",
      error: error,
    });
  }
};

// export const changeScoreCardStatusSL = async (req: Request, res: Response) => {
//   const { data, exitDate } = req.body;

//   if (!data || !exitDate) {
//     return res
//       .status(400)
//       .json({ success: false, message: "No data provided" });
//   }

//   try {
//     const trade = await ScoreCardModel.updateMany(
//       { _id: { $in: data } },
//       [
//         {
//           $set: {
//             status: "closed",
//             result: "sl",
//             exitRate: "$stoploss",
//             exitDate,
//             pnl: {
//               $round: [
//                 {
//                   $subtract: [
//                     {
//                       $cond: {
//                         if: { $eq: ["$entryType", "buy"] },
//                         then: "$stoploss",
//                         else: "$entryPrice",
//                       },
//                     },
//                     {
//                       $cond: {
//                         if: { $eq: ["$entryType", "buy"] },
//                         then: "$entryPrice",
//                         else: "$stoploss",
//                       },
//                     },
//                   ],
//                 },
//                 2,
//               ],
//             },
//             pnlpercentage: {
//               $round: [
//                 {
//                   $multiply: [
//                     {
//                       $divide: [
//                         {
//                           $cond: {
//                             if: { $eq: ["$entryType", "buy"] },
//                             then: { $subtract: ["$stoploss", "$entryPrice"] },
//                             else: { $subtract: ["$entryPrice", "$stoploss"] },
//                           },
//                         },
//                         { $abs: "$entryPrice" },
//                       ],
//                     },
//                     100,
//                   ],
//                 },
//                 2,
//               ],
//             },
//           },
//         },
//         {
//           $set: {
//             pnl: {
//               $cond: {
//                 if: { $isArray: "$pnl" },
//                 then: { $sum: "$pnl" },
//                 else: "$pnl",
//               },
//             },
//             pnlpercentage: {
//               $cond: {
//                 if: { $isArray: "$pnlpercentage" },
//                 then: { $sum: "$pnlpercentage" },
//                 else: "$pnlpercentage",
//               },
//             },
//           },
//         },
//       ],
//       { new: true }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "status updated",
//       data: trade,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to update status",
//       error: error,
//     });
//   }
// };

// API to fetch the latest three scorecards
export const getLatestScorecards = async (req: Request, res: Response) => {
  try {
    const latestScorecards = await ScoreCardModel.find()
      .sort({ createdAt: -1 }) // Sort by creation time (newest first)
      .limit(3); // Limit to 3 scorecards

    return res.status(200).json({
      success: true,
      data: latestScorecards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch scorecards",
      error: error,
    });
  }
};

export const fetchRealTimeOpenScorecardsForToday = async (socket: Socket) => {
  // socket.on("forhomepage", async ({ page }) => {
  try {
    // Get the start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // console.log("Start of today:", startOfToday);
    // console.log("End of today:", endOfToday);

    // Fetch scorecards created today with status 'open'
    const openTodayScorecards = await ScoreCardModel.find({
      $or: [
        {
          shareWith: "all",
        },
      ],
      createdAt: { $gte: startOfToday, $lte: endOfToday },
      status: "open",
    })
      .limit(10)
      .sort({ createdAt: -1 });

    // Emit initial data
    socket.emit("todayScorecards", { openTodayScorecards });
    // console.log("Initial open trades:", openTodayScorecards);

    // Set up a change stream to listen for updates
    const changeStream = ScoreCardModel.watch(
      [
        {
          $match: {
            operationType: { $in: ["insert", "update", "replace"] },
            "fullDocument.status": "open",
            "fullDocument.createdAt": { $gte: startOfToday, $lte: endOfToday },
          },
        },
      ],
      { fullDocument: "updateLookup" }
    );

    // Handle real-time updates
    changeStream.on("change", async () => {
      const openTodayScorecards = await ScoreCardModel.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        status: "open",
      })
        // .skip(page * 10)
        .limit(10)
        .sort({ createdAt: -1 });

      socket.emit("todayScorecards", {
        openTodayScorecards,
      });
    });

    // Handle errors in the change stream
    changeStream.on("error", (error: any) => {
      console.error("Change stream error:", error);
    });

    // Clean up when the socket disconnects
    socket.on("disconnect", () => {
      changeStream.close();
    });
  } catch (error) {
    console.error(error);
  }
};
// );
// };

/**
 * Send WhatsApp messages to all subscribers of a plan
 * This function queues WhatsApp messages for each subscriber with their phone number
 * @param subscriberIds - Array of subscriber user IDs
 * @param scorecard - The scorecard data to send
 * @param planId - The plan ID the scorecard is shared with
 * @param authorId - The service provider ID who created the scorecard
 * @param templateName - The template name to use
 * @param headerText - The header text to use
 * @param message - The message to send
 */
async function sendWhatsappMessagesToSubscribers(
  subscriberIds: string[],
  scorecard: any,
  planId: string,
  authorId: string,
  templateName: "new_recommendation" | "trade_change",
  headerText?: string,
  message?: string
): Promise<void> {
  try {
    console.log(
      `Preparing WhatsApp messages for ${subscriberIds.length} subscribers`
    );

    // Check if the service provider has WhatsApp connected
    const serviceProvider = await ServiceProviderRegModel.findById(authorId);
    if (!serviceProvider?.metadata?.whatsapp?.isConnected) {
      console.log(
        `WhatsApp not connected for service provider ${authorId}, skipping WhatsApp notifications`
      );
      return;
    }

    // Get all subscriber details with phone numbers
    const subscribers = await UserModel.find({
      _id: { $in: subscriberIds },
      number: { $exists: true, $ne: null },
    }).select("_id name email number");

    console.log("Subscribers", subscribers);

    if (subscribers.length === 0) {
      console.log("No subscribers found with valid phone numbers");
      return;
    }

    // Use WhatsApp template for new recommendations
    const templateParams = formatScorecardForWhatsappTemplate(
      scorecard,
      templateName,
      headerText,
      message
    );

    console.log("WhatsApp template params:", templateParams);

    // Prepare WhatsApp jobs for all subscribers using template
    const whatsappJobs: WhatsappMessageJob[] = subscribers.map(
      (subscriber) => ({
        phoneNumber: subscriber.number.toString(), // Convert to string and ensure country code
        name: subscriber.name,
        message: "", // Not used for template messages
        templateName: templateName,
        templateParams: templateParams,
        subscriberId: subscriber._id.toString(),
        planId: planId,
        scorecardId: scorecard._id.toString(),
        authorId: authorId,
        priority: 1, // Higher priority for new recommendations
      })
    );

    // Add jobs to the WhatsApp queue in bulk for better performance
    await addBulkWhatsappMessagesToQueue(whatsappJobs);

    console.log(
      `✅ Queued ${whatsappJobs.length} WhatsApp messages for scorecard ${scorecard._id}`
    );
  } catch (error) {
    console.error("Error sending WhatsApp messages to subscribers:", error);
    // Don't throw error to prevent scorecard creation from failing
    // WhatsApp messaging failure shouldn't block the main business logic
  }
}

import { generateRationalPDF } from "../utils/generateRationalPDF";
import { uploadFileToS3FromBuffer } from "../utils/s3Upload";
import axios from "axios";
import { mailQueue } from "../queues/MailQueues"; // Assuming you have this
import { TradeboxPlansModel, OrderModel } from "../models/TransactionModels";
import mongoose from "mongoose";
import { resolveEntryPrice } from "../utils/resolveEntryPrice";
import formatValidityForTelegram from "../helpers/formatValidityForTelegram";
import buildModifyTelegramMessage from "../helpers/buildModifyTelegramMessage";
import { ScoreCardTypes } from "../types";

export const createRationalPDF = async (req: Request, res: Response) => {
  try {
    console.log("=== Creating Rational PDF ===");

    // Check if body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
    }

    const {
      rationalText,
      tradeId,
      scriptname,
      exchange,
      entryType,
      entryPrice,
      target,
      targets,
      stoploss,
      validity,
      riskRewardRatio,
      lotsize,
      raName,
      raRegistration,
      imageBase64,
    } = req.body;

    // Validate required fields
    if (!rationalText || !tradeId || !scriptname) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (rationalText, tradeId, scriptname)",
      });
    }

    if (rationalText.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Rational analysis must be at least 10 characters",
      });
    }

    // Get the trade from database
    const trade = await ScoreCardModel.findById(tradeId);
    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found",
      });
    }

    // Get RA details with full profile
    let finalRaName = raName;
    let finalRaRegistration = raRegistration;
    let raDetails = null;
    let raSignature = null;

    // Fetch complete RA details including signature
    if (trade.authorData?.id) {
      raDetails = await ServiceProviderRegModel.findById(
        trade.authorData.id
      ).lean();

      if (raDetails) {
        finalRaName = finalRaName || raDetails.RegName || raDetails.name;
        finalRaRegistration = finalRaRegistration || raDetails.regNumber;

        // Check if RA has signature uploaded
        if (raDetails.signature) {
          try {
            console.log("Fetching RA signature from:", raDetails.signature);
            // Download signature from S3 URL
            const signatureResponse = await axios.get(raDetails.signature, {
              responseType: "arraybuffer",
            });
            // Convert to base64 for PDF generation
            raSignature = Buffer.from(signatureResponse.data).toString(
              "base64"
            );
            console.log("RA signature loaded successfully");
          } catch (signatureError) {
            console.error("Error loading RA signature:", signatureError);
            // If signature can't be loaded, return error
            return res.status(400).json({
              success: false,
              message:
                "Unable to load RA signature. Please re-upload your signature in profile settings.",
              requireSignatureUpload: true,
              raId: trade.authorData.id,
            });
          }
        } else {
          console.log("No RA signature found in profile");
          return res.status(400).json({
            success: false,
            message:
              "Research Analyst signature is required. Please upload your signature in the profile section before generating PDFs.",
            requireSignatureUpload: true,
            raId: trade.authorData.id,
          });
        }

        // Keep only necessary fields for PDF
        raDetails = {
          RegName: raDetails.RegName,
          name: raDetails.name,
          companyName: raDetails.companyName,
          email: raDetails.email,
          number: raDetails.number,
          address1: raDetails.address1,
          address2: raDetails.address2,
          city: raDetails.city,
          state: raDetails.state,
          website: raDetails.website,
          profileUrl: raDetails.profileUrl,
          disclaimer: raDetails.disclaimer,
          AboutMe: raDetails.AboutMe,
          complianceOfficerName: raDetails.complianceOfficerName,
          complianceOfficerEmail: raDetails.complianceOfficerEmail,
          complianceOfficerNumber: raDetails.complianceOfficerNumber,
          regNumber: raDetails.regNumber,
        };
      } else {
        return res.status(404).json({
          success: false,
          message: "Research Analyst details not found",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Trade author information missing",
      });
    }

    // Process base64 image if provided
    let imageBuffer: Buffer | undefined;
    if (imageBase64) {
      try {
        console.log("Processing base64 image...");
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
        console.log(
          "Image processed successfully, size:",
          imageBuffer.length,
          "bytes"
        );
      } catch (imageError) {
        console.error("Error processing base64 image:", imageError);
      }
    }

    // Generate PDF with enhanced options and signature
    console.log("Generating enhanced PDF with RA signature...");
    const pdfBuffer = (await generateRationalPDF(
      {
        scorecard: trade.toObject(),
        rationalText,
        raName: finalRaName || "N/A",
        raRegistration: finalRaRegistration || "N/A",
        raDetails: raDetails, // Pass RA details
        raSignature: raSignature, // Pass RA signature
        imageBuffer,
        scriptname: scriptname || trade.scriptname,
        exchange: exchange || trade.exchange,
        entryType: entryType || trade.entryType,
        entryPrice: entryPrice || trade.entryPrice,
        target: target || trade.target,
        targets: targets || trade.targets,
        stoploss: stoploss || trade.stoploss,
        validity: validity || trade.validity,
        riskRewardRatio: riskRewardRatio || trade.riskRewardRatio,
        lotsize: lotsize || trade.lotsize,
      },
      true // return as buffer
    )) as Buffer;

    // Create S3 key
    const timestamp = Date.now();
    const safeScriptName = scriptname
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "");
    const s3Key = `rational-reports/${tradeId}/${safeScriptName}-${timestamp}.pdf`;

    console.log("Uploading PDF to S3 with key:", s3Key);

    // Upload to S3
    const s3Url = await uploadFileToS3FromBuffer(pdfBuffer, s3Key);

    console.log("PDF uploaded to S3:", s3Url);

    // Update the trade in database
    const updatedTrade = await ScoreCardModel.findByIdAndUpdate(
      tradeId,
      {
        rationalText: rationalText,
        rationalPDF: s3Url,
        rationalGeneratedAt: new Date(),
      },
      { new: true }
    );

    console.log("Database updated for trade:", tradeId);

    // ========== EMAIL SENDING LOGIC ==========
    console.log("Sending emails to subscribers...");
    await sendEmailsToSubscribers(
      trade,
      s3Url,
      finalRaName,
      scriptname,
      rationalText
    );
    console.log("Email sending process initiated");

    // Convert to base64 for immediate download
    const base64Pdf = pdfBuffer.toString("base64");
    const filename = `rational-${safeScriptName}-${timestamp}.pdf`;

    return res.status(200).json({
      success: true,
      message:
        "Rational PDF generated, uploaded, and emails sent to subscribers",
      data: {
        pdfUrl: s3Url,
        filename,
        tradeId: updatedTrade?._id,
        scriptname,
        rationalGeneratedAt: updatedTrade?.rationalGeneratedAt,
        imageEmbedded: !!imageBuffer,
        raName: finalRaName,
        raRegistration: finalRaRegistration,
        signatureUsed: true,
        emailsSent: true,
      },
    });
  } catch (error) {
    console.error("Error in createRationalPDF:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate rational PDF",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
// ========== EMAIL SENDING FUNCTION ==========
async function sendEmailsToSubscribers(
  trade: any,
  pdfUrl: string,
  raName: string,
  scriptname: string,
  rationalText: string
) {
  try {
    console.log("Getting subscribers for trade...");

    // Get the plan IDs from the trade
    const planIds = trade.shareWithPlans || [];

    if (planIds.length === 0) {
      console.log("No plans associated with this trade");
      return;
    }

    console.log(`Trade is shared with ${planIds.length} plan(s):`, planIds);

    // Get all subscribed users for these plans
    const subscribedUserIds: string[] = [];

    for (const planId of planIds) {
      try {
        const plan = await ServiceModel.findById(planId);
        if (plan && plan.subscribedBy && Array.isArray(plan.subscribedBy)) {
          subscribedUserIds.push(...plan.subscribedBy);
        }
      } catch (planError) {
        console.error(`Error fetching plan ${planId}:`, planError);
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(subscribedUserIds)];

    if (uniqueUserIds.length === 0) {
      console.log("No subscribers found for the associated plans");
      return;
    }

    console.log(`Found ${uniqueUserIds.length} unique subscribers`);

    // Get user emails
    const users = await UserModel.find({
      _id: { $in: uniqueUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).select("email name");

    const subscribers = users.filter((user) => user.email);

    if (subscribers.length === 0) {
      console.log("No valid subscriber emails found");
      return;
    }

    console.log(`Sending emails to ${subscribers.length} subscribers`);

    // Prepare email content
    const currentDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const emailSubject = `📈 Rational Analysis: ${scriptname} - ${currentDate}`;

    // Create HTML email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rational Analysis - ${scriptname}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f7fa;
            margin: 0;
            padding: 0;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        
        .content {
            padding: 30px;
        }
        
        .trade-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            border-left: 4px solid #667eea;
        }
        
        .trade-info h3 {
            color: #2d3748;
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .info-label {
            font-weight: 600;
            color: #4a5568;
            display: block;
            font-size: 13px;
        }
        
        .info-value {
            color: #2d3748;
            font-size: 15px;
        }
        
        .rational-preview {
            background: #fff8e1;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid #ffe082;
        }
        
        .rational-preview h3 {
            color: #e65100;
            margin-top: 0;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .preview-text {
            color: #5d4037;
            line-height: 1.7;
            max-height: 120px;
            overflow: hidden;
            position: relative;
        }
        
        .preview-text:after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: linear-gradient(to bottom, transparent, #fff8e1);
        }
        
        .cta-button {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            text-decoration: none;
            padding: 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 25px 0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.2);
        }
        
        .analyst-info {
            background: #e8f5e9;
            border-radius: 8px;
            padding: 20px;
            margin-top: 25px;
            border: 1px solid #c8e6c9;
        }
        
        .analyst-info h3 {
            color: #2e7d32;
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .disclaimer {
            margin-top: 25px;
            padding: 20px;
            background: #fff3e0;
            border-radius: 8px;
            border: 1px solid #ffcc80;
            font-size: 12px;
            color: #5d4037;
        }
        
        .disclaimer strong {
            color: #e65100;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #dee2e6;
        }
        
        @media (max-width: 480px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📈 Rational Analysis Report</h1>
            <p>${scriptname} | ${currentDate}</p>
        </div>
        
        <div class="content">
            <div class="trade-info">
                <h3>📊 Trade Details</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Script</span>
                        <span class="info-value"><strong>${scriptname}</strong></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Exchange</span>
                        <span class="info-value">${
                          trade.exchange || "N/A"
                        }</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Entry Price</span>
                        <span class="info-value">₹${
                          trade.entryPrice || trade.rate || "N/A"
                        }</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Target</span>
                        <span class="info-value">₹${
                          trade.target || "N/A"
                        }</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Stop Loss</span>
                        <span class="info-value">₹${
                          trade.stoploss || "N/A"
                        }</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Entry Type</span>
                        <span class="info-value" style="color: ${
                          trade.entryType === "buy" ? "#10b981" : "#ef4444"
                        }; font-weight: bold;">
                            ${(trade.entryType || "").toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="rational-preview">
                <h3>🔍 Analysis Preview</h3>
                <div class="preview-text">
                    ${rationalText.substring(0, 300)}${
      rationalText.length > 300 ? "..." : ""
    }
                </div>
            </div>
            
            <a href="${pdfUrl}" class="cta-button" target="_blank">
                📥 Download Complete Rational PDF Report
            </a>
            
            <div class="analyst-info">
                <h3>👨‍💼 Research Analyst</h3>
                <p><strong>${raName || "N/A"}</strong></p>
               
            </div>
            
            <div class="disclaimer">
                <strong>📋 Important Disclaimer:</strong><br>
                This document is prepared by a SEBI Registered Research Analyst for informational purposes only. 
                The information contained herein should not be construed as financial advice, investment recommendation, 
                or an offer to buy or sell any securities. Past performance is not indicative of future results. 
                Investments in securities market are subject to market risks.
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent to you as a subscriber of ${
              raName || "the Research Analyst"
            }'s service.</p>
            <p>© ${new Date().getFullYear()} TradeBox Fintech Solutions. All rights reserved.</p>
            <p>If you no longer wish to receive these emails, please unsubscribe from the service.</p>
        </div>
    </div>
</body>
</html>
    `;

    // Send email to each subscriber via BullMQ queue
    for (const subscriber of subscribers) {
      const mailOptions = {
        from: process.env.EMAIL,
        to: subscriber.email,
        subject: emailSubject,
        html: emailHtml,
        // Optional: Attach PDF directly
        // attachments: [
        //   {
        //     filename: `rational-${scriptname}-${currentDate}.pdf`,
        //     path: pdfUrl, // S3 URL
        //   }
        // ]
      };

      // Add to mail queue
      await mailQueue.add(
        subscriber.email,
        { mailOptions },
        {
          removeOnComplete: true,
          removeOnFail: true,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }
      );

      console.log(`✅ Queued email for: ${subscriber.email}`);
    }

    console.log(
      `🎉 Successfully queued ${subscribers.length} emails for delivery`
    );
  } catch (error) {
    console.error("❌ Error sending emails to subscribers:", error);
    // Don't throw error, just log it so PDF generation still succeeds
  }
}

export const downloadRationalPDF = async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;

    if (!tradeId) {
      return res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
    }

    const trade = await ScoreCardModel.findById(tradeId);

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found",
      });
    }

    if (!trade.rationalPDF) {
      return res.status(404).json({
        success: false,
        message: "Rational PDF not generated for this trade",
      });
    }

    // Fetch the PDF from S3
    const response = await axios.get(trade.rationalPDF, {
      responseType: "arraybuffer",
    });

    const pdfBuffer = Buffer.from(response.data);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rational-${trade.scriptname}.pdf"`
    );

    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error downloading rational PDF:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download rational PDF",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// export const downloadRationalPDF = async (req: Request, res: Response) => {
//   try {
//     const { tradeId } = req.params;

//     if (!tradeId) {
//       return res.status(400).json({
//         success: false,
//         message: "Trade ID is required",
//       });
//     }

//     // Get trade with rational PDF
//     const trade = await ScoreCardModel.findById(tradeId);

//     if (!trade) {
//       return res.status(404).json({
//         success: false,
//         message: "Trade not found",
//       });
//     }

//     if (!trade.rationalPDF) {
//       return res.status(404).json({
//         success: false,
//         message: "Rational PDF not found for this trade",
//       });
//     }

//     // Return the PDF URL for download
//     return res.status(200).json({
//       success: true,
//       message: "Rational PDF found",
//       data: {
//         pdfUrl: trade.rationalPDF,
//         filename: `rational-${trade.scriptname}-${trade._id}.pdf`,
//         generatedAt: trade.rationalGeneratedAt,
//       },
//     });

//   } catch (error) {
//     console.error("Error downloading rational PDF:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to download rational PDF",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
