"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { DropdownOption } from "@/components/ui/multi-select-dropdown-search";
import { MultiSelectDropdownSearch } from "@/components/ui/multi-select-dropdown-search";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Loader2,
  RotateCcw,
  Store,
  Users,
} from "lucide-react";

interface MarketplaceFormData {
  name: string;
  description: string;
  invitedRaIds: string[];
}

const initialFormData: MarketplaceFormData = {
  name: "",
  description: "",
  invitedRaIds: [],
};

export default function CreateMarketplacePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [formData, setFormData] = useState<MarketplaceFormData>({ ...initialFormData });
  const [errors, setErrors] = useState<Partial<Record<keyof MarketplaceFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [raOptions, setRaOptions] = useState<DropdownOption[]>([]);
  const [isLoadingRa, setIsLoadingRa] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MarketplaceFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = "Marketplace name is required";
    else if (formData.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
    else if (formData.name.trim().length > 120) newErrors.name = "Name cannot exceed 120 characters";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    else if (formData.description.trim().length < 10) newErrors.description = "Description must be at least 10 characters";
    else if (formData.description.length > 500) newErrors.description = "Description cannot exceed 500 characters";
    if (formData.invitedRaIds.length === 0) newErrors.invitedRaIds = "Please select at least one RA provider";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/createMPadmin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user.backendToken!}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim(),
            invitedRaIds: formData.invitedRaIds,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        const msgs: Record<number, string> = {
          401: "Please log in to create a marketplace",
          403: result.message || "Only admins can create marketplaces",
          409: result.message || "A marketplace with this name already exists",
          400: result.message || "Please check your input and try again",
        };
        toast({ variant: "destructive", title: "Error", description: msgs[response.status] ?? result.message ?? "Failed to create marketplace" });
        return;
      }
      toast({ title: "Success!", description: "Marketplace created successfully" });
      router.push("/dashboard/admin/marketplace/admin-marketplace");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Failed to create marketplace" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof MarketplaceFormData]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleRaSelectionChange = (selectedIds: string[]) => {
    setFormData((prev) => ({ ...prev, invitedRaIds: selectedIds }));
    if (errors.invitedRaIds && selectedIds.length > 0) setErrors((prev) => ({ ...prev, invitedRaIds: undefined }));
  };

  const fetchServiceProviders = useCallback(async (search: string = "") => {
    setIsLoadingRa(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50", ...(search && { search }) });
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/serviceproviders?${params}`);
      const result = await response.json();
      if (result.success && result.data?.serviceProviders) {
        setRaOptions(
          result.data.serviceProviders.map((p: any) => ({
            value: p.id,
            label: p.name || p.RegName || p.companyName || "Unknown",
          }))
        );
      }
    } catch { setRaOptions([]); }
    finally { setIsLoadingRa(false); }
  }, []);

  useEffect(() => { fetchServiceProviders(); }, [fetchServiceProviders]);

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setErrors({});
  };

  const SectionTitle = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-indigo-50"><Icon className="h-4 w-4 text-indigo-600" /></div>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{label}</h3>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Store className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Marketplace</h1>
          <p className="text-sm text-gray-500">Create a new marketplace and invite RA providers to join</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <SectionTitle icon={FileText} label="General Information" />
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Marketplace Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter marketplace name"
                maxLength={120}
                className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all ${
                  errors.name ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.name ? (
                  <p className="text-xs text-red-500">{errors.name}</p>
                ) : <span />}
                <p className="text-xs text-gray-400">{formData.name.length}/120</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter marketplace description (minimum 10 characters)"
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none ${
                  errors.description ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : <span />}
                <p className="text-xs text-gray-400">{formData.description.length}/500</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite RAs Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <SectionTitle icon={Users} label="Invite RA Providers" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select RA Providers <span className="text-red-500">*</span>
            </label>
            <MultiSelectDropdownSearch
              options={raOptions}
              value={formData.invitedRaIds}
              onChange={handleRaSelectionChange}
              placeholder="Search and select RA providers"
              searchPlaceholder="Search RA providers..."
              emptyMessage="No RA providers found"
              onSearchChange={(q) => fetchServiceProviders(q)}
              isLoading={isLoadingRa}
            />
            <div className="flex items-center justify-between mt-1.5">
              {errors.invitedRaIds ? (
                <p className="text-xs text-red-500">{errors.invitedRaIds}</p>
              ) : <span />}
              {formData.invitedRaIds.length > 0 && (
                <p className="text-xs text-gray-500">
                  {formData.invitedRaIds.length} provider{formData.invitedRaIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
            ) : (
              "Create Marketplace"
            )}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
