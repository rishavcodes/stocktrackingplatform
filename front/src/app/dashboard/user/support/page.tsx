"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  ImagePlus,
  Loader2,
  MessageSquare,
  Paperclip,
  PieChart,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle,
  X,
} from "lucide-react";

type Status = "open" | "in_progress" | "resolved";
// Priority kept in the type union for legacy tickets that already have it set.
// New customer-facing tickets always go in as "normal".
type Priority = "urgent" | "high" | "normal" | "low";

type ThreadMsg = {
  _id?: string;
  // "user" = this customer's reply. "admin" = Tradebox staff reply.
  // "sp" is included for completeness because the schema enum allows it
  // even though customers never produce sp-tagged messages.
  from: "sp" | "user" | "admin";
  fromId: string;
  fromName: string;
  text: string;
  attachments?: string[];
  createdAt?: string;
};

type TicketContext = {
  pageUrl?: string;
  route?: string;
  userAgent?: string;
  viewport?: string;
  appVersion?: string;
  userType?: string;
};

type Ticket = {
  _id: string;
  ticketNumber?: string;
  title: string;
  description: string;
  category: string;          // sidebar tab key — see CATEGORY_TREE
  subCategory?: string;
  priority?: Priority;
  context?: TicketContext;
  status: Status;
  thread: ThreadMsg[];
  attachments?: string[];
  // spUnread is the field the backend uses for "submitter unread" — for
  // user-submitted tickets it tracks whether the customer has seen the latest
  // admin reply. The field name is legacy from when only SPs filed tickets.
  spUnread?: boolean;
  adminUnread?: boolean;
  submittedBy: { id: string; name: string; email: string };
  resolvedAt?: string;
  resolvedBy?: { id?: string | null; name?: string | null };
  createdAt: string;
  updatedAt: string;
};

const MAX_ATTACHMENTS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Category list for the customer support flow. One-level taxonomy — picks the
// surface the issue is about and goes straight to the title/description; no
// sub-categories because they were adding friction without much routing
// benefit on the admin side.
type CategoryMeta = {
  label: string;
  Icon: typeof MessageSquare;
  color: string;
};

const CATEGORY_TREE: Record<string, CategoryMeta> = {
  plan:            { label: "Plan",             Icon: ShieldCheck,   color: "text-violet-600 bg-violet-50"   },
  researchreports: { label: "Research Reports", Icon: FileText,      color: "text-orange-600 bg-orange-50"   },
  experts:         { label: "Experts",          Icon: UserCircle,    color: "text-amber-600 bg-amber-50"     },
  recommendation:  { label: "Recommendation",   Icon: TrendingUp,    color: "text-emerald-600 bg-emerald-50" },
  modelportfolio:  { label: "Model portfolio",  Icon: PieChart,      color: "text-cyan-600 bg-cyan-50"       },
  events:          { label: "Events",           Icon: Calendar,      color: "text-purple-600 bg-purple-50"   },
  courses:         { label: "Courses",          Icon: BookOpen,      color: "text-blue-600 bg-blue-50"       },
  billing:         { label: "Billing",          Icon: CreditCard,    color: "text-pink-600 bg-pink-50"       },
  broker:          { label: "Broker",           Icon: Briefcase,     color: "text-teal-600 bg-teal-50"       },
  others:          { label: "Others",           Icon: MessageSquare, color: "text-gray-600 bg-gray-100"      },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_TREE);

const FALLBACK_META: CategoryMeta = {
  label: "Other",
  Icon: MessageSquare,
  color: "text-gray-600 bg-gray-100",
};

const getCategoryMeta = (key: string | undefined): CategoryMeta =>
  (key && CATEGORY_TREE[key]) || FALLBACK_META;

const PRIORITY_PILL: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-blue-100 text-blue-800",
  low: "bg-slate-100 text-slate-700",
};

// Silent capture of browser/session state at submit time — saves admins the
// "what page, what browser" round-trips.
function captureContext(userType?: string): TicketContext {
  if (typeof window === "undefined") return {};
  return {
    pageUrl: document.referrer || window.location.href,
    route: document.referrer
      ? new URL(document.referrer).pathname
      : window.location.pathname,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    userType: userType || "customer",
  };
}

const STATUS_META: Record<Status, { label: string; pill: string }> = {
  open: { label: "Open", pill: "bg-amber-100 text-amber-800" },
  in_progress: { label: "In Progress", pill: "bg-blue-100 text-blue-800" },
  resolved: { label: "Resolved", pill: "bg-emerald-100 text-emerald-800" },
};

export default function CustomerSupportPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const userId = session?.user?.id;
  const userName =
    session?.user?.name ||
    (session?.user as { RegName?: string } | undefined)?.RegName ||
    "";
  const userEmail = session?.user?.email || "";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);

  // Single-screen create form state
  const [fCategory, setFCategory] = useState<string>("");
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fAttachments, setFAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replying, setReplying] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Object URLs for inline preview of attached reply images. Cleaned up below.
  const replyPreviewUrls = useMemo(
    () => replyAttachments.map((f) => URL.createObjectURL(f)),
    [replyAttachments]
  );
  useEffect(() => {
    return () => {
      replyPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [replyPreviewUrls]);

  const handlePickReplyFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: File[] = [...replyAttachments];
    const errors: string[] = [];
    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_ATTACHMENTS) {
        errors.push(`Max ${MAX_ATTACHMENTS} images per reply`);
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: only JPG/PNG/GIF/WEBP allowed`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`${file.name}: exceeds 5MB`);
        continue;
      }
      next.push(file);
    }
    if (errors.length) {
      toast({
        title: "Some files were skipped",
        description: errors.join("; "),
        variant: "destructive",
      });
    }
    setReplyAttachments(next);
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  };

  const removeReplyAttachment = (idx: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const previewUrls = useMemo(
    () => fAttachments.map((f) => URL.createObjectURL(f)),
    [fAttachments]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const handlePickFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: File[] = [...fAttachments];
    const errors: string[] = [];

    for (const file of Array.from(incoming)) {
      if (next.length >= MAX_ATTACHMENTS) {
        errors.push(`Max ${MAX_ATTACHMENTS} images allowed`);
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: only JPG/PNG/GIF/WEBP allowed`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`${file.name}: exceeds 5MB`);
        continue;
      }
      next.push(file);
    }

    if (errors.length) {
      toast({
        title: "Some files were skipped",
        description: errors.join("; "),
        variant: "destructive",
      });
    }
    setFAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setFAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const fetchTickets = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Cache-bust so admin replies show up without a hard refresh.
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets?submittedById=${userId}&_=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok && json?.success) {
        setTickets(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Re-pull the latest ticket from the server when opened — otherwise admin
  // replies that landed after the list fetch are invisible until refresh.
  const openTicketFresh = async (t: Ticket) => {
    setOpenTicket(t);

    if (t.spUnread) {
      setTickets((prev) =>
        prev.map((x) => (x._id === t._id ? { ...x, spUnread: false } : x))
      );
      // Re-uses the "sp" side here because the backend stores submitter-unread
      // in spUnread regardless of whether the submitter is SP or user.
      fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${t._id}/seen`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ side: "sp" }),
        }
      ).catch((err) => console.error("mark seen failed", err));
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${t._id}?_=${Date.now()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok && json?.success && json?.data) {
        const merged = { ...json.data, spUnread: false };
        setOpenTicket(merged);
        setTickets((prev) =>
          prev.map((x) => (x._id === merged._id ? merged : x))
        );
      }
    } catch (e) {
      console.error("refresh ticket failed", e);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, total: tickets.length };
    for (const t of tickets) c[t.status]++;
    return c;
  }, [tickets]);

  const resetWizard = () => {
    setFCategory("");
    setFTitle("");
    setFDescription("");
    setFAttachments([]);
    setSubmittedTicket(null);
  };

  const closeWizard = () => {
    if (submitting) return;
    setShowForm(false);
    setTimeout(resetWizard, 100);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!fCategory) {
      toast({
        title: "Pick a category",
        description: "Choose one of the categories above",
        variant: "destructive",
      });
      return;
    }
    if (!fTitle.trim() || !fDescription.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }
    if (!userId) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", fTitle.trim());
      fd.append("description", fDescription.trim());
      fd.append("category", fCategory);
      fd.append("priority", "normal");
      fd.append("submittedById", userId);
      fd.append(
        "submittedBy",
        JSON.stringify({
          id: userId,
          name: userName,
          email: userEmail,
          type: "customer",
        })
      );
      fd.append("context", JSON.stringify(captureContext("customer")));
      for (const file of fAttachments) fd.append("attachments", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to submit");
      }
      setSubmittedTicket(json.data);
      fetchTickets();
    } catch (err: any) {
      toast({
        title: "Failed to submit",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!openTicket || !userId) return;
    if (!replyText.trim() && replyAttachments.length === 0) return;
    setReplying(true);
    try {
      const fd = new FormData();
      // Customer replies are tagged "user" so the admin UI knows the source.
      fd.append("from", "user");
      fd.append("fromId", userId);
      fd.append("fromName", userName);
      fd.append("text", replyText);
      fd.append("submittedById", userId);
      for (const file of replyAttachments) fd.append("attachments", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${openTicket._id}/reply`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to reply");
      }
      setOpenTicket(json.data);
      setTickets((prev) =>
        prev.map((t) => (t._id === json.data._id ? json.data : t))
      );
      setReplyText("");
      setReplyAttachments([]);
    } catch (e: any) {
      toast({
        title: "Reply failed",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setReplying(false);
    }
  };

  // "Mine" check for thread bubble alignment — covers legacy tickets that
  // may have been migrated with from === "sp" for the same submitter.
  const isMine = (m: ThreadMsg) =>
    m.from === "user" || (m.from === "sp" && m.fromId === userId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 px-4 py-6">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Help & Support
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Report an issue with payments, subscriptions, or your account — our team will get back to you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 h-10 rounded-lg font-medium shadow-sm hover:shadow transition"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: counts.total, color: "text-gray-700" },
            { label: "Open", value: counts.open, color: "text-amber-600" },
            { label: "In Progress", value: counts.in_progress, color: "text-blue-600" },
            { label: "Resolved", value: counts.resolved, color: "text-emerald-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Ticket list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                You haven&apos;t raised any tickets yet.
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Click <span className="font-semibold">New Ticket</span> to get help from our team.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {tickets.map((t) => {
                const meta = getCategoryMeta(t.category);
                const Icon = meta.Icon;
                return (
                  <li
                    key={t._id}
                    onClick={() => openTicketFresh(t)}
                    className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition flex items-start gap-3"
                  >
                    <div className={`relative shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                      {t.spUnread && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"
                          title="New reply from Tradebox"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${t.spUnread ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-900 dark:text-white"}`}>
                          {t.title}
                        </p>
                        <span
                          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[t.status].pill}`}
                        >
                          {STATUS_META[t.status].label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {t.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                        {t.ticketNumber && (
                          <span className="font-mono font-medium text-gray-500 dark:text-gray-300">
                            {t.ticketNumber}
                          </span>
                        )}
                        {t.ticketNumber && <span>·</span>}
                        <span>
                          {meta.label}
                          {t.subCategory && t.subCategory !== "Other" && (
                            <span className="text-gray-500"> › {t.subCategory}</span>
                          )}
                        </span>
                        {t.priority && t.priority !== "normal" && (
                          <>
                            <span>·</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-medium capitalize ${PRIORITY_PILL[t.priority]}`}
                            >
                              {t.priority}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        {t.thread?.length > 0 && (
                          <>
                            <span>·</span>
                            <span>
                              {t.thread.length} repl
                              {t.thread.length === 1 ? "y" : "ies"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ============================================================
          CREATE TICKET FORM (single-screen with category chips)
      ============================================================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeWizard}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                    {submittedTicket ? "Ticket submitted" : "Raise a ticket"}
                  </h2>
                  {!submittedTicket && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      Tell us what&apos;s wrong — our team will look into it and reply soon.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeWizard}
                disabled={submitting}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!submittedTicket && (
                <div className="px-6 py-5 space-y-5">
                  {/* Section 1 — Category */}
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-gray-400">
                        What&apos;s the issue about?
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORY_KEYS.map((key) => {
                        const meta = CATEGORY_TREE[key];
                        const Icon = meta.Icon;
                        const active = fCategory === key;
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setFCategory(key)}
                            className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-[13px] font-medium transition ${
                              active
                                ? "border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${meta.color}`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="truncate flex-1">{meta.label}</span>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2 — Sub-category */}
                  {/* Section 2 — Title + Description + Screenshots */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fTitle}
                        onChange={(e) => setFTitle(e.target.value)}
                        maxLength={200}
                        placeholder="Brief summary of the issue"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                      />
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {fDescription.length}/5000
                        </span>
                      </div>
                      <textarea
                        value={fDescription}
                        onChange={(e) => setFDescription(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder="What were you trying to do? What happened? Include order id / payment id if relevant."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          Screenshots
                          <span className="text-[11px] font-normal text-gray-400">
                            (optional)
                          </span>
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {fAttachments.length}/{MAX_ATTACHMENTS} · max 5MB each
                        </span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_IMAGE_TYPES.join(",")}
                        multiple
                        hidden
                        onChange={(e) => handlePickFiles(e.target.files)}
                      />
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {previewUrls.map((url, idx) => (
                          <div
                            key={url}
                            className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`attachment-${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                              aria-label="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {fAttachments.length < MAX_ATTACHMENTS && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50/40 transition flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500"
                          >
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-[10px] font-medium">Add image</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {submittedTicket && (
                <div className="px-6 py-12 text-center space-y-5">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 flex items-center justify-center ring-4 ring-emerald-50 dark:ring-emerald-900/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Ticket submitted
                    </h3>
                    {submittedTicket.ticketNumber && (
                      <p className="mt-2 inline-block px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 font-mono text-sm text-gray-700 dark:text-gray-300">
                        {submittedTicket.ticketNumber}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      Our team will review your ticket and reply on this thread. You can track updates from here.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => resetWizard()}
                      className="px-5 h-10 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Raise another
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const t = submittedTicket;
                        setShowForm(false);
                        setTimeout(() => {
                          resetWizard();
                          openTicketFresh(t);
                        }, 100);
                      }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
                    >
                      View ticket
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!submittedTicket && (
              <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 px-6 py-3 flex items-center justify-between gap-3">
                <p className="hidden sm:block text-[11px] text-gray-400">
                  {fCategory
                    ? `Filing under ${CATEGORY_TREE[fCategory].label}`
                    : "Pick a category to continue"}
                </p>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={closeWizard}
                    disabled={submitting}
                    className="px-4 h-10 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreate()}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 h-10 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket detail drawer */}
      {openTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenTicket(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[openTicket.status].pill}`}
                  >
                    {STATUS_META[openTicket.status].label}
                  </span>
                  {openTicket.priority && openTicket.priority !== "normal" && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_PILL[openTicket.priority]}`}
                    >
                      {openTicket.priority}
                    </span>
                  )}
                  {openTicket.ticketNumber && (
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {openTicket.ticketNumber}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">
                    {getCategoryMeta(openTicket.category).label}
                    {openTicket.subCategory && openTicket.subCategory !== "Other" &&
                      ` › ${openTicket.subCategory}`}{" "}
                    · {new Date(openTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {openTicket.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenTicket(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Your report
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {openTicket.description}
                </p>
              </div>

              {openTicket.context && Object.keys(openTicket.context).length > 0 && (
                <details className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 select-none">
                    Technical details (auto-attached)
                  </summary>
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400 font-mono break-all">
                    {openTicket.context.pageUrl && (
                      <div><span className="text-gray-400">Page: </span>{openTicket.context.pageUrl}</div>
                    )}
                    {openTicket.context.route && (
                      <div><span className="text-gray-400">Route: </span>{openTicket.context.route}</div>
                    )}
                    {openTicket.context.viewport && (
                      <div><span className="text-gray-400">Viewport: </span>{openTicket.context.viewport}</div>
                    )}
                    {openTicket.context.appVersion && (
                      <div><span className="text-gray-400">App version: </span>{openTicket.context.appVersion}</div>
                    )}
                    {openTicket.context.userType && (
                      <div><span className="text-gray-400">User type: </span>{openTicket.context.userType}</div>
                    )}
                    {openTicket.context.userAgent && (
                      <div className="sm:col-span-2"><span className="text-gray-400">Browser: </span>{openTicket.context.userAgent}</div>
                    )}
                  </div>
                </details>
              )}

              {openTicket.attachments && openTicket.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Screenshots ({openTicket.attachments.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {openTicket.attachments.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="attachment"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {openTicket.thread?.length > 0 && (
                <div className="space-y-3">
                  {openTicket.thread.map((m, idx) => {
                    const mine = isMine(m);
                    return (
                      <div
                        key={m._id || idx}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            mine
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          <p className="text-[10px] font-semibold opacity-80 mb-0.5">
                            {mine ? "You" : `Tradebox · ${m.fromName}`}
                          </p>
                          {m.text && (
                            <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className={`grid ${m.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-1.5 ${m.text ? "mt-2" : ""}`}>
                              {m.attachments.map((url) => (
                                <button
                                  key={url}
                                  type="button"
                                  onClick={() => setLightboxUrl(url)}
                                  className="block aspect-square rounded-md overflow-hidden bg-black/10 hover:opacity-90 transition"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt="attachment"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          {m.createdAt && (
                            <p className="text-[10px] opacity-60 mt-1 text-right">
                              {new Date(m.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reply */}
            {openTicket.status !== "resolved" && (
              <div className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
                {replyPreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {replyPreviewUrls.map((url, idx) => (
                      <div
                        key={url}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`reply-attachment-${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeReplyAttachment(idx)}
                          className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                          aria-label="Remove attachment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(",")}
                    multiple
                    hidden
                    onChange={(e) => handlePickReplyFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    disabled={replying || replyAttachments.length >= MAX_ATTACHMENTS}
                    title={
                      replyAttachments.length >= MAX_ATTACHMENTS
                        ? `Max ${MAX_ATTACHMENTS} images per reply`
                        : "Attach screenshot"
                    }
                    className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                    aria-label="Attach image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      replyAttachments.length > 0
                        ? "Add a message (optional)…"
                        : "Type a reply…"
                    }
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={
                      replying ||
                      (!replyText.trim() && replyAttachments.length === 0)
                    }
                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 h-10 rounded-lg text-sm font-semibold"
                  >
                    {replying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </button>
                </div>
              </div>
            )}

            {openTicket.status === "resolved" && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  This ticket was marked resolved
                  {openTicket.resolvedAt
                    ? ` on ${new Date(openTicket.resolvedAt).toLocaleDateString()}`
                    : ""}
                  {openTicket.resolvedBy?.name
                    ? ` by ${openTicket.resolvedBy.name}`
                    : ""}
                  . If your issue is back, raise a new ticket.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="screenshot"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
