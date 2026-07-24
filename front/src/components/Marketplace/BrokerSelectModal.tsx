"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface BrokerOption {
  id: string;
  name: string;
  logo?: string;
  logoPlaceholder?: string;
  link?: string;
}

const ALICE_BLUE_LINK = "https://ant.aliceblueonline.com/?appcode=kNrXW5KZEJ";
const ALICE_BLUE_LOGO = "https://ekyc.aliceblueonline.com/images/aliceblue-ekyc-logo.svg";

const DEFAULT_BROKERS: BrokerOption[] = [
  { id: "alice-blue", name: "Alice Blue", logo: ALICE_BLUE_LOGO, logoPlaceholder: "AB", link: ALICE_BLUE_LINK },
];

interface BrokerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBroker?: (broker: BrokerOption) => void;
  brokers?: BrokerOption[];
}

export function BrokerSelectModal({
  isOpen,
  onClose,
  onSelectBroker,
  brokers = DEFAULT_BROKERS,
}: BrokerSelectModalProps) {
  const [search, setSearch] = useState("");

  const filteredBrokers = useMemo(() => {
    if (!search.trim()) return brokers;
    const q = search.trim().toLowerCase();
    return brokers.filter(
      (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)
    );
  }, [brokers, search]);

  const handleSelect = (broker: BrokerOption) => {
    onSelectBroker?.(broker);
    onClose();
    if (broker.link) {
      window.location.href = broker.link;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0 overflow-hidden bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Select your broker
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search your broker"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-300"
            />
          </div>
        </div>

        <div className="px-6 pb-6 max-h-[320px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {filteredBrokers.map((broker) => (
              <button
                key={broker.id}
                type="button"
                onClick={() => handleSelect(broker)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl text-left",
                  "bg-white border border-slate-200 shadow-sm",
                  "hover:border-slate-300 hover:shadow-md hover:bg-slate-50/50",
                  "transition-colors duration-150"
                )}
              >
                <div className="flex-shrink-0 w-12 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm overflow-hidden">
                  {broker.logo ? (
                    <img
                      src={broker.logo}
                      alt=""
                      className="max-w-full max-h-full w-auto h-6 object-contain"
                    />
                  ) : (
                    broker.logoPlaceholder ?? broker.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="font-medium text-slate-900 text-sm truncate">
                  {broker.name}
                </span>
              </button>
            ))}
          </div>
          {filteredBrokers.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">
              No broker found. Try a different search.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
