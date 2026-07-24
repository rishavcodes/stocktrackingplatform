"use client";

import { TrendingUp, TrendingDown, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Recommendation } from "./types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { buildProductUrl } from "@/lib/customDomain";

export function RunningLightBorderWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 1) % 100);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative p-[1px] rounded-lg overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg,
            transparent 0%,
            transparent ${position}%,
            white ${position}%,
            white ${position + 10}%,
            transparent ${position + 10}%,
            transparent 100%)`,
          mixBlendMode: "overlay",
        }}
      />
      <div className="absolute inset-[1px] bg-white rounded-lg z-0" />
      <div className="relative z-10 bg-white rounded-lg h-full">{children}</div>
    </div>
  );
}

function PotentialRing({ percent, isBuy, size = 52, stroke = 5 }: { percent: number; isBuy: boolean; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(-100, Math.min(100, percent));
  const absPct = Math.abs(clamped);
  const offset = circumference - (circumference * absPct) / 100;
  const isPositive = clamped >= 0;
  const color = isPositive
    ? (isBuy ? "stroke-emerald-500" : "stroke-red-500")
    : "stroke-red-500";

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={stroke} strokeLinecap="round"
        className={`${color} transition-all duration-500`}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function RecommendationCardMini({
  recommendation,
  index,
  onBuySellClick,
  subscribedServiceIds,
  marketplaceSlug,
  planNamesById,
}: {
  recommendation: Recommendation;
  index: number;
  onBuySellClick?: (recommendation: Recommendation) => void;
  subscribedServiceIds?: Set<string>;
  marketplaceSlug?: string;
  /** id → plan title lookup so the card can display the real plan name. */
  planNamesById?: Map<string, string>;
}) {
  const isBuy = recommendation.entryType?.toLowerCase() === "buy";
  const ltp = Number(recommendation.ltp) || Number(recommendation.entryPrice) || 0;
  const entry = Number(recommendation.entryPrice) || 0;
  const target = Number(recommendation.target) || 0;
  const sl = Number(recommendation.stoploss) || 0;
  const pnl = Number(recommendation.pnl) || 0;
  const pnlPct = Number(recommendation.pnlpercentage) || 0;
  const scriptName = recommendation.scriptname || "N/A";
  const authorName = recommendation.authorData?.name || "Unknown Analyst";
  const authorType = recommendation.authorData?.type || "Research Analyst";
  const authorInitials = authorName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);

  const totalPotential = isBuy ? target - entry : entry - target;
  const potentialLeft = isBuy
    ? (ltp > entry ? target - ltp : target - entry)
    : (ltp < entry ? ltp - target : entry - target);
  const potentialLeftPct = totalPotential > 0
    ? Math.max(0, Math.min(100, (potentialLeft / totalPotential) * 100))
    : 0;
  const ringPct = potentialLeftPct;

  const createdDate = new Date(recommendation.createdAt);
  const dateStr = `${createdDate.getDate()} ${createdDate.toLocaleString("en-IN", { month: "short" })} ${String(createdDate.getFullYear()).slice(-2)}, ${createdDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

  // Exit timestamp — populated by the backend on close (manualTradeExit /
  // GlobalTradeTracker / updateScoreCard cron). Only render for closed trades.
  const rawExit = (recommendation as any).exitDate;
  const exitDate = rawExit ? new Date(rawExit) : null;
  const exitStr =
    exitDate && !Number.isNaN(exitDate.getTime())
      ? `${exitDate.getDate()} ${exitDate.toLocaleString("en-IN", { month: "short" })} ${String(exitDate.getFullYear()).slice(-2)}, ${exitDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
      : null;

  const hasPlans = recommendation.shareWithPlans && recommendation.shareWithPlans.length > 0;
  const isSubscribed = hasPlans && recommendation.shareWithPlans!.some(
    (planId: string) => subscribedServiceIds?.has(planId)
  );
  const isPaid = hasPlans && !isSubscribed;
  const planId = isPaid ? recommendation.shareWithPlans![0] : null;

  // Resolve plan names from the id→title lookup. We render up to 2 titles and
  // collapse the rest into "+N more" so the chip row stays compact.
  const planTitles = hasPlans && planNamesById
    ? (recommendation.shareWithPlans as string[])
        .map((pid) => planNamesById.get(String(pid)))
        .filter((t): t is string => !!t)
    : [];

  // Closed trades hide the potential ring + Trade Now CTA — there's nothing
  // left to trade and "potential left" is meaningless once exited.
  const isClosed = (recommendation.status || "").toLowerCase() === "closed";

  // Close-reason badge — derived from the `result` field the backend writes
  // when GlobalTradeTracker / updateScoreCard / manualTradeExit close a trade
  // (tp / sl / timeout / manual). Falls back to a generic "Closed" pill when
  // result is missing (legacy docs).
  // `message` is a longer-form natural-language outcome (e.g. "Profit booked
  // at target") rendered as a banner below the price levels. `label` stays
  // the short version used in the bottom-right pill.
  const closeReason = (() => {
    if (!isClosed) return null;
    const r = (recommendation.result || "").toLowerCase();
    if (r === "tp" || r === "target")
      return {
        label: "Target Hit",
        message: "✅ Profit booked — target hit",
        cls: "bg-emerald-100 text-emerald-700",
        bannerCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if (r === "sl" || r === "stoploss")
      return {
        label: "SL Hit",
        message: "🛑 SL triggered — exited at stop loss",
        cls: "bg-red-100 text-red-700",
        bannerCls: "bg-red-50 text-red-700 border-red-200",
      };
    if (r === "timeout" || r === "expired")
      return {
        label: "Validity Expired",
        message: "⌛ Validity expired — closed at market",
        cls: "bg-amber-100 text-amber-700",
        bannerCls: "bg-amber-50 text-amber-700 border-amber-200",
      };
    if (r === "manual")
      return {
        label: "Manual Exit",
        message: "✋ Closed manually by the RA",
        cls: "bg-slate-100 text-slate-700",
        bannerCls: "bg-slate-50 text-slate-700 border-slate-200",
      };
    return {
      label: "Closed",
      message: "Trade closed",
      cls: "bg-slate-100 text-slate-600",
      bannerCls: "bg-slate-50 text-slate-600 border-slate-200",
    };
  })();

  const exchange = (recommendation.exchange || "NSE").toUpperCase();

  return (
      <div className="bg-white rounded-2xl p-5 hover:shadow-xl transition-all duration-300 border border-slate-200 h-full flex flex-col">

        {/* Header: Script + Badges | CMP + PnL */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Direction chip — shown BEFORE the script name so the trade
                  intent reads left-to-right as "BUY NSE TCS" instead of
                  "TCS BUY NSE". Kept on closed trades too so the card still
                  reads which side the trade was taken on. */}
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                isBuy ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}>
                {recommendation.entryType}
              </span>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-700 text-white">
                {exchange}
              </span>
              <h3 className={`text-sm font-bold text-slate-900 truncate ${isPaid ? "blur-[6px] select-none" : ""}`}>{scriptName}</h3>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {dateStr}
              <span className="mx-1.5 text-slate-300">&bull;</span>
              <span className="text-slate-500 font-medium">{(() => {
                // Legacy recs (created before holdingPeriod was wired up) and
                // any rec where the field arrived as boolean / capitalised
                // string would otherwise silently fall through to "Positional".
                // Normalise case-insensitively, and fall back to deriving from
                // validity-vs-createdAt (same-day = intraday) for missing data.
                const hp = String(recommendation.holdingPeriod ?? "").toLowerCase();
                if (hp === "intraday") return "Intraday";
                if (hp === "forward" || hp === "positional") return "Positional";
                const v = recommendation.validity ? new Date(recommendation.validity) : null;
                const c = recommendation.createdAt ? new Date(recommendation.createdAt) : null;
                if (v && c && !isNaN(v.getTime()) && !isNaN(c.getTime())) {
                  return v.toDateString() === c.toDateString() ? "Intraday" : "Positional";
                }
                return "Positional";
              })()}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-base font-bold text-slate-900 leading-tight">{ltp.toFixed(2)}</div>
            <div className={`text-xs font-semibold mt-0.5 ${isPaid ? "blur-[6px] select-none" : ""} ${pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              <span className="text-slate-400 font-medium mr-1">P&amp;L:</span>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Middle: Entry/Target/SL grid (left) + Potential ring (right) */}
        <div className="flex items-center gap-4 mb-4">
          {/* Left: Price levels — only values blurred for paid, labels stay visible */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Entry</div>
                <div className={`text-xs font-semibold text-slate-800 bg-slate-50 rounded-lg py-1.5 px-2 ${isPaid ? "blur-[6px] select-none" : ""}`}>{entry.toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider mb-1">Target</div>
                <div className={`text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-1.5 px-2 ${isPaid ? "blur-[6px] select-none" : ""}`}>{target.toFixed(0)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-1">Stoploss</div>
                <div className={`text-xs font-semibold text-red-700 bg-red-50 rounded-lg py-1.5 px-2 ${isPaid ? "blur-[6px] select-none" : ""}`}>{sl.toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* Right: Potential ring — hidden once the trade is closed. */}
          {!isClosed && (
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <div className="relative">
                <PotentialRing percent={ringPct} isBuy={isBuy} size={80} stroke={7} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-base font-extrabold leading-none ${ringPct >= 50 ? "text-emerald-600" : "text-red-600"}`}>
                    {Math.round(potentialLeftPct)}%
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 uppercase mt-0.5">Potential Left</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plan-name chip row — surfaces which plan(s) this rec was shared
            with so subscribers know where it came from. Skipped when we
            can't resolve any titles (no plans, or no lookup table passed). */}
        {planTitles.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3 -mt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Plan
            </span>
            {planTitles.slice(0, 2).map((title) => (
              <span
                key={title}
                className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium"
              >
                {title}
              </span>
            ))}
            {planTitles.length > 2 && (
              <span className="text-[11px] text-slate-500">
                +{planTitles.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Bottom: Author + Trade Now / Unlock */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 mt-auto">
          {(() => {
            const authorId = recommendation.authorData?.id;
            const authorHref = marketplaceSlug && authorId
              ? `/marketplace/${marketplaceSlug}/experts/${authorId}`
              : null;

            const authorBlock = (
              <>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                  {recommendation.authorData?.authorImage ? (
                    <img src={recommendation.authorData.authorImage} alt={authorName} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-slate-600 font-semibold text-xs">{authorInitials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm font-bold text-slate-900 truncate leading-tight flex items-center gap-1 ${authorHref ? "group-hover/author:text-blue-600 transition-colors" : ""}`}>
                    {authorName}
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isBuy ? "bg-emerald-400" : "bg-red-400"}`} />
                    {authorType}
                  </div>
                </div>
              </>
            );

            return authorHref ? (
              <Link href={authorHref} className="group/author flex items-center gap-2.5 min-w-0 cursor-pointer">
                {authorBlock}
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                {authorBlock}
              </div>
            );
          })()}

          {isPaid && planId ? (
            <Link
              href={buildProductUrl("services", planId, recommendation.authorData, { marketplace: marketplaceSlug })}
              className="h-10 px-5 text-sm font-bold rounded-xl transition-all duration-200 active:scale-95 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Unlock
            </Link>
          ) : isClosed && closeReason ? (
            // Closed trades — surface the close reason (Target Hit / SL Hit
            // / Validity Expired / Manual Exit) instead of an actionable
            // "Trade Now" button. Same colour token as the header chip.
            // The exit time sits directly below the reason pill so the
            // customer sees *how* and *when* the trade closed together.
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center uppercase tracking-wider ${closeReason.cls}`}
              >
                {closeReason.label}
              </span>
              {exitStr && (
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                  {exitStr}
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={() => onBuySellClick?.(recommendation)}
              className={`h-10 px-6 text-sm font-bold rounded-xl transition-all duration-200 active:scale-95 flex-shrink-0 ${
                isBuy
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
              }`}
            >
              Trade Now
            </button>
          )}
        </div>
      </div>
  );
}
