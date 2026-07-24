"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";

type Mode = "all-users" | "all-providers" | "specific";

export default function SendNotifications({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("specific");
  const [message, setMessage] = useState("");
  const [recipientIds, setRecipientIds] = useState("");

  useEffect(() => {
    params.then((p) => {
      const first = p.id?.[0];
      if (!first) return;
      if (first === "everyone") {
        setMode("all-users");
      } else {
        setMode("specific");
        setRecipientIds(first);
      }
    });
  }, [params]);
  const [ctaLabel, setCtaLabel] = useState("");
  const [postLink, setPostLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast({ title: "Message is required", variant: "destructive" });
      return;
    }

    let ids: string[] = [];
    let role: "user" | "provider" = "user";
    if (mode === "all-users") {
      // Backend should expand "all" — for now require explicit ids.
      // (Phase 2: support `recipientFilter: "all-users"`.)
      toast({
        title: "Specify recipient ids",
        description:
          "Bulk-to-everyone is not wired yet — paste user ids separated by commas.",
        variant: "destructive",
      });
      return;
    } else if (mode === "all-providers") {
      role = "provider";
      toast({
        title: "Specify recipient ids",
        description:
          "Bulk-to-all-providers is not wired yet — paste provider ids separated by commas.",
        variant: "destructive",
      });
      return;
    } else {
      ids = recipientIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (ids.length === 0) {
      toast({ title: "At least one recipient id is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/sendnotifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.backendToken}`,
          },
          body: JSON.stringify({
            message,
            recipientIds: ids,
            recipientRole: role,
            ctaLabel: ctaLabel || undefined,
            postLink: postLink || undefined,
          }),
        }
      );
      if (res.ok) {
        toast({ title: "Notification sent", variant: "success" });
        setMessage("");
        setCtaLabel("");
        setPostLink("");
      } else {
        toast({ title: "Failed to send", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Toaster />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold">Send Notification</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <div>
          <label className="text-sm font-medium block mb-1">Recipients</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
          >
            <option value="specific">Specific user / provider</option>
            <option value="all-users">All users</option>
            <option value="all-providers">All providers</option>
          </select>
        </div>

        {mode === "specific" && (
          <div>
            <label className="text-sm font-medium block mb-1">
              Recipient IDs (comma-separated)
            </label>
            <input
              value={recipientIds}
              onChange={(e) => setRecipientIds(e.target.value)}
              placeholder="65f1...e9, 65f2...a1"
              className="w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What do you want to say?"
            className="w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              CTA Button Label (optional)
            </label>
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Read More"
              className="w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              CTA Target Link (optional)
            </label>
            <input
              value={postLink}
              onChange={(e) => setPostLink(e.target.value)}
              placeholder="/dashboard/user/subscribedservices"
              className="w-full border rounded-md px-3 py-2 bg-white dark:bg-gray-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Sending..." : "Send Notification"}
        </button>
      </form>
    </div>
  );
}
