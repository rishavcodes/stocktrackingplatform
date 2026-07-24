"use client";

import { RecommendationColumns } from "@/components";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScoreCardTypes } from "@/lib/types";
import { getMcxPnlMultiplier } from "@/lib/mcxLotMultipliers";

import { Socket, io } from "socket.io-client";

export enum ScoreCardTypesEnum {
  ServiceProviderDashboard = "serviceproviderdashboard",
  ForSubscribed = "forsubscribed",
}

export enum ScoreCardTypesHomepageEnum {
  forHomePage = "forhomepage",
}

// Normalize a raw scorecard from the socket payload into the shape the table
// components consume. Same shape that the original handler produced, plus a
// set of `_`-prefixed derived fields stamped here once per emit so the row
// renderer + sort comparator can read them straight through. Without these
// the table re-derives them ~4× per row per render (and the comparator does
// it O(N log N) times each 1.5s tick).
function shapeTrade(item: any): ScoreCardTypes {
  const mcxMultiplier = getMcxPnlMultiplier(item.exchange, item.scriptname);
  const lotsize =
    item.lotsize === "" || item.lotsize == null
      ? 1
      : Number(item.lotsize) || 1;
  const effectiveQty = lotsize * mcxMultiplier;
  const entryPrice = Number(item.entryPrice) || Number(item.rate) || 0;

  // Numeric pnl/pct based on current ltp (open) or exitRate (closed).
  // Display-side helpers decide whether to show "Market Closed" / "NOT
  // initiated" — we always stamp the numeric truth and let them decide.
  let pnlAbs: number | null = null;
  if (item.status === "closed" && item.exitRate && item.entryPrice) {
    const exitRate = Number(item.exitRate) || 0;
    if (item.entryType === "buy") pnlAbs = (exitRate - entryPrice) * effectiveQty;
    else if (item.entryType === "sell") pnlAbs = (entryPrice - exitRate) * effectiveQty;
  } else if (item.status === "open") {
    const currentPrice = Number(item.ltp) || 0;
    if (currentPrice > 0) {
      if (item.entryType === "buy")
        pnlAbs = (currentPrice - entryPrice) * effectiveQty;
      else if (item.entryType === "sell")
        pnlAbs = (entryPrice - currentPrice) * effectiveQty;
    }
  }

  let pnlPctAbs: number | null = null;
  if (pnlAbs !== null && entryPrice > 0 && effectiveQty > 0) {
    const totalInvestment = entryPrice * effectiveQty;
    if (totalInvestment > 0) pnlPctAbs = (pnlAbs / totalInvestment) * 100;
  }

  // Holding period in days, computed once. Used by sort + display.
  let holdingMs = 0;
  if (item.holdingPeriod !== "intraday" && item.exitDate && item.createdAt) {
    holdingMs =
      Date.parse(item.exitDate) - Date.parse(item.createdAt.toString());
  }

  return {
    ...item,
    validity: item.validity ? item.validity.split(",")[0] : "",
    rateRange: item.rate
      ? String(item.rate)
      : `${item.lowerRange} - ${item.upperRange}`,
    pnl: item.istriggered === "triggered" ? Number(item.pnl) : 0,
    pnlpercentage:
      item.istriggered === "triggered"
        ? item.pnlpercentage
          ? Number(item.pnlpercentage).toFixed(2) + "%"
          : "0%"
        : "-",

    holdingPeriod:
      item.holdingPeriod === "intraday"
        ? "Intraday"
        : `${Math.floor(holdingMs / 86400000)} Days`,

    SharedBy: item.authorData?.name,
    shareWith: item.shareWith,
    shareWithPlans: item.shareWithPlans,

    istriggered:
      item.istriggered === "triggered" ? "triggered" : "not triggered",

    // Pre-computed per-row scratch — consumers read these instead of
    // recomputing on every render / sort comparison. The leading `_` marks
    // them as internal; safe to ignore for any consumer that doesn't need
    // them.
    _mcxMultiplier: mcxMultiplier,
    _lotsize: lotsize,
    _effectiveQty: effectiveQty,
    _entryPriceNum: entryPrice,
    _pnlAbs: pnlAbs,
    _pnlPctAbs: pnlPctAbs,
    _isProfit: pnlAbs !== null ? pnlAbs >= 0 : null,
    _holdingMs: holdingMs,
  } as ScoreCardTypes;
}

function dedupeById<T extends { _id?: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const id = item._id;
    if (!id) {
      out.push(item);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/**
 * Cheap row-equality check used to short-circuit setState when an incoming
 * scorecard emit changed nothing the UI cares about. Backend re-emits the
 * open tab every 1.5s regardless; without this every tick triggers a full
 * re-render of every visible row. Compares only the fields the table reads.
 */
function sameRows(a: ScoreCardTypes[], b: ScoreCardTypes[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as any;
    const y = b[i] as any;
    if (
      x._id !== y._id ||
      x.ltp !== y.ltp ||
      x.pnl !== y.pnl ||
      x.pnlpercentage !== y.pnlpercentage ||
      x.status !== y.status ||
      x.istriggered !== y.istriggered ||
      x.exitRate !== y.exitRate ||
      x.updatedAt !== y.updatedAt ||
      // User-modifiable fields. Without these, a modify made while the market is
      // closed (no ltp/pnl tick, and the Redis cache doesn't refresh updatedAt)
      // is treated as "nothing changed" and the stale row stays on screen.
      // Primitives are stable across the 1.5s ticks; targets is serialized so an
      // unchanged array (new reference each emit) doesn't force a re-render.
      x.target !== y.target ||
      x.stoploss !== y.stoploss ||
      x.validity !== y.validity ||
      x.entryPrice !== y.entryPrice ||
      JSON.stringify(x.targets) !== JSON.stringify(y.targets)
    ) {
      return false;
    }
  }
  return true;
}

export default function useScoreCardData(
  id: string,
  role: string,
  type: ScoreCardTypesEnum
) {
  // Page-0 of open trades comes from live socket polling. Subsequent pages are
  // appended via loadMoreOpen() and kept on the side until the next page-0
  // emit, when the appended pages are preserved by the dedupeById merge.
  const [openTrades, setOpenTrades] = useState<ScoreCardTypes[]>([]);
  const [closedTrades, setClosedTrades] = useState<ScoreCardTypes[]>([]);
  const [totalOpenTrades, setTotalOpenTrades] = useState<number>(0);
  const [totalClosedTrades, setTotalClosedTrades] = useState<number>(0);
  const [openLoading, setOpenLoading] = useState<boolean>(false);
  const [closedLoading, setClosedLoading] = useState<boolean>(false);
  // True until the first `scorecard` emit lands. Lets the page show a
  // skeleton while the socket handshake + initial backend query are in
  // flight, so the user never sees the "No recommendations found" empty
  // state during the cold-start window. Resets whenever the effect
  // re-runs for a different user.
  const [initializing, setInitializing] = useState<boolean>(true);
  // Socket-level failures, surfaced to the page as a non-blocking banner.
  // Debounced: socket.io's exponential-backoff retry usually recovers within
  // a couple of seconds, so we hold off rendering anything until the error
  // has persisted past ERROR_BANNER_DELAY_MS — that way transient handshake
  // hiccups (e.g. polling→websocket upgrade churn on first connect) don't
  // flash a red banner the user has to dismiss.
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  // Set to true when the cleanup function starts tearing down the socket.
  // `socket.disconnect()` on a still-handshaking socket emits a
  // `connect_error` that has no real user-facing meaning — the connection
  // is being intentionally aborted because the effect is re-running. The
  // connect_error handler reads this flag and bails so we never set
  // `error` from a self-inflicted disconnect.
  const tornDownRef = useRef<boolean>(false);
  // Pending timer for the deferred error banner. Cleared on cleanup +
  // whenever a successful connect/payload arrives, so a recovered socket
  // never surfaces the banner that was about to fire.
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the highest page we've loaded for each tab so we know what to ask
  // for next. Stays in a ref (not state) to avoid re-running the connect
  // effect on each page bump.
  const openPageRef = useRef<number>(0);
  const closedPageRef = useRef<number>(0);

  // Long enough that a typical socket.io reconnect (1-2s) clears it before
  // the user ever sees the banner; short enough that a genuine outage
  // surfaces within a normal page-load wait.
  const ERROR_BANNER_DELAY_MS = 6000;

  const clearErrorTimer = () => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  };

  const clearError = () => {
    clearErrorTimer();
    setError(null);
  };

  const scheduleError = (message: string) => {
    // Coalesce: if a timer is already pending, leave it alone. The first
    // failure starts the clock; we only escalate once.
    if (errorTimerRef.current) return;
    errorTimerRef.current = setTimeout(() => {
      errorTimerRef.current = null;
      // Log only once the failure has persisted past the debounce — i.e.
      // it's about to become user-visible. Transient transport hiccups
      // (polling-vs-websocket upgrade churn, brief network blips) recover
      // before this fires and stay out of the console entirely.
      console.warn("[ScoreCard] live connection unavailable:", message);
      setError(message);
    }, ERROR_BANNER_DELAY_MS);
  };

  useEffect(() => {
    // NextAuth's useSession is async — on first mount session.data is
    // undefined and the page passes id as undefined. If we opened the
    // socket here, the backend's `if (!id) return;` would silently bail.
    // Gate on a real id so the socket is only opened once we know who to
    // fetch for. (role is optional on the backend — only id is required.)
    if (!id) return;

    tornDownRef.current = false;

    // Polling-first — `transports: ['polling', 'websocket']` with
    // `upgrade: true`. Polling (long-poll HTTP) connects on the first try
    // even during cold-start / Strict-Mode-double-mount races; the engine
    // then transparently upgrades to websocket in the background. If the
    // upgrade fails (e.g. a reverse proxy that doesn't forward
    // `Upgrade: websocket`) the client silently stays on polling — no
    // `connect_error` is surfaced. Pinning `transports: ['websocket',
    // 'polling']` caused the first-navigation "Live tracking is offline"
    // banner because engine.io's `tryAllTransports` defaults to false — a
    // failed WS handshake never fell back to polling automatically; we set
    // it true here as a belt-and-suspenders fallback.
    //
    // FOOTGUN: socket.io-client caches one engine.io Manager per backend
    // origin (origin + "/socket.io", NOT per namespace), and only the FIRST
    // io() call to that origin applies its transport config — every later
    // namespace multiplexes over the existing Manager and these options are
    // ignored. On soft-navigation the dashboard layout's notification socket
    // opens the Manager before us, so notificationSocket.ts MUST stay
    // polling-first too; on a fresh refresh this scorecard socket wins and
    // these options take effect. Both call sites are kept in sync.
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/scorecardlive/${type}`,
      { transports: ["polling", "websocket"], tryAllTransports: true },
    );
    socketRef.current = socket;

    // Reset accumulators when the connection re-establishes for a different user.
    openPageRef.current = 0;
    closedPageRef.current = 0;
    setOpenTrades([]);
    setClosedTrades([]);
    setInitializing(true);
    clearError();

    // Re-emit on every (re)connect: covers the initial connect AND any
    // network-blip reconnect so the backend re-establishes its live
    // interval. If the underlying engine is already connected (e.g.
    // another namespace open under the same Manager), fire once now too —
    // the "connect" listener wouldn't catch a past event.
    // Also clears any pending/visible error: a working socket means
    // there's nothing to warn the user about.
    const emitDetails = () => {
      socket.emit("details", { id, role, openPage: 0, closedPage: 0 });
    };
    const handleConnect = () => {
      clearError();
      emitDetails();
    };
    socket.on("connect", handleConnect);
    socket.io.on("reconnect", handleConnect);
    if (socket.connected) handleConnect();

    // Surface socket-level failures so the page can render a real
    // message instead of an empty table — but only after the failure
    // has persisted long enough that it's not a transient handshake
    // hiccup. Self-inflicted disconnects (effect cleanup) are skipped
    // entirely via the tornDown flag.
    socket.on("connect_error", (err) => {
      if (tornDownRef.current) return;
      setInitializing(false);
      // Don't log here — socket.io fires this for every failed
      // reconnect attempt, including the recoverable polling-to-websocket
      // upgrade churn. scheduleError() logs once the failure is about
      // to become user-visible.
      scheduleError(err.message || "Connection failed");
    });

    // Split events: backend now emits scorecardOpen on every 1.5s tick
    // and scorecardClosed only on pub/sub events (close / manual_exit /
    // deleted). This cuts the per-tick payload by 60-80% and lets the
    // short-circuit below skip render storms when nothing changed.
    const handleOpen = ({
      openTrades: oRaw,
      totalOpenTrades: tOpen,
    }: {
      openTrades: any[];
      totalOpenTrades?: number;
    }) => {
      const shapedOpen = (oRaw ?? []).map(shapeTrade);
      setOpenTrades((prev) => {
        const next = dedupeById([
          ...shapedOpen,
          ...prev.slice(shapedOpen.length),
        ]);
        // Reuse the prior array reference when the payload is
        // value-identical so downstream `useMemo`/`React.memo` short
        // circuits skip the entire re-render of the row tree.
        return sameRows(prev, next) ? prev : next;
      });
      if (typeof tOpen === "number") setTotalOpenTrades(tOpen);
      setInitializing(false);
      // First successful payload proves the connection is healthy —
      // cancel any pending error timer and clear a stale banner.
      clearError();
    };

    const handleClosed = ({
      closedTrades: cRaw,
      totalClosedTrades: tClosed,
    }: {
      closedTrades: any[];
      totalClosedTrades?: number;
    }) => {
      const shapedClosed = (cRaw ?? []).map(shapeTrade);
      setClosedTrades((prev) => {
        const next = dedupeById([
          ...shapedClosed,
          ...prev.slice(shapedClosed.length),
        ]);
        return sameRows(prev, next) ? prev : next;
      });
      if (typeof tClosed === "number") setTotalClosedTrades(tClosed);
      setInitializing(false);
      clearError();
    };

    socket.on("scorecardOpen", handleOpen);
    socket.on("scorecardClosed", handleClosed);

    // Back-compat: any old server still emitting the legacy `scorecard`
    // event (one shape carrying both open + closed) keeps working.
    socket.on(
      "scorecard",
      ({
        openTrades: oRaw,
        closedTrades: cRaw,
        totalOpenTrades: tOpen,
        totalClosedTrades: tClosed,
      }: {
        openTrades: any[];
        closedTrades: any[];
        totalOpenTrades: number;
        totalClosedTrades?: number;
      }) => {
        handleOpen({ openTrades: oRaw, totalOpenTrades: tOpen });
        handleClosed({ closedTrades: cRaw, totalClosedTrades: tClosed });
      }
    );

    socket.on(
      "loadMoreResult",
      ({
        tab,
        page,
        trades,
        total,
      }: {
        tab: "open" | "closed";
        page: number;
        trades: any[];
        total: number;
      }) => {
        const shaped = (trades ?? []).map(shapeTrade);
        if (tab === "open") {
          setOpenTrades((prev) => dedupeById([...prev, ...shaped]));
          if (typeof total === "number") setTotalOpenTrades(total);
          setOpenLoading(false);
        } else {
          setClosedTrades((prev) => dedupeById([...prev, ...shaped]));
          if (typeof total === "number") setTotalClosedTrades(total);
          setClosedLoading(false);
        }
      }
    );

    return () => {
      // Mark teardown BEFORE disconnecting so the connect_error fired by
      // aborting an in-flight handshake doesn't leak into UI state.
      tornDownRef.current = true;
      clearErrorTimer();
      socket.io.off("reconnect", handleConnect);
      socket.disconnect();
      socketRef.current = null;
    };
    // `role` is intentionally omitted from the deps — the backend's details
    // handler ignores it, and including it caused the effect to re-run when
    // NextAuth's session re-emitted on first navigation, tearing down a
    // still-handshaking socket and surfacing a spurious "Live tracking is
    // offline" banner. See plan: in-my-application-some-resilient-sun.md.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  const loadMoreOpen = useCallback(() => {
    if (openLoading) return;
    if (totalOpenTrades && openTrades.length >= totalOpenTrades) return;
    const next = openPageRef.current + 1;
    openPageRef.current = next;
    setOpenLoading(true);
    socketRef.current?.emit("loadMore", { tab: "open", page: next });
  }, [openLoading, openTrades.length, totalOpenTrades]);

  const loadMoreClosed = useCallback(() => {
    if (closedLoading) return;
    if (totalClosedTrades && closedTrades.length >= totalClosedTrades) return;
    const next = closedPageRef.current + 1;
    closedPageRef.current = next;
    setClosedLoading(true);
    socketRef.current?.emit("loadMore", { tab: "closed", page: next });
  }, [closedLoading, closedTrades.length, totalClosedTrades]);

  return {
    // Backend already returns only open trades on the scorecardOpen
    // event. No per-render filter needed; pass the array through so the
    // reference stays stable when sameRows short-circuited setOpenTrades.
    openTrades,
    closedTrades,
    ScoreCardcolumns: RecommendationColumns,
    totalOpenTrades,
    totalClosedTrades,
    loadMoreOpen,
    loadMoreClosed,
    openLoading,
    closedLoading,
    initializing,
    error,
  };
}

export function useScoreCardDataForHomepage(
  type: ScoreCardTypesHomepageEnum
) {
  const [openTradeData, setOpenTradeData] = useState<ScoreCardTypes[]>([]);

  useEffect(() => {
    // Polling-first + tryAllTransports — see the footgun note in the main
    // hook above: every backend-origin socket shares one engine.io Manager,
    // so these must stay consistent across all call sites.
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/scorecardlive/${type}`,
      { transports: ["polling", "websocket"], tryAllTransports: true },
    );

    const handleScorecardEvent = ({
      openTodayScorecards,
    }: {
      openTodayScorecards: ScoreCardTypes[];
    }) => {

      setOpenTradeData(
        openTodayScorecards.map((item) => ({
          ...item,
          validity: item.validity ? item.validity.split(",")[0] : "",
          rateRange: item.rate
            ? String(item.rate)
            : `${item.lowerRange} - ${item.upperRange}`,
          pnl: item.istriggered === "triggered" ? Number(item.pnl) : 0,
          pnlpercentage:
            item.istriggered === "triggered"
              ? item.pnlpercentage
                ? Number(item.pnlpercentage).toFixed(2) + "%"
                : "0%"
              : "-",

          holdingPeriod:
            item.holdingPeriod === "intraday"
              ? "Intraday"
              : `${Math.floor(
                  (Date.parse(item.exitDate!) -
                    Date.parse(item.createdAt.toString())) /
                    86400000
                )} Days`,

          SharedBy: item.authorData.name,
          shareWith: item.shareWith,
          shareWithPlans: item.shareWithPlans,

          istriggered:
            item.istriggered === "triggered" ? "Initiated" : "Not initiated",
        }))
      );

    };
    
    socket.on("todayScorecards", handleScorecardEvent);
    
    return () => {
      socket.disconnect();
      socket.off("todayScorecards", handleScorecardEvent);
    };
  }, []);

  // console.log("image testing", openTradeData)

  return {
    openTodayScorecards: openTradeData,
  };
}
