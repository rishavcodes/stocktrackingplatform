"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plug, ShieldCheck, RefreshCw } from "lucide-react";
import {
  BrokerSelectModal,
  type BrokerOption,
} from "@/components/userdashboard/Overview/BrokerSelectModal";
import { BigulOrders } from "@/components/Orders/BigulOrders";
import {
  getBrokerSession,
  hasBigulSession,
  redirectToBigulSSO,
} from "@/lib/brokerSession";
import {
  useBigulSsoCallback,
  DASHBOARD_BROKER_STATE,
} from "@/hooks/useBigulSsoCallback";

const ALICE_BLUE_LINK = "https://ant.aliceblueonline.com/?appcode=kNrXW5KZEJ";
const ALICE_BLUE_LOGO =
  "https://ekyc.aliceblueonline.com/images/aliceblue-ekyc-logo.svg";

// Bigul has no `link` so the modal hands selection back to `onSelectBroker`,
// where we kick off the partner-SSO flow. Alice Blue keeps its existing
// link-based flow (the modal navigates to it directly).
const BROKERS: BrokerOption[] = [
  { id: "bigul", name: "Bigul", logoPlaceholder: "BG" },
  {
    id: "alice-blue",
    name: "Alice Blue",
    logo: ALICE_BLUE_LOGO,
    logoPlaceholder: "AB",
    link: ALICE_BLUE_LINK,
  },
];

export default function BrokerPage() {
  const { data: session, status, update } = useSession();
  const [modalOpen, setModalOpen] = useState(false);

  // Defer the broker-session read to the client (getBrokerSession reads
  // localStorage) to avoid a hydration mismatch between the two branches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Safety net: if the user happens to land here with SSO params still on the
  // URL, finish the handshake. The primary handling happens on the marketplace
  // landing page (Bigul's single registered redirect URL), which then routes
  // here with a clean URL, so this is usually a no-op.
  useBigulSsoCallback({ status, updateSession: update });

  const connected = mounted && hasBigulSession(session);
  const clientCode = connected ? getBrokerSession(session)?.clientCode : null;

  const handleSelectBroker = (broker: BrokerOption) => {
    if (broker.id === "bigul") {
      redirectToBigulSSO(DASHBOARD_BROKER_STATE);
    }
    // Alice Blue is handled by the modal's built-in link navigation.
  };

  if (connected) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
        {/* Connected header */}
        <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              BG
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Bigul
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Connected
                </span>
              </div>
              {clientCode && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Client code: <span className="font-medium">{clientCode}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Switch broker
          </button>
        </div>

        {/* Live order/trade/position view */}
        <BigulOrders session={session} className="px-0 py-0" />

        <BrokerSelectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          brokers={BROKERS}
          onSelectBroker={handleSelectBroker}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
      {/* Header */}
      <div className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Brokers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your broker account to place trades and sync your portfolio
        </p>
      </div>

      {/* Connect CTA */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 sm:p-10 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Plug className="w-7 h-7" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            No broker connected
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Link a broker to place trades and view your live orders, trades and
            positions right here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <Plug className="w-4 h-4" />
          Connect Broker
        </button>
      </div>

      <BrokerSelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        brokers={BROKERS}
        onSelectBroker={handleSelectBroker}
      />
    </div>
  );
}
