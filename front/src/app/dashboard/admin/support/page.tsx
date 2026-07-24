"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Bug,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  ImagePlus,
  LifeBuoy,
  Lightbulb,
  Loader2,
  MessageSquare,
  Newspaper,
  Paperclip,
  PieChart,
  Search,
  Send,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet as WalletIcon,
  X,
} from "lucide-react";

type Status = "open" | "in_progress" | "resolved";
type Priority = "urgent" | "high" | "normal" | "low";
type AdminTag = "bug" | "enhancement";

type ThreadMsg = {
  _id?: string;
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
  category: string;          // open string — matches SP-side CATEGORY_TREE keys
  subCategory?: string;
  priority?: Priority;
  context?: TicketContext;
  status: Status;
  thread: ThreadMsg[];
  attachments?: string[];
  spUnread?: boolean;
  adminUnread?: boolean;
  submittedBy: { id: string; name: string; email: string; type?: string };
  resolvedAt?: string;
  resolvedBy?: { id?: string | null; name?: string | null };
  // Admin classification — orthogonal to status.
  adminTag?: AdminTag | null;
  adminTagBy?: { id?: string | null; name?: string | null };
  adminTagAt?: string;
  createdAt: string;
  updatedAt: string;
};

// Visual mapping for the two admin-side tags. Reuse for both list pill and
// detail-modal pill so the colour stays consistent.
const TAG_META: Record<AdminTag, { label: string; pill: string }> = {
  bug: { label: "Bug", pill: "bg-rose-100 text-rose-800 border-rose-200" },
  enhancement: { label: "Enhancement", pill: "bg-amber-100 text-amber-800 border-amber-200" },
};

// Reply attachment constraints — kept in sync with the SP-side wizard so a
// user gets the same "max 5 / max 5MB / image-only" experience on either end.
const MAX_ATTACHMENTS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Mirror of the SP-side CATEGORY_TREE plus the legacy bug/feature/question
// keys, so tickets filed before the category overhaul keep rendering with
// their old icon + label instead of falling into the "Other" fallback.
type CategoryMeta = {
  label: string;
  Icon: typeof Bug;
  color: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  // New sidebar-driven categories (must match the SP wizard's keys)
  accounts:       { label: "Accounts",        Icon: WalletIcon,    color: "text-emerald-600 bg-emerald-50" },
  content:        { label: "Content",         Icon: Newspaper,     color: "text-orange-600 bg-orange-50" },
  modelportfolio: { label: "Model Portfolio", Icon: PieChart,      color: "text-cyan-600 bg-cyan-50" },
  course:         { label: "Course",          Icon: GraduationCap, color: "text-blue-600 bg-blue-50" },
  profile:        { label: "Profile",         Icon: User,          color: "text-indigo-600 bg-indigo-50" },
  recommendation: { label: "Recommendation",  Icon: TrendingUp,    color: "text-teal-600 bg-teal-50" },
  onboarding:     { label: "Onboarding",      Icon: UserPlus,      color: "text-purple-600 bg-purple-50" },
  subscriber:     { label: "Subscriber",      Icon: Users,         color: "text-violet-600 bg-violet-50" },
  other:          { label: "Other",           Icon: MessageSquare, color: "text-gray-600 bg-gray-100" },

  // Legacy keys — pre-overhaul tickets still have these in the DB
  bug:      { label: "Bug",      Icon: Bug,         color: "text-rose-600 bg-rose-50" },
  feature:  { label: "Feature",  Icon: Lightbulb,   color: "text-amber-600 bg-amber-50" },
  question: { label: "Question", Icon: HelpCircle,  color: "text-blue-600 bg-blue-50" },
};

const FALLBACK_META: CategoryMeta = {
  label: "Other",
  Icon: MessageSquare,
  color: "text-gray-600 bg-gray-100",
};

// Always go through this helper instead of indexing CATEGORY_META directly —
// otherwise an unknown `category` string would crash with "undefined is not
// an object (evaluating 'cat.Icon')".
const getCategoryMeta = (key: string | undefined): CategoryMeta =>
  (key && CATEGORY_META[key]) || FALLBACK_META;

const PRIORITY_PILL: Record<Priority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  normal: "bg-blue-100 text-blue-800",
  low: "bg-slate-100 text-slate-700",
};

const STATUS_META: Record<Status, { label: string; pill: string; Icon: typeof Clock }> = {
  open: { label: "Open", pill: "bg-amber-100 text-amber-800", Icon: Clock },
  in_progress: {
    label: "In Progress",
    pill: "bg-blue-100 text-blue-800",
    Icon: Loader2,
  },
  resolved: {
    label: "Resolved",
    pill: "bg-emerald-100 text-emerald-800",
    Icon: CheckCircle2,
  },
};

export default function AdminSupportPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const adminId = session?.user?.id || "";
  const adminName = session?.user?.RegName || session?.user?.name || "Admin";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // "all" = every ticket, "sp" = service provider tickets, "user" = customer tickets.
  // Server-side filter using submittedBy.type — see listTickets controller.
  const [submitterFilter, setSubmitterFilter] = useState<"all" | "sp" | "user">("all");
  const [search, setSearch] = useState("");

  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);
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
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  // When non-null, opens a confirmation modal asking the admin to confirm
  // they want to change the ticket to this status. Set by the "Mark as"
  // buttons; cleared by Cancel or after the API call completes.
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  // Holds the ID of the ticket whose tag is mid-API-call. Used to disable
  // and spinner-ify that specific row's tag pills without locking the rest.
  const [taggingTicketId, setTaggingTicketId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (submitterFilter !== "all") params.set("submitter", submitterFilter);
      if (search.trim()) params.set("q", search.trim());
      params.set("_", String(Date.now())); // cache-bust
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets?${params.toString()}`,
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

  // Refetch the ticket from the server when admin opens it so any SP replies
  // that arrived after the list-fetch are visible immediately. Also clears
  // the admin-unread red dot.
  const openTicketFresh = async (t: Ticket) => {
    setOpenTicket(t);

    if (t.adminUnread) {
      setTickets((prev) =>
        prev.map((x) => (x._id === t._id ? { ...x, adminUnread: false } : x))
      );
      fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${t._id}/seen`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ side: "admin" }),
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
        const merged = { ...json.data, adminUnread: false };
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
  }, [statusFilter, categoryFilter, submitterFilter]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => fetchTickets(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, total: tickets.length };
    for (const t of tickets) c[t.status]++;
    return c;
  }, [tickets]);

  const handleStatus = async (next: Status) => {
    if (!openTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${openTicket._id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: next,
            adminId,
            adminName,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed");
      }
      setOpenTicket(json.data);
      setTickets((prev) =>
        prev.map((t) => (t._id === json.data._id ? json.data : t))
      );
      toast({
        title: "Status updated",
        description: `Ticket marked ${STATUS_META[next].label}`,
      });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Classifies a ticket. Pass `tag = null` to clear the existing tag.
  // `ticketId` is passed in (instead of read from openTicket) so we can call
  // this from inline list-row controls without opening the detail modal.
  const handleTag = async (ticketId: string, tag: AdminTag | null) => {
    setTaggingTicketId(ticketId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${ticketId}/tag`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag, adminId, adminName }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "Failed");
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? json.data : t))
      );
      if (openTicket && openTicket._id === ticketId) {
        setOpenTicket(json.data);
      }
    } catch (e: any) {
      toast({
        title: "Tag failed",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setTaggingTicketId(null);
    }
  };

  const handleReply = async () => {
    if (!openTicket) return;
    if (!replyText.trim() && replyAttachments.length === 0) return;
    setReplying(true);
    try {
      // Multipart so any images attached to this reply travel up the same
      // /reply endpoint and get pushed into the thread message.
      const fd = new FormData();
      fd.append("from", "admin");
      fd.append("fromId", adminId);
      fd.append("fromName", adminName);
      fd.append("text", replyText);
      // S3 key helper namespaces uploads — for admin replies we hang them
      // under the ticket submitter's folder so all artefacts stay together.
      fd.append("submittedById", openTicket.submittedBy.id);
      for (const file of replyAttachments) fd.append("attachments", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/support/tickets/${openTicket._id}/reply`,
        { method: "POST", body: fd }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed");
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-blue-600" />
            Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tickets filed by service providers across the platform.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: counts.total, color: "text-gray-700" },
            { label: "Open", value: counts.open, color: "text-amber-600" },
            { label: "In Progress", value: counts.in_progress, color: "text-blue-600" },
            { label: "Resolved", value: counts.resolved, color: "text-emerald-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or submitter name…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={submitterFilter}
            onChange={(e) => setSubmitterFilter(e.target.value as "all" | "sp" | "user")}
            className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All submitters</option>
            <option value="sp">Service Providers</option>
            <option value="user">Customers</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All categories</option>
            {/* Current sidebar-driven categories — order matters for the
                trending-issues mental model, keep highest-traffic first. */}
            <option value="accounts">Accounts</option>
            <option value="content">Content</option>
            <option value="onboarding">Onboarding</option>
            <option value="subscriber">Subscriber</option>
            <option value="modelportfolio">Model Portfolio</option>
            <option value="course">Course</option>
            <option value="profile">Profile</option>
            <option value="recommendation">Recommendation</option>
            <option value="other">Other</option>
            {/* Legacy values still in the DB — kept so admins can filter old
                tickets without losing them. */}
            <option value="bug">Bug (legacy)</option>
            <option value="feature">Feature (legacy)</option>
            <option value="question">Question (legacy)</option>
          </select>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500">No tickets match your filters.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 hidden md:table-cell">Sub-category</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Tag</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((t) => {
                  const cat = getCategoryMeta(t.category);
                  const CatIcon = cat.Icon;
                  const filed = new Date(t.createdAt);
                  const tagging = taggingTicketId === t._id;
                  return (
                    <tr
                      key={t._id}
                      className="hover:bg-gray-50/70 transition"
                    >
                      {/* DATE */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top"
                        onClick={() => openTicketFresh(t)}
                      >
                        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">
                          {filed.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {filed.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      {/* SUBMITTER (RA or customer) */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top"
                        onClick={() => openTicketFresh(t)}
                      >
                        <div className="flex items-center gap-2">
                          {t.adminUnread && (
                            <span
                              className="shrink-0 w-2 h-2 rounded-full bg-red-500"
                              title="New activity"
                            />
                          )}
                          <p
                            className={`text-sm ${t.adminUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}
                          >
                            {t.submittedBy.name}
                          </p>
                          {/* Submitter-kind chip — "Customer" for users, "RA"
                              for everyone else (legacy tickets without a type
                              were all SP-filed, so RA is the safe default). */}
                          {(() => {
                            const isCustomer =
                              (t.submittedBy as { type?: string }).type === "customer";
                            return (
                              <span
                                className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                  isCustomer
                                    ? "bg-pink-100 text-pink-700"
                                    : "bg-indigo-100 text-indigo-700"
                                }`}
                              >
                                {isCustomer ? "Customer" : "RA"}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate max-w-[180px]">
                          {t.submittedBy.email}
                        </p>
                        {t.ticketNumber && (
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                            {t.ticketNumber}
                          </p>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top hidden sm:table-cell"
                        onClick={() => openTicketFresh(t)}
                      >
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${cat.color}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          {cat.label}
                        </span>
                      </td>

                      {/* SUB-CATEGORY */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top hidden md:table-cell"
                        onClick={() => openTicketFresh(t)}
                      >
                        <p className="text-sm text-gray-700 truncate max-w-[160px]">
                          {t.subCategory || "—"}
                        </p>
                      </td>

                      {/* DETAILS — title + first line of description */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top max-w-md"
                        onClick={() => openTicketFresh(t)}
                      >
                        <p
                          className={`text-sm ${t.adminUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"} line-clamp-1`}
                        >
                          {t.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {t.description}
                        </p>
                      </td>

                      {/* TAG — inline pills the admin can toggle */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(["bug", "enhancement"] as AdminTag[]).map((tag) => {
                            const meta = TAG_META[tag];
                            const active = t.adminTag === tag;
                            return (
                              <button
                                key={tag}
                                type="button"
                                disabled={tagging}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Click again to clear, otherwise set.
                                  handleTag(t._id, active ? null : tag);
                                }}
                                title={
                                  active
                                    ? `Click to clear "${meta.label}" tag`
                                    : `Mark as ${meta.label}`
                                }
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition ${
                                  active
                                    ? meta.pill
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                } ${tagging ? "opacity-50 cursor-wait" : ""}`}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                          {tagging && (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                          )}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td
                        className="px-4 py-3 cursor-pointer align-top hidden lg:table-cell"
                        onClick={() => openTicketFresh(t)}
                      >
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[t.status].pill}`}
                        >
                          {STATUS_META[t.status].label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {openTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenTicket(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_META[openTicket.status].pill}`}
                  >
                    {STATUS_META[openTicket.status].label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${getCategoryMeta(openTicket.category).color}`}
                  >
                    {getCategoryMeta(openTicket.category).label}
                    {openTicket.subCategory && openTicket.subCategory !== "Other" && (
                      <span className="opacity-70"> › {openTicket.subCategory}</span>
                    )}
                  </span>
                  {openTicket.priority && openTicket.priority !== "normal" && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_PILL[openTicket.priority]}`}
                    >
                      {openTicket.priority}
                    </span>
                  )}
                  {openTicket.adminTag && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TAG_META[openTicket.adminTag].pill}`}
                    >
                      {TAG_META[openTicket.adminTag].label}
                    </span>
                  )}
                  {openTicket.ticketNumber && (
                    <span className="text-[11px] font-mono text-gray-500">
                      {openTicket.ticketNumber}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">
                    Filed {new Date(openTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {openTicket.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {openTicket.submittedBy.name} · {openTicket.submittedBy.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenTicket(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Status switcher */}
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 mr-1">
                Mark as:
              </span>
              {(["open", "in_progress", "resolved"] as Status[]).map((s) => {
                const meta = STATUS_META[s];
                const active = openTicket.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => !active && setPendingStatus(s)}
                    disabled={updatingStatus || active}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${active
                        ? `${meta.pill} border-transparent cursor-default`
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
              {updatingStatus && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}

              <span className="w-px h-5 bg-gray-300 mx-1" aria-hidden />

              <span className="text-xs font-semibold text-gray-600 mr-1">
                Tag as:
              </span>
              {(["bug", "enhancement"] as AdminTag[]).map((tag) => {
                const meta = TAG_META[tag];
                const active = openTicket.adminTag === tag;
                const tagging = taggingTicketId === openTicket._id;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      handleTag(openTicket._id, active ? null : tag)
                    }
                    disabled={tagging}
                    title={
                      active
                        ? `Click to clear "${meta.label}" tag`
                        : `Mark as ${meta.label}`
                    }
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      active
                        ? `${meta.pill} cursor-default`
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                    } ${tagging ? "opacity-50 cursor-wait" : ""}`}
                  >
                    {meta.label}
                  </button>
                );
              })}
              {taggingTicketId === openTicket._id && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Original report
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {openTicket.description}
                </p>
              </div>

              {/* Auto-captured technical context. Hidden behind a <details>
                  so it stays out of the way until the admin needs it. */}
              {openTicket.context && Object.keys(openTicket.context).length > 0 && (
                <details className="rounded-lg border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 select-none">
                    Technical details (auto-captured)
                  </summary>
                  <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 font-mono break-all">
                    {openTicket.context.pageUrl && (
                      <div>
                        <span className="text-gray-400">Page: </span>
                        {openTicket.context.pageUrl}
                      </div>
                    )}
                    {openTicket.context.route && (
                      <div>
                        <span className="text-gray-400">Route: </span>
                        {openTicket.context.route}
                      </div>
                    )}
                    {openTicket.context.viewport && (
                      <div>
                        <span className="text-gray-400">Viewport: </span>
                        {openTicket.context.viewport}
                      </div>
                    )}
                    {openTicket.context.appVersion && (
                      <div>
                        <span className="text-gray-400">App: </span>
                        {openTicket.context.appVersion}
                      </div>
                    )}
                    {openTicket.context.userType && (
                      <div>
                        <span className="text-gray-400">User type: </span>
                        {openTicket.context.userType}
                      </div>
                    )}
                    {openTicket.context.userAgent && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">Browser: </span>
                        {openTicket.context.userAgent}
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Attachments — screenshots from the SP */}
              {openTicket.attachments && openTicket.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Screenshots ({openTicket.attachments.length}) — click to enlarge
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {openTicket.attachments.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightboxUrl(url)}
                        className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-blue-500 transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="screenshot"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {openTicket.thread?.length > 0 && (
                <div className="space-y-3">
                  {openTicket.thread.map((m, idx) => (
                    <div
                      key={m._id || idx}
                      className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${m.from === "admin"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        <p className="text-[10px] font-semibold opacity-80 mb-0.5">
                          {m.from === "admin"
                            ? `You · ${m.fromName}`
                            : `${m.fromName} (${m.from === "user" ? "Customer" : "RA"})`}
                        </p>
                        {m.text && (
                          <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div
                            className={`grid ${m.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-1.5 ${m.text ? "mt-2" : ""}`}
                          >
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
                  ))}
                </div>
              )}
            </div>

            {/* Reply */}
            <div className="border-t border-gray-200 p-3 space-y-2">
              {/* Selected-image previews — shown above the input row */}
              {replyPreviewUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyPreviewUrls.map((url, idx) => (
                    <div
                      key={url}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group"
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
                  className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
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
                      : "Type a reply to the SP…"
                  }
                  className="flex-1 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
      )}

      {/* ============================================================
          STATUS-CHANGE CONFIRMATION MODAL
          Triggered when the admin clicks one of the "Mark as" buttons.
          They have to confirm before the API call fires, so a stray click
          never accidentally resolves a ticket or reopens a closed one.
      ============================================================ */}
      {pendingStatus && openTicket && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !updatingStatus && setPendingStatus(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-md p-6">
            {(() => {
              const meta = STATUS_META[pendingStatus];
              const StatusIcon = meta.Icon;
              return (
                <>
                  <div
                    className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${meta.pill}`}
                  >
                    <StatusIcon
                      className={`w-6 h-6 ${pendingStatus === "in_progress" ? "animate-spin" : ""}`}
                    />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 text-center">
                    Mark ticket as {meta.label}?
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 text-center leading-relaxed">
                    {pendingStatus === "resolved"
                      ? "This will close the conversation and notify the service provider that their ticket has been resolved."
                      : pendingStatus === "in_progress"
                        ? "The service provider will be notified that you're actively working on this ticket."
                        : "Reopening this ticket — the service provider will be able to reply again."}
                  </p>
                  {openTicket.ticketNumber && (
                    <p className="mt-3 text-center font-mono text-xs text-gray-400">
                      {openTicket.ticketNumber}
                    </p>
                  )}
                </>
              );
            })()}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                disabled={updatingStatus}
                className="px-4 h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = pendingStatus;
                  await handleStatus(next);
                  // Always clear pending — handleStatus surfaces its own
                  // toast on failure, no need to leave the modal hanging.
                  setPendingStatus(null);
                }}
                disabled={updatingStatus}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 h-10 rounded-lg text-sm font-semibold shadow-sm transition"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>Yes, mark as {STATUS_META[pendingStatus].label}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for enlarged screenshot */}
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
