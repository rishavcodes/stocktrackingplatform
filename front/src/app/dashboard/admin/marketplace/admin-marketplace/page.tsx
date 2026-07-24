"use client";

import { useState, useMemo, useCallback, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ArrowUpDown,
  Store,
  Users,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DropdownOption } from "@/components/ui/multi-select-dropdown-search";
import { MultiSelectDropdownSearch } from "@/components/ui/multi-select-dropdown-search";
import { useToast } from "@/hooks/use-toast";

type MarketplaceItem = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  broker: { name: string; email?: string; profileUrl?: string };
  activeRAsCount: number;
  createdAt: string;
  updatedAt?: string;
  createdByBrokerId?: string;
};

interface RAInvitation {
  raId: { _id: string; name?: string; RegName?: string; companyName?: string; email?: string };
  status: string;
}

interface MarketplaceDetail {
  _id: string;
  name: string;
  description?: string;
  invitations: RAInvitation[];
  activeRaIds: Array<{ _id: string; name?: string; RegName?: string; companyName?: string; email?: string }>;
}

type SortKey = "name" | "activeRAs" | "createdAt";
type SortDir = "asc" | "desc";

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminMarketplacePage() {
  const nameId = useId();
  const descId = useId();
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.backendToken ?? "";
  const { toast } = useToast();

  const [marketplaces, setMarketplaces] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [marketplaceToDelete, setMarketplaceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMarketplace, setEditingMarketplace] = useState<MarketplaceDetail | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", description: "" });
  const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [raOptions, setRaOptions] = useState<DropdownOption[]>([]);
  const [isLoadingRa, setIsLoadingRa] = useState(false);
  const [currentRAs, setCurrentRAs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedNewRaIds, setSelectedNewRaIds] = useState<string[]>([]);
  const [removedRaIds, setRemovedRaIds] = useState<string[]>([]);

  const fetchMarketplaces = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/showallmarketplace?page=1&limit=500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await res.json();
      if (result.success) setMarketplaces(result.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMarketplaces(); }, [fetchMarketplaces]);

  const fetchServiceProviders = useCallback(async (q: string = "") => {
    setIsLoadingRa(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50", ...(q && { search: q }) });
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/serviceproviders?${params}`);
      const result = await res.json();
      if (result.success && result.data?.serviceProviders) {
        setRaOptions(result.data.serviceProviders.map((p: any) => ({ value: p.id, label: p.name || p.RegName || p.companyName || "Unknown" })));
      }
    } catch { setRaOptions([]); }
    finally { setIsLoadingRa(false); }
  }, []);

  const fetchMarketplaceDetails = async (marketplaceId: string) => {
    setIsLoadingMarketplace(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (result.success) {
        setEditingMarketplace(result.data);
        setEditFormData({ name: result.data.name || "", description: result.data.description || "" });
        const allRAs = result.data.invitations
          .filter((inv: RAInvitation) => inv.status !== "revoked")
          .map((inv: RAInvitation) => ({ id: inv.raId._id, name: inv.raId.name || inv.raId.RegName || inv.raId.companyName || "Unknown" }));
        setCurrentRAs(allRAs);
        setSelectedNewRaIds([]);
        setRemovedRaIds([]);
      }
    } catch { toast({ title: "Error", description: "Failed to load marketplace details", variant: "destructive" }); }
    finally { setIsLoadingMarketplace(false); }
  };

  const handleEdit = async (marketplaceId: string) => {
    setEditDialogOpen(true);
    await fetchMarketplaceDetails(marketplaceId);
    await fetchServiceProviders();
  };

  const handleUpdateMarketplace = async () => {
    if (!editingMarketplace) return;
    setIsUpdating(true);
    try {
      const payload: any = {};
      if (editFormData.name !== editingMarketplace.name) payload.name = editFormData.name.trim();
      if (editFormData.description !== (editingMarketplace.description ?? "")) payload.description = editFormData.description.trim();
      if (removedRaIds.length > 0) payload.removeRaIds = removedRaIds;
      if (selectedNewRaIds.length > 0) payload.invitedRaIds = selectedNewRaIds;
      if (Object.keys(payload).length === 0) {
        toast({ title: "No changes", description: "No changes were made to the marketplace" });
        setEditDialogOpen(false);
        return;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${editingMarketplace._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to update");
      toast({ title: "Success", description: "Marketplace updated successfully" });
      fetchMarketplaces();
      setEditDialogOpen(false);
    } catch (e: any) { toast({ title: "Error", description: e.message ?? "Failed to update marketplace", variant: "destructive" }); }
    finally { setIsUpdating(false); }
  };

  const confirmDelete = async () => {
    if (!marketplaceToDelete || !token) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deletemarketplaceId/${marketplaceToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete");
      toast({ title: "Success", description: "Marketplace deleted successfully" });
      fetchMarketplaces();
    } catch (e: any) { toast({ title: "Error", description: e.message ?? "Failed to delete marketplace", variant: "destructive" }); }
    finally { setIsDeleting(false); setDeleteDialogOpen(false); setMarketplaceToDelete(null); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...marketplaces]
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.slug ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name": aVal = a.name; bVal = b.name; break;
          case "activeRAs": aVal = a.activeRAsCount ?? 0; bVal = b.activeRAsCount ?? 0; break;
          default: aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      });
  }, [marketplaces, search, sortKey, sortDir]);

  const totalActiveRAs = useMemo(() => marketplaces.reduce((s, m) => s + (m.activeRAsCount ?? 0), 0), [marketplaces]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const handleExport = useCallback(() => {
    const rows = filtered.map((m) => ({ Name: m.name, Slug: m.slug, "Active RAs": m.activeRAsCount, "Created At": fmt(m.createdAt) }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admin Marketplaces");
    XLSX.writeFile(wb, `AdminMarketplaces_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap" onClick={() => toggleSort(field)}>
        <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-indigo-600" : "text-gray-300"}`} /></span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading admin marketplaces…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Store className="w-4 h-4 text-indigo-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Marketplace</h1>
          <p className="text-sm text-gray-500">Marketplaces created by admin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Admin Marketplaces" value={marketplaces.length} icon={Store} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Total Active RAs" value={totalActiveRAs} sub="across admin marketplaces" icon={Users} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name or slug…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />{filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">{marketplaces.length === 0 ? "No admin marketplaces yet" : "No marketplaces match your search"}</p>
          {search && <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-600 hover:underline">Clear search</button>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Name" field="name" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Slug</th>
                  <SortableHeader label="Active RAs" field="activeRAs" />
                  <SortableHeader label="Created" field="createdAt" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 max-w-[250px] cursor-pointer" onClick={() => router.push(`/dashboard/admin/marketplace/admin-marketplace/${m.id}`)}>
                      <div className="font-medium text-sm text-indigo-700 truncate hover:underline">{m.name}</div>
                      {m.description && <div className="text-xs text-gray-400 truncate">{m.description}</div>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{m.slug}</span></td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500" /><span className="text-sm font-medium text-gray-900">{m.activeRAsCount ?? 0}</span></div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap"><span className="text-xs text-gray-600">{fmt(m.createdAt)}</span></td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(m.id); }} className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setMarketplaceToDelete({ id: m.id, name: m.name }); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/admin/marketplace/admin-marketplace/${m.id}`)}>
                  <h3 className="text-sm font-semibold text-indigo-700 truncate hover:underline">{m.name}</h3>
                  <p className="font-mono text-xs text-gray-400">{m.slug}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => handleEdit(m.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setMarketplaceToDelete({ id: m.id, name: m.name }); setDeleteDialogOpen(true); }} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><span className="text-gray-400 block">Active RAs</span><span className="text-gray-800 font-medium">{m.activeRAsCount ?? 0}</span></div>
                <div><span className="text-gray-400 block">Created</span><span className="text-gray-800 font-medium">{fmt(m.createdAt)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Marketplace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{marketplaceToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Marketplace</DialogTitle>
            <DialogDescription>Update marketplace details and manage RA providers</DialogDescription>
          </DialogHeader>
          {isLoadingMarketplace ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={nameId}>Name</Label>
                <Input id={nameId} value={editFormData.name} onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))} maxLength={120} />
                <p className="text-xs text-gray-500">{editFormData.name.length}/120</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={descId}>Description</Label>
                <Textarea id={descId} value={editFormData.description} onChange={(e) => setEditFormData((p) => ({ ...p, description: e.target.value }))} rows={3} maxLength={500} />
                <p className="text-xs text-gray-500">{editFormData.description.length}/500</p>
              </div>
              {currentRAs.length > 0 && (
                <div className="space-y-2">
                  <Label>Current RA Providers</Label>
                  <div className="flex flex-wrap gap-2">
                    {currentRAs.map((ra) => (
                      <span key={ra.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                        {ra.name}
                        <button onClick={() => { setRemovedRaIds((p) => [...p, ra.id]); setCurrentRAs((p) => p.filter((r) => r.id !== ra.id)); }} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Add New RA Providers</Label>
                <MultiSelectDropdownSearch
                  options={raOptions.filter((o) => !currentRAs.some((r) => r.id === o.value))}
                  value={selectedNewRaIds}
                  onChange={setSelectedNewRaIds}
                  placeholder="Search and select RA providers"
                  searchPlaceholder="Search RA providers..."
                  emptyMessage="No RA providers found"
                  onSearchChange={(q) => fetchServiceProviders(q)}
                  isLoading={isLoadingRa}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdateMarketplace} disabled={isUpdating || isLoadingMarketplace}>
              {isUpdating ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
