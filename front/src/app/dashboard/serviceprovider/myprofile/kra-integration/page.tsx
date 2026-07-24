"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, ShieldCheck, PlugZap, CheckCircle2 } from "lucide-react";
import { Input } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  getCvlKraCredentials,
  saveCvlKraCredentials,
  testCvlKraConnection,
  type CvlKraCredentialMeta,
} from "@/lib/api/cvlKraCredentials";

type FormState = {
  username: string;
  posCode: string;
  environment: "uat" | "live";
  fetchType: "E" | "I" | "X";
  apiKey: string;
  password: string;
  aesKey: string;
};

const EMPTY: FormState = {
  username: "",
  posCode: "",
  environment: "uat",
  fetchType: "E",
  apiKey: "",
  password: "",
  aesKey: "",
};

export default function KraIntegrationPage() {
  const { data: session } = useSession();
  const token = session?.backendToken;
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [meta, setMeta] = useState<CvlKraCredentialMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});

  // Load existing credential metadata (no secret values are returned).
  useEffect(() => {
    if (!token) return;
    let active = true;
    getCvlKraCredentials(token)
      .then((data) => {
        if (!active) return;
        setMeta(data);
        if (data.configured) {
          setForm((prev) => ({
            ...prev,
            username: data.username || "",
            posCode: data.posCode || "",
            environment: data.environment || "uat",
            fetchType: data.fetchType || "E",
          }));
        }
      })
      .catch(() => {
        /* first-time setup: nothing saved yet */
      });
  }, [token]);

  const configured = meta?.configured ?? false;

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggle(key: string) {
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveCvlKraCredentials(
        {
          username: form.username,
          posCode: form.posCode,
          environment: form.environment,
          fetchType: form.fetchType,
          // Send secrets only when entered; blank keeps the stored value.
          ...(form.apiKey ? { apiKey: form.apiKey } : {}),
          ...(form.password ? { password: form.password } : {}),
          ...(form.aesKey ? { aesKey: form.aesKey } : {}),
        },
        token,
      );
      toast({ title: "Saved", description: "CVL KRA credentials saved." });
      // Clear secret inputs + refresh metadata.
      setForm((prev) => ({ ...prev, apiKey: "", password: "", aesKey: "" }));
      const data = await getCvlKraCredentials(token);
      setMeta(data);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const r = await testCvlKraConnection(token);
      toast({
        title: r.success ? "Connection successful" : "Connection failed",
        description: r.message,
        variant: r.success ? "default" : "destructive",
      });
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  }

  const secretField = (
    key: "apiKey" | "password" | "aesKey",
    label: string,
    configuredFlag?: boolean,
  ) => (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {!configured && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <button
          type="button"
          onClick={() => toggle(key)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={`Toggle ${label} visibility`}
        >
          {show[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <input
        type={show[key] ? "text" : "password"}
        name={key}
        value={form[key]}
        onChange={handleChange}
        placeholder={
          configuredFlag ? "Configured — leave blank to keep current" : ""
        }
        autoComplete="off"
        className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <Toaster />

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">CVL KRA Integration</h2>
          <p className="text-sm text-muted-foreground">
            Save your own CVL KRA API credentials. Used when you fetch a
            subscriber&apos;s KYC.
          </p>
        </div>
        {configured && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Configured
          </span>
        )}
      </div>

      <form
        onSubmit={handleSave}
        className="mt-5 space-y-5 rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            title="Username"
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
          <Input
            title="POS Code"
            type="text"
            name="posCode"
            value={form.posCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {secretField("apiKey", "API Key", meta?.hasApiKey)}
          {secretField("password", "Password", meta?.hasPassword)}
          {secretField("aesKey", "AES Key (base64URL)", meta?.hasAesKey)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col w-full">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Environment
            </label>
            <select
              name="environment"
              value={form.environment}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="uat">UAT (testing)</option>
              <option value="live">Live (production)</option>
            </select>
          </div>
          <div className="flex flex-col w-full">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fetch Type
            </label>
            <select
              name="fetchType"
              value={form.fetchType}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="E">Data only (E)</option>
              <option value="I">Data + images (I)</option>
              <option value="X">Images only (X)</option>
            </select>
          </div>
        </div>

        {/* IP whitelisting note */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3 text-xs text-amber-700 dark:text-amber-300">
          Your CVL KRA account must whitelist this server&apos;s outbound IP, or
          requests will be rejected. Use the <strong>Test connection</strong>{" "}
          button below to verify your credentials and whitelisting.
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !configured}
            title={!configured ? "Save credentials first" : "Test connection"}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlugZap className="w-4 h-4" />
            )}
            Test connection
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {configured ? "Update credentials" : "Save credentials"}
          </button>
        </div>
      </form>
    </div>
  );
}
