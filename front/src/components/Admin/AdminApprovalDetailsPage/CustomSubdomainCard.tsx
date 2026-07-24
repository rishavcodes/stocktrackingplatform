"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

type Props = {
  token: string;
  providerId: string;
  initialSubdomain?: string | null;
  initialStatus?: "pending" | "active" | "disabled";
  onSaved?: () => void;
};

type AvailabilityState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason?: string };

const STATUSES: Array<{ value: "pending" | "active" | "disabled"; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

export default function CustomSubdomainCard({
  token,
  providerId,
  initialSubdomain,
  initialStatus = "pending",
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [subdomain, setSubdomain] = useState(initialSubdomain ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [availability, setAvailability] = useState<AvailabilityState>({ state: "idle" });

  useEffect(() => {
    setSubdomain(initialSubdomain ?? "");
    setStatus(initialStatus);
  }, [initialSubdomain, initialStatus, isOpen]);

  useEffect(() => {
    const trimmed = subdomain.trim().toLowerCase();
    if (!trimmed || trimmed === (initialSubdomain ?? "")) {
      setAvailability({ state: "idle" });
      return;
    }
    setAvailability({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/sp-subdomain-available?sub=${encodeURIComponent(trimmed)}`
        );
        const json = await res.json();
        if (json?.available) {
          setAvailability({ state: "available" });
        } else {
          setAvailability({ state: "unavailable", reason: json?.reason });
        }
      } catch {
        setAvailability({ state: "idle" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [subdomain, initialSubdomain]);

  const handleSubmit = async () => {
    const trimmed = subdomain.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/provider-custom-subdomain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: providerId,
            subdomain: trimmed === "" ? null : trimmed,
            status,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update subdomain");
      }
      toast({
        title: "Custom subdomain updated",
        description: trimmed
          ? `https://${trimmed}.tradeboxlive.com/dashboard (${status})`
          : "Subdomain cleared",
      });
      if (Array.isArray(data?.warnings) && data.warnings.length) {
        toast({
          title: "Vercel sync warnings",
          description: data.warnings.join(" · "),
          variant: "destructive",
        });
      }
      setIsOpen(false);
      onSaved?.();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not save subdomain",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const previewHost = subdomain.trim().toLowerCase() || "your-brand";

  return (
    <>
      <Toaster />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
            <GlobeIcon className="w-4 h-4 mr-2" />
            Custom Subdomain
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md w-full p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Custom Subdomain</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subdomain</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="flex-1 border rounded-md p-2 text-sm"
                  placeholder="acmecapital"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <span className="text-sm text-gray-500">.tradeboxlive.com</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Preview: https://{previewHost}.tradeboxlive.com/dashboard
              </div>
              <div className="mt-1 text-xs">
                {availability.state === "checking" && (
                  <span className="text-gray-500">Checking availability…</span>
                )}
                {availability.state === "available" && (
                  <span className="text-emerald-600">Available</span>
                )}
                {availability.state === "unavailable" && (
                  <span className="text-red-600">
                    {availability.reason === "invalid_or_reserved"
                      ? "Invalid or reserved subdomain"
                      : "Already taken"}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full border rounded-md p-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only “Active” subdomains resolve in production.
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Leave the field empty and save to clear the subdomain.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                availability.state === "checking" ||
                availability.state === "unavailable"
              }
              className="bg-emerald-600 text-white"
            >
              {loading ? (
                "Saving…"
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" /> Save
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
