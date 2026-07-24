// TradeDetailsModal.tsx
'use client';

import { X, TrendingUp, TrendingDown, Calendar, Clock, PieChart, ExternalLink, Plus, MessageSquare, Download, User, Info, Target, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import * as React from "react";

import { useToast } from "@/components/ui/use-toast";
import { getEntryDisplay } from "./entryDisplay";
interface TradeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: any;
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
  checkMarketStatus: (exchange: string) => "open" | "closed";
  onAddNote?: (tradeId: string, note: string) => void;
}

export function TradeDetailsModal({
  isOpen,
  onClose,
  trade,
  calculateTradePnl,
  calculatePnlPercentage,
  getPlanNames,
  checkMarketStatus,
  onAddNote
}: TradeDetailsModalProps) {
  const [newNote, setNewNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { data: session } = useSession();
  const [localNotes, setLocalNotes] = React.useState<any[]>([]);
  // Heavy fields (rational, notes, link, recommendationPDF, rationalPDF,
  // rationalText) were stripped from the live socket payload to keep
  // per-tick bandwidth tight. Pull them on demand the first time the
  // modal opens for a given trade and merge over the lightweight `trade`
  // prop. While in flight we show whatever the prop already has.
  const [details, setDetails] = React.useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
 const { toast } = useToast();

  // Lazy-load heavy fields on open. Reset whenever the modal is reopened
  // for a different trade so stale details from a prior trade can't leak in.
  React.useEffect(() => {
    if (!isOpen || !trade?._id) return;
    let cancelled = false;
    setDetails(null);
    setDetailsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/${trade._id}/details`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled) return;
        // Backend returns either the raw doc or { data: doc } — accept both.
        setDetails(payload?.data ?? payload ?? null);
      })
      .catch((err) => {
        if (!cancelled) console.error("[TradeDetailsModal] details fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, trade?._id]);

  // Merged view: lightweight `trade` from the live socket overlaid with
  // the heavy fields fetched on demand. Everything past this point reads
  // from `t` so the modal works the same whether details have arrived yet
  // or not.
  const t = React.useMemo(
    () => (details ? { ...trade, ...details } : trade),
    [trade, details],
  );

  // Initialize local notes from trade data
  React.useEffect(() => {
    if (t && isOpen) {
      if (Array.isArray(t.notes)) {
        setLocalNotes(t.notes);
      } else if (typeof t.notes === 'string' && t.notes.trim()) {
        setLocalNotes([{
          content: t.notes,
          addedBy: session?.user?.RegName || 'User',
          timestamp: new Date().toISOString()
        }]);
      } else {
        setLocalNotes([]);
      }
      setNewNote("");
    }
  }, [t, isOpen, session]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !trade?._id) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/${trade._id}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: newNote.trim(),
            addedBy: session?.user?.RegName || 'User',
            timestamp: new Date().toISOString()
          }),
        }
      );

      if (!response.ok) {
        toast({
        title:"Success",
        description:"Failed to add note",
        variant:"destructive"
      })
      }

      const result = await response.json();
      
      const newNoteObj = {
        content: newNote.trim(),
        addedBy: session?.user?.RegName || 'User',
        timestamp: new Date().toISOString()
      };
      
      setLocalNotes(prev => [...prev, newNoteObj]);
      
      toast({
        title:"Success",
        description:"Note added successfully",
        variant:"default"
      })
      if (onAddNote) {
        await onAddNote(trade._id, newNote.trim());
      }
      
      setNewNote("");
      
    } catch (error) {
      console.error("Failed to add note:", error);
      
      toast({
        title:"ERROR",
        description:`Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant:"destructive"
      })
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewNote("");
    setLocalNotes([]);
    onClose();
  };

  if (!trade) return null;

  const calculatedPnl = calculateTradePnl(trade);
  const calculatedPnlPercentage = calculatePnlPercentage(trade, calculatedPnl);
  const lotsize = Number(trade.lotsize) || 1;
  const tradeMarketStatus = checkMarketStatus(trade.exchange);
  const entryPrice = Number(trade.entryPrice) || Number(trade.rate) || 0;
  const currentPrice = trade.status === 'open' ? Number(trade.ltp) || 0 : Number(trade.exitRate) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getEntryTypeColor = (type: string) => {
    return type === 'buy' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const renderPnlDisplay = () => {
    if (calculatedPnl === "not_initiated") {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
          NOT initiated
        </Badge>
      );
    }

    if (trade.status === 'closed') {
      const isProfit = calculatedPnl && calculatedPnl > 0;
      const isLoss = calculatedPnl && calculatedPnl < 0;
      
      return (
        <div className="flex flex-col items-end">
          <div className={`flex items-center gap-1 text-xl font-bold ${
            isProfit ? 'text-green-600 dark:text-green-400' :
            isLoss ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            ₹{(calculatedPnl || 0).toFixed(2)}
            {isProfit ? <TrendingUp className="w-5 h-5" /> : 
             isLoss ? <TrendingDown className="w-5 h-5" /> : null}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            ({calculatedPnlPercentage > 0 ? '+' : ''}{calculatedPnlPercentage.toFixed(2)}%)
          </p>
        </div>
      );
    }

    if (trade.status === 'open') {
      if (calculatedPnl === null) {
        return (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Market Closed</span>
            </div>
          </div>
        );
      } else {
        const isProfit = calculatedPnl && calculatedPnl > 0;
        const isLoss = calculatedPnl && calculatedPnl < 0;
        
        return (
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1 text-xl font-bold ${
              isProfit ? 'text-green-600 dark:text-green-400' :
              isLoss ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              ₹{(calculatedPnl || 0).toFixed(2)}
              {isProfit ? <TrendingUp className="w-5 h-5" /> : 
               isLoss ? <TrendingDown className="w-5 h-5" /> : null}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              ({calculatedPnlPercentage > 0 ? '+' : ''}{calculatedPnlPercentage.toFixed(2)}%)
            </p>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <PieChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl text-gray-800 dark:text-white">
                Trade Details
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-slate-400">
                Complete information for {trade.scriptname} trade
              </DialogDescription>
            </div>
            {trade.scriptname && (
              <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                {trade.scriptname}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Trade Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                    {trade.scriptname}
                  </h3>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(trade.status)}>
                      {trade.status?.toUpperCase()}
                    </Badge>
                    <Badge className={getEntryTypeColor(trade.entryType)}>
                      {trade.entryType?.toUpperCase()}
                    </Badge>
                    {trade.istriggered === "not triggered" && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                        Not Triggered
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Exchange</p>
                    <p className="font-semibold text-gray-800 dark:text-white">{trade.exchange}</p>
                  </div>
                  {!((['NSE', 'BSE'].includes(trade.exchange))) && (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Lot Size</p>
                      <p className="font-semibold text-gray-800 dark:text-white">{lotsize}</p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Created</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(trade.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Updated</p>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {new Date(trade.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="ml-4">
                {renderPnlDisplay()}
              </div>
            </div>
          </div>

          <Separator />

          {/* Price Grid Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Price Levels</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Entry, exit, target, and stop loss</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-blue-100 dark:bg-blue-800/30 rounded">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Entry Price</p>
                </div>
                {(() => {
                  const e = getEntryDisplay(trade);
                  return (
                    <>
                      <p className="text-xl font-bold text-gray-800 dark:text-white">
                        {e.isRange && !e.showsBoth ? e.primary : `₹${e.primary}`}
                      </p>
                      {e.subtitle && (
                        <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                          {e.subtitle}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-indigo-100 dark:bg-indigo-800/30 rounded">
                    <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                    {trade.status === 'open' ? 'Current LTP' : 'Exit Price'}
                  </p>
                </div>
                <p className="text-xl font-bold text-gray-800 dark:text-white">
                  {currentPrice > 0 ? `₹${currentPrice.toFixed(2)}` : "—"}
                </p>
              </div>

              {trade.targets && trade.targets.length > 1 ? (
                trade.targets.map((t: any, i: number) => (
                  <div key={i} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-green-100 dark:bg-green-800/30 rounded">
                        {t.isHit ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Target {i + 1}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      ₹{Number(t.price).toFixed(2)}
                    </p>
                    {t.isHit && t.hitAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Hit at {new Date(t.hitAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-green-100 dark:bg-green-800/30 rounded">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">Target</p>
                  </div>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    ₹{Number(trade.target) || 0}
                  </p>
                </div>
              )}

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-red-100 dark:bg-red-800/30 rounded">
                    <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Stop Loss</p>
                </div>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  ₹{Number(trade.stoploss) || 0}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trade Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Trade Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                    <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Trade Information</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Additional trade parameters</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {[
                    { label: 'Validity', value: trade.validity || 'N/A' },
                    { label: 'Risk/Reward Ratio', value: trade.riskRewardRatio || 'N/A' },
                    { label: 'Trigger Status', value: trade.istriggered === "not triggered" ? "Not Triggered" : "Triggered" },
                    { label: 'Market Status', value: tradeMarketStatus === "open" ? "Open" : "Closed" },
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded">
                      <span className="text-sm text-gray-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-medium text-gray-800 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links Section — heavy fields come in via the on-open
                  details fetch; show a small loader until they land. */}
              {detailsLoading && !details ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">References</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-4 text-sm text-gray-500 dark:text-slate-400">
                    Loading…
                  </div>
                </div>
              ) : (t.link || t.recommendationPDF) ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">References</h3>
                  </div>

                  <div className="space-y-2">
                    {t.link && (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-white">Reference Link</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t.link}</p>
                        </div>
                      </a>
                    )}

                    {t.recommendationPDF && (
                      <a
                        href={t.recommendationPDF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Download className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 dark:text-white">Chart/PDF</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">View recommendation document</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Distribution Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Distribution</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Plans this trade is shared with</p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-slate-400">Shared Plans:</p>
                  <p className="font-medium text-gray-800 dark:text-white mt-1">
                    {getPlanNames(trade?.shareWithPlans || []) || "None"}
                  </p>
                </div>
              </div>

              {/* Rationale Section — heavy field served by the on-open
                  details endpoint. Skeleton until it arrives. */}
              {detailsLoading && !details ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Rationale</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-4 text-sm text-gray-500 dark:text-slate-400">
                    Loading…
                  </div>
                </div>
              ) : t.rational ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Rationale</h3>
                  </div>

                  <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-slate-300">{t.rational}</p>
                  </div>
                </div>
              ) : null}

              {/* Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">Additional Notes</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Add comments or observations</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {localNotes.length} {localNotes.length === 1 ? 'note' : 'notes'}
                  </Badge>
                </div>
                
                {/* Add Note Input */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note about this trade..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] resize-none text-sm"
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSubmitting}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Add Note
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Existing Notes */}
                {localNotes.length > 0 && (
                  <div className="space-y-2">
                    {localNotes.map((note: any, index: number) => (
                      <div 
                        key={index}
                        className="bg-gray-50 dark:bg-slate-800 border rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-medium text-sm text-gray-700 dark:text-slate-300">
                              {note.addedBy || 'User'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {new Date(note.timestamp || Date.now()).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400 pl-4">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Trade ID: {trade._id?.substring(0, 8)}...
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="min-w-[100px] border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}