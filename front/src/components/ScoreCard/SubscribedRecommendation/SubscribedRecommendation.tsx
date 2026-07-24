"use client";

import {
  MyRecommendationTable,
  ScoreCardTypesEnum,
  useScoreCardData,
} from "@/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { BrokerSelectModal, BrokerOption } from "@/components/Marketplace/BrokerSelectModal";
import { BuyOrderModal } from "@/components/Marketplace/BuyOrderModal";
import MarketplaceAuthModal from "@/components/Marketplace/MarketplaceAuthModal";
import {
  ALICE_BLUE_SESSION_KEY,
  hasBigulSession as hasBigulSessionFromLib,
  getBrokerClientCode as getBrokerClientCodeFromLib,
  redirectToBigulSSO,
} from "@/lib/brokerSession";
import { useBrokerSessionExpiry } from "@/hooks/useBrokerSessionExpiry";
import { useBigulSsoCallback } from "@/hooks/useBigulSsoCallback";

type SegmentFilter = "equity" | "fno" | "mcx";
type HorizonFilter = "intraday" | "forward";

const EQUITY_EXCHANGES = new Set(["NSE", "BSE"]);
const FNO_EXCHANGES = new Set(["NFO", "BFO", "CDS", "MCX-FO"]);

const ALICE_BLUE_LINK = "https://ant.aliceblueonline.com/?appcode=kNrXW5KZEJ";
const ALICE_BLUE_LOGO = "https://ekyc.aliceblueonline.com/images/aliceblue-ekyc-logo.svg";

const DASHBOARD_BROKERS: BrokerOption[] = [
  { id: "alice-blue", name: "Alice Blue", logo: ALICE_BLUE_LOGO, logoPlaceholder: "AB", link: ALICE_BLUE_LINK },
  { id: "bigul", name: "Bigul", logoPlaceholder: "BG" },
];

function matchesSegment(exchange: string | undefined, selected: Set<SegmentFilter>) {
  if (selected.size === 0) return true;
  const ex = (exchange || "").toUpperCase();
  if (selected.has("equity") && EQUITY_EXCHANGES.has(ex)) return true;
  if (selected.has("fno") && FNO_EXCHANGES.has(ex)) return true;
  if (selected.has("mcx") && ex === "MCX") return true;
  return false;
}

function matchesHorizon(
  holdingPeriod: string | undefined,
  selected: Set<HorizonFilter>
) {
  if (selected.size === 0) return true;
  const hp = (holdingPeriod || "").toLowerCase();
  if (selected.has("intraday") && hp === "intraday") return true;
  if (selected.has("forward") && hp === "forward") return true;
  return false;
}

export default function SubscribedRecommendation() {
  const session = useSession();
  const isAuthenticated = session.status === "authenticated";
  const { openTrades, closedTrades, totalOpenTrades } = useScoreCardData(
    session.data?.user.id!,
    session.data?.user.role!,
    ScoreCardTypesEnum.ForSubscribed
  );

  const [segmentFilter, setSegmentFilter] = useState<Set<SegmentFilter>>(
    new Set()
  );
  const [horizonFilter, setHorizonFilter] = useState<Set<HorizonFilter>>(
    new Set()
  );

  // --- Broker + trade-execution state (mirrors marketplace recommendations page) ---
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [activeBrokerType, setActiveBrokerType] = useState<"bigul" | "alice-blue">("alice-blue");
  const pendingRecommendationRef = useRef<any>(null);

  // Clear stale Bigul session if expired.
  useBrokerSessionExpiry(true);

  const hasAliceBlueSession = useCallback(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      if (d?.expiresAt != null && Date.now() > d.expiresAt) return false;
      return true;
    } catch {
      return true;
    }
  }, []);

  const hasBigulSession = useCallback(
    () => hasBigulSessionFromLib(session.data ?? null),
    [session.data]
  );

  // Bigul SSO return handler: when the user is redirected back with credentials in
  // the URL, persist the session in NextAuth (or localStorage + auth modal for
  // first-time users).
  useBigulSsoCallback({
    status: session.status,
    updateSession: session.update,
    onFirstTimeUser: () => setShowAuthModal(true),
  });

  const handleBuySellClick = useCallback(
    (rec: any) => {
      const hasBigul = hasBigulSession();
      const hasAlice = hasAliceBlueSession();
      if (!hasBigul && !hasAlice) {
        pendingRecommendationRef.current = rec;
        setShowBrokerModal(true);
        return;
      }
      const brokerType: "bigul" | "alice-blue" = hasBigul ? "bigul" : "alice-blue";
      setActiveBrokerType(brokerType);
      if (!isAuthenticated) {
        pendingRecommendationRef.current = rec;
        setShowAuthModal(true);
        return;
      }
      setSelectedRecommendation(rec);
      setShowBuyOrderModal(true);
    },
    [hasBigulSession, hasAliceBlueSession, isAuthenticated]
  );

  const handleSelectBroker = useCallback((broker: BrokerOption) => {
    if (broker.id === "bigul") {
      redirectToBigulSSO();
    }
    // Alice Blue: BrokerSelectModal performs the window.location.href redirect itself
    // using the `link` field on the broker option.
  }, []);

  const handleAuthComplete = useCallback(() => {
    setShowAuthModal(false);
    const p = pendingRecommendationRef.current;
    if (p) {
      pendingRecommendationRef.current = null;
      setSelectedRecommendation(p);
      setShowBuyOrderModal(true);
    }
  }, []);

  const toggleSegment = (value: SegmentFilter) => {
    setSegmentFilter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const toggleHorizon = (value: HorizonFilter) => {
    setHorizonFilter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const filteredOpen = useMemo(
    () =>
      (openTrades || []).filter(
        (t: any) =>
          matchesSegment(t.exchange, segmentFilter) &&
          matchesHorizon(t.holdingPeriod, horizonFilter)
      ),
    [openTrades, segmentFilter, horizonFilter]
  );

  const filteredClosed = useMemo(
    () =>
      (closedTrades || []).filter(
        (t: any) =>
          matchesSegment(t.exchange, segmentFilter) &&
          matchesHorizon(t.holdingPeriod, horizonFilter)
      ),
    [closedTrades, segmentFilter, horizonFilter]
  );

  return (
    <div className="pb-20">
      {/* Filters + Open/Closed switch on a single row. Section labels
          (SEGMENT / HORIZON) are dropped — the chip text is self-explanatory
          — and the tab switch is pushed to the right with ml-auto. The row
          wraps gracefully on narrow screens but stays one line on desktop,
          reclaiming the vertical space the old labelled rows used to eat. */}
      <Tabs defaultValue="open" className="w-full">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <FilterChip
            label="All"
            active={segmentFilter.size === 0}
            onClick={() => setSegmentFilter(new Set())}
          />
          <FilterChip
            label="Equity"
            active={segmentFilter.has("equity")}
            onClick={() => toggleSegment("equity")}
          />
          <FilterChip
            label="FnO"
            active={segmentFilter.has("fno")}
            onClick={() => toggleSegment("fno")}
          />
          <FilterChip
            label="MCX"
            active={segmentFilter.has("mcx")}
            onClick={() => toggleSegment("mcx")}
          />
          <span className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-0.5 flex-shrink-0" />
          <FilterChip
            label="Intraday"
            active={horizonFilter.has("intraday")}
            onClick={() => toggleHorizon("intraday")}
          />
          <FilterChip
            label="Carry-fwd"
            active={horizonFilter.has("forward")}
            onClick={() => toggleHorizon("forward")}
          />

          <TabsList className="h-9 sm:h-10 ml-auto">
            <TabsTrigger value="open" className="text-xs sm:text-sm px-2.5 sm:px-3">
              Open Trades ({filteredOpen.length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-xs sm:text-sm px-2.5 sm:px-3">
              Closed Trades ({filteredClosed.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="open" className="mt-4">
          <MyRecommendationTable
            data={filteredOpen}
            type="open"
            totalOpenTrades={totalOpenTrades}
            showActions={false}
            onBuySellClick={handleBuySellClick}
            defaultViewMode="cards"
          />
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <MyRecommendationTable
            data={filteredClosed}
            type="closed"
            showActions={false}
            defaultViewMode="cards"
          />
        </TabsContent>
      </Tabs>

      {/* Trade-execution modals */}
      <BrokerSelectModal
        isOpen={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
        onSelectBroker={handleSelectBroker}
        brokers={DASHBOARD_BROKERS}
      />
      <MarketplaceAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          pendingRecommendationRef.current = null;
        }}
        onAuthenticated={handleAuthComplete}
        brokerType={activeBrokerType === "bigul" ? "bigul" : "aliceblue"}
        clientCode={getBrokerClientCodeFromLib(
          session.data ?? null,
          activeBrokerType === "bigul"
        )}
      />
      {selectedRecommendation && (
        <BuyOrderModal
          isOpen={showBuyOrderModal}
          onClose={() => {
            setShowBuyOrderModal(false);
            setSelectedRecommendation(null);
          }}
          recommendation={selectedRecommendation}
          brokerType={activeBrokerType}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium transition-colors border ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}
