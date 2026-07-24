"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { checkCvlKra, CvlKraResult, CvlKraAddress } from "@/lib/api/cvlKra";

/** Tailwind classes for the status badge, keyed off the mapped status label. */
function statusBadgeClass(label: string): string {
  const l = (label || "").toLowerCase();
  if (l.includes("verified") || l.includes("validated") || l.includes("registered"))
    return "bg-green-100 text-green-700 border-green-200";
  if (l.includes("submitted") || l.includes("hold"))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (l.includes("rejected") || l.includes("invalid") || l.includes("deactivated"))
    return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function formatAddress(a?: CvlKraAddress): string {
  if (!a) return "—";
  const parts = [
    a.line1,
    a.line2,
    a.line3,
    a.city,
    a.pincode,
    a.state ? `State ${a.state}` : "",
    a.country ? `Country ${a.country}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value?.trim() || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

export default function CheckCvlKraButton({
  subscriberId,
}: {
  subscriberId: string;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CvlKraResult | null>(null);

  const handleCheck = async () => {
    const token = session?.backendToken;
    if (!token) {
      toast({
        title: "Not authenticated",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const data = await checkCvlKra(subscriberId, token);
      setResult(data);
      setOpen(true);
    } catch (e) {
      toast({
        title: "CVL KRA check failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleCheck}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        {loading ? "Checking…" : "Check CVL KRA"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CVL KRA — KYC Record</DialogTitle>
            <DialogDescription>
              KYC details fetched from CVL KRA for this subscriber.
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusBadgeClass(result.statusLabel)}>
                  {result.statusLabel || "Unknown"}
                </Badge>
                {result.kraName && (
                  <Badge variant="outline">{result.kraName}</Badge>
                )}
                {result.appStatusDt && (
                  <span className="text-xs text-muted-foreground">
                    as of {result.appStatusDt}
                  </span>
                )}
              </div>

              <Section title="Identity">
                <Field label="Name" value={result.identity?.name} />
                <Field
                  label="Father / Spouse"
                  value={result.identity?.fatherOrSpouseName}
                />
                <Field label="Gender" value={result.identity?.gender} />
                <Field label="Date of Birth" value={result.identity?.dob} />
                <Field label="PAN" value={result.identity?.pan} />
                <Field label="KYC Mode" value={result.other?.kycMode} />
              </Section>

              <Section title="Contact">
                <Field label="Email" value={result.contact?.email} />
                <Field label="Mobile" value={result.contact?.mobile} />
              </Section>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Address
                </h4>
                <Field
                  label="Correspondence"
                  value={formatAddress(result.correspondenceAddress)}
                />
                <Field
                  label="Permanent"
                  value={formatAddress(result.permanentAddress)}
                />
              </div>

              <Section title="FATCA">
                <Field
                  label="Applicable"
                  value={result.fatcaApplicable || "—"}
                />
                <Field
                  label="Country of Residence"
                  value={result.fatca?.APP_FATCA_COUNTRY_RES}
                />
                <Field
                  label="Birth Country"
                  value={result.fatca?.APP_FATCA_BIRTH_COUNTRY}
                />
                <Field
                  label="Tax ID"
                  value={result.fatca?.APP_FATCA_TAX_IDENTIFICATION_NO}
                />
              </Section>

              {(result.errorCode || result.other?.errorDesc) && (
                <p className="text-xs text-amber-600">
                  {result.errorCode} {result.errorMessage || result.other?.errorDesc}
                </p>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
