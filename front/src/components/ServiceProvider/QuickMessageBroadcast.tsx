"use client";

/**
 * QuickMessageBroadcast
 *
 * Reusable card-section for an SP to type a message and broadcast it to one
 * or more of their plans' Telegram channels.
 *
 * Used in two places:
 *   - the standalone /quickmessage page
 *   - inline below the "Create Recommendation" form, so the RA can post a
 *     companion note to subscribers immediately after creating a trade.
 *
 * Layout: textarea on the left, plan picker on the right, both in one
 * horizontal row on lg+ screens, stacked on mobile.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import {
  ImagePlus,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";

type Plan = {
  _id: string;
  title: string;
  telegramChannelId?: string | null;
  activated?: boolean;
};

type BroadcastResult = {
  success: boolean;
  message?: string;
  sent: { planId: string; title: string; channelId: string }[];
  notified?: { planId: string; title: string }[];
  skipped: { planId: string; reason: string }[];
};

const MAX_LEN = 4000;
// Capped at Telegram's caption length when an image is attached so the
// caption isn't silently truncated downstream.
const MAX_LEN_WITH_IMAGE = 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export default function QuickMessageBroadcast() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const spId = session?.user?.id;
  const backendToken = (session as { backendToken?: string } | undefined)
    ?.backendToken;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Optional single-image attachment. Gets sent as a photo to each plan's
  // Telegram channel AND stored on the in-app notification doc so the bell
  // dropdown / notifications page can render a thumbnail. Preview URL is
  // managed alongside so we can revoke it on unmount/replace.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  // Highlights the composer while an image file is dragged over it.
  const [dragActive, setDragActive] = useState(false);

  // Revoke any preview URL when the file changes or component unmounts to
  // avoid leaking the blob URL.
  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Single validation + accept path, shared by the file picker, clipboard
  // paste, and drag-drop. Replaces any currently-attached image (single-image
  // feature) and surfaces a toast on the two failure modes.
  const acceptImageFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Pick a JPG, PNG, GIF, or WEBP image.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "File too large",
        description: "Image must be under 5MB.",
        variant: "destructive",
      });
      return;
    }
    setImageFile(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handlePickImage = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    acceptImageFile(files[0]);
  };

  // Paste a screenshot / copied image straight into the composer, WhatsApp-Web
  // style. We only intercept when the clipboard actually carries an image —
  // otherwise the event is left alone so normal text paste still works.
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          acceptImageFile(file);
        }
        return;
      }
    }
  };

  // Drop an image file from the desktop / file explorer onto the composer.
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Cap depends on whether an image is attached — Telegram captions are
  // limited to ~1024 chars vs 4096 for text-only messages.
  const effectiveMaxLen = imageFile ? MAX_LEN_WITH_IMAGE : MAX_LEN;

  // Pull the SP's own plans. We filter client-side to only those with a
  // Telegram channel configured — no point letting the RA pick a plan we
  // can't deliver to.
  useEffect(() => {
    if (!spId) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    (async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/allservices?id=${spId}`,
          { signal: ac.signal, cache: "no-store" },
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data?.data)) {
          setPlans(data.data as Plan[]);
        }
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          console.error("fetch plans failed", err);
        }
      } finally {
        setLoadingPlans(false);
      }
    })();
    return () => ac.abort();
  }, [spId]);

  const eligiblePlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Show ALL plans. Plans with a Telegram channel get the Telegram broadcast;
    // plans without one deliver to their subscribers via in-app + push instead.
    return plans.filter((p) => (q ? p.title.toLowerCase().includes(q) : true));
  }, [plans, search]);

  const allSelected =
    eligiblePlans.length > 0 &&
    eligiblePlans.every((p) => selectedIds.includes(p._id));

  const toggleOne = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !eligiblePlans.some((p) => p._id === id)),
      );
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...eligiblePlans.map((p) => p._id)])),
      );
    }
  };

  const handleSend = async () => {
    if (sending) return;
    const trimmed = message.trim();
    // Either a message OR an image (or both) is required — photo-only
    // broadcasts are valid; pure-empty is not.
    if (!trimmed && !imageFile) {
      toast({
        title: "Add a message or image first",
        variant: "destructive",
      });
      return;
    }
    if (selectedIds.length === 0) {
      toast({ title: "Pick at least one plan", variant: "destructive" });
      return;
    }
    if (!backendToken) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Multipart submit so we can attach the optional image. Don't set
      // Content-Type manually — the browser fills in the multipart boundary.
      const fd = new FormData();
      fd.append("message", trimmed);
      fd.append("planIds", JSON.stringify(selectedIds));
      if (imageFile) fd.append("image", imageFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/quickmessage`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${backendToken}`,
          },
          body: fd,
        },
      );
      const data = (await res.json()) as BroadcastResult;
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Send failed");
      }
      // Clear inputs only on a fully clean run — keep them populated when some
      // channels skipped so the RA can retry.
      if (data.skipped.length === 0) {
        setMessage("");
        setSelectedIds([]);
        // Drop the image only on a fully clean run too, so the RA can
        // retry the same broadcast with the same attachment.
        setImageFile(null);
      }
      toast({
        title: data.message || "Sent",
        description:
          data.skipped.length > 0
            ? `${data.skipped.length} plan(s) skipped — check those plans.`
            : "All selected plans were delivered.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Quick Message
        </h2>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          Broadcast to your plans — via Telegram channel, or push notification if none.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* LEFT — Composer */}
        <div className="lg:col-span-3 flex flex-col">
          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          {/* Unified composer — type text and/or paste / drop / browse a
              single image, WhatsApp-Web style. The bordered wrapper owns the
              focus ring and drag highlight; the textarea inside is borderless. */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-xl border bg-white dark:bg-gray-800 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 ${
              dragActive
                ? "border-blue-500 ring-4 ring-blue-500/10"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              hidden
              onChange={(e) => handlePickImage(e.target.files)}
            />

            {/* Attached-image preview sits above the caption, like WhatsApp. */}
            {imageFile && (
              <div className="px-3.5 pt-3">
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt={imageFile.name}
                    className="max-h-40 rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-md"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="mt-1 text-[11px] text-gray-500 truncate max-w-[200px]">
                    {imageFile.name}
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              maxLength={effectiveMaxLen}
              rows={6}
              placeholder={
                imageFile
                  ? "Type a caption (optional)…"
                  : "Type a message — or paste / drop a screenshot…"
              }
              className="w-full px-3.5 py-2.5 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none resize-y"
            />

            {/* Footer: inline attach (browse) button + character counter. */}
            <div className="flex items-center justify-between px-3.5 pb-2.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition"
                title="Attach image"
                aria-label="Attach image"
              >
                <ImagePlus className="w-4 h-4" />
                {imageFile ? "Replace image" : "Attach image"}
              </button>
              <span className="text-[11px] text-gray-400">
                {message.length}/{effectiveMaxLen}
              </span>
            </div>
          </div>

          {/* Helper hint */}
          <div className="mt-1 text-[11px] text-gray-400">
            {imageFile
              ? "Caption max 1000 chars (Telegram limit)"
              : "Paste or drop a screenshot, or click attach · HTML basic tags supported (b, i, a)"}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={
              sending ||
              (!message.trim() && !imageFile) ||
              selectedIds.length === 0
            }
            className="mt-4 inline-flex w-fit items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 h-10 rounded-xl font-semibold shadow-sm hover:shadow transition"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Broadcast to {selectedIds.length || 0} channel
                {selectedIds.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>

        {/* RIGHT — Plan picker */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Select plans
            </h3>
            {selectedIds.length > 0 && (
              <span className="text-[11px] text-gray-500">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plans…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {loadingPlans ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : eligiblePlans.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Sparkles className="w-8 h-8 text-gray-300" />
              <p className="text-xs text-gray-500 mt-2">
                {plans.length === 0
                  ? "No plans yet."
                  : "No plans match your search."}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 max-w-[220px]">
                Plans with a Telegram channel send there; the rest notify
                subscribers via push.
              </p>
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Select all
                </span>
                {eligiblePlans.length > 3 && (
                  <span className="ml-auto text-[10px] text-gray-400 italic">
                    Scroll to see more
                  </span>
                )}
              </label>
              <div className="max-h-[140px] overflow-y-auto space-y-1 -mx-2 px-2">
                {eligiblePlans.map((p) => {
                  const checked = selectedIds.includes(p._id);
                  return (
                    <label
                      key={p._id}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition ${
                        checked
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(p._id)}
                        className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-900 dark:text-gray-100 truncate flex-1">
                        {p.title}
                      </span>
                      {!p.telegramChannelId && (
                        <span
                          title="No Telegram channel — subscribers get an in-app + push notification instead"
                          className="text-[9px] uppercase font-semibold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded"
                        >
                          Push
                        </span>
                      )}
                      {p.activated === false && (
                        <span className="text-[9px] uppercase font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
