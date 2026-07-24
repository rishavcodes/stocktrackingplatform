"use client";

import React from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Image from "next/image";
import { use } from "react";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Hash,
  Info,
  Layers,
  Package,
  PieChart,
  Store,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

type InvitationItem = {
  raId: string;
  status: string;
  invitedAt?: string;
  respondedAt?: string;
  note?: string;
};
type RAItem = { _id: string; name: string; email?: string; number?: string; profileUrl?: string };
type ServiceItem = { _id: string; title: string; segment?: string; serviceType?: string; subscribedBy?: string[]; price?: number; authorData?: { name: string }; createdAt: string };
type PackageItem = { _id: string; title: string; description?: string; pricingPlans?: { price: number; validity: number }[]; stats?: { purchases: number }; authorData?: { name: string }; createdAt: string };
type PortfolioItem = { _id: string; portfolioName: string; theme?: string; riskLevel?: string; subscribedBy?: string[]; authorData?: { name: string }; minimumInvestment?: number; createdAt: string };
type EventItem = { _id: string; title: string; eventDate?: string; eventMode?: string; authorData?: { name: string }; NoOfRegistration?: number; createdAt: string };
type ArticleItem = { _id: string; title: string; description?: string; authorData?: { name: string }; createdAt: string };
type CreatorItem = { _id: string; name: string; email?: string; number?: string; profileUrl?: string };
type MarketplaceData = {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  brokerSnapshot: { name: string; email?: string; profileUrl?: string };
  invitations: InvitationItem[];
  activeRaIds: string[];
  revokedRaIds?: string[];
  status: string;
  createdByBrokerId?: string;
  createdAt: string;
  updatedAt?: string;
};
type ApiResponse = {
  success: boolean;
  marketplace: MarketplaceData;
  services: ServiceItem[];
  packages: PackageItem[];
  portfolios: PortfolioItem[];
  events: EventItem[];
  articles: ArticleItem[];
  activeRAs: RAItem[];
  creator: CreatorItem | null;
};

function fmt(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCurrency(n?: number): string {
  if (n == null || isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-3.5 h-3.5" /></div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, color = "text-indigo-500" }: { icon: React.ElementType; title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const fetcher = ([url, token]: [string, string]) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const token = session.data?.backendToken ?? "";

  const { data, error } = useSWR<ApiResponse>(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/marketplacedetails/${id}`, token] : null,
    fetcher
  );

  const mp = data?.marketplace ?? null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Failed to Load Marketplace</h3>
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    );
  }
  if (!mp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading marketplace details…</p>
      </div>
    );
  }

  const invStatusColor: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
    declined: "bg-red-50 text-red-600 border-red-200",
    revoked: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="space-y-6 p-4 max-w-6xl mx-auto">
      {/* 1. Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{mp.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${mp.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
              {mp.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
              {mp.status === "active" ? "Active" : "Archived"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{mp.slug}</span>
            <span className="mx-2">·</span>
            Created by {mp.brokerSnapshot?.name ?? "—"}
          </p>
        </div>
      </div>

      {/* 2. Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard icon={Users} label="Active RAs" value={data?.activeRAs?.length ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Briefcase} label="Services" value={data?.services?.length ?? 0} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Package} label="Packages" value={data?.packages?.length ?? 0} color="bg-violet-50 text-violet-600" />
        <StatCard icon={PieChart} label="Portfolios" value={data?.portfolios?.length ?? 0} color="bg-rose-50 text-rose-600" />
        <StatCard icon={Calendar} label="Events" value={data?.events?.length ?? 0} color="bg-sky-50 text-sky-600" />
        <StatCard icon={FileText} label="Articles" value={data?.articles?.length ?? 0} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Globe} label="Invitations" value={mp.invitations?.length ?? 0} color="bg-cyan-50 text-cyan-600" />
      </div>

      {/* 3. Description */}
      {mp.description && (
        <SectionCard icon={FileText} title="Description" color="text-gray-600">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{mp.description}</p>
        </SectionCard>
      )}

      {/* 4. Active Research Analysts */}
      {(data?.activeRAs?.length ?? 0) > 0 && (
        <SectionCard icon={Users} title={`Active Research Analysts (${data!.activeRAs.length})`} color="text-blue-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.activeRAs.map((ra) => (
                  <tr key={ra._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ra.profileUrl && (
                          <div className="relative w-7 h-7 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                            <Image src={ra.profileUrl} alt={ra.name} fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{ra.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ra.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{ra.number ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data!.activeRAs.map((ra) => (
              <div key={ra._id} className="border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800">{ra.name ?? "—"}</p>
                <p className="text-xs text-gray-500">{ra.email ?? "—"}</p>
                {ra.number && <p className="text-xs text-gray-500">{ra.number}</p>}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 5. Invitations */}
      {(mp.invitations?.length ?? 0) > 0 && (
        <SectionCard icon={Globe} title={`Invitations (${mp.invitations.length})`} color="text-cyan-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">RA ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invited</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Responded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mp.invitations.map((inv, i) => (
                  <tr key={`${inv.raId}-${i}`} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(inv.raId)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium border ${invStatusColor[inv.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmt(inv.invitedAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmt(inv.respondedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {mp.invitations.map((inv, i) => (
              <div key={`${inv.raId}-${i}`} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-gray-600 truncate">{String(inv.raId)}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium border ${invStatusColor[inv.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {inv.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                  <div><span className="text-gray-400">Invited</span><br /><span className="text-gray-800">{fmt(inv.invitedAt)}</span></div>
                  <div><span className="text-gray-400">Responded</span><br /><span className="text-gray-800">{fmt(inv.respondedAt)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 6. Services Shared */}
      {(data?.services?.length ?? 0) > 0 && (
        <SectionCard icon={Briefcase} title={`Services Shared (${data!.services.length})`} color="text-indigo-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subscribers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.services.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/services/allservices/${s._id}`)}>
                    <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{s.title}</td>
                    <td className="px-4 py-3">{s.segment ? <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{s.segment}</span> : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.authorData?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{s.subscribedBy?.length ?? 0}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{fmtCurrency(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data!.services.map((s) => (
              <div key={s._id} className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/admin/services/allservices/${s._id}`)}>
                <p className="text-sm font-semibold text-indigo-700">{s.title}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><span className="text-gray-400">Segment</span><br /><span className="text-gray-800">{s.segment ?? "—"}</span></div>
                  <div><span className="text-gray-400">Subscribers</span><br /><span className="text-gray-800">{s.subscribedBy?.length ?? 0}</span></div>
                  <div><span className="text-gray-400">Price</span><br /><span className="text-gray-800">{fmtCurrency(s.price)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 7. Packages Shared */}
      {(data?.packages?.length ?? 0) > 0 && (
        <SectionCard icon={Package} title={`Packages Shared (${data!.packages.length})`} color="text-violet-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.packages.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/packages/allpackages/${p._id}`)}>
                    <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.authorData?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{p.pricingPlans?.length ? `From ${fmtCurrency(Math.min(...p.pricingPlans.map((t) => t.price)))}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{p.stats?.purchases ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data!.packages.map((p) => (
              <div key={p._id} className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/admin/packages/allpackages/${p._id}`)}>
                <p className="text-sm font-semibold text-indigo-700">{p.title}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div><span className="text-gray-400">Price</span><br /><span className="text-gray-800">{p.pricingPlans?.length ? `From ${fmtCurrency(Math.min(...p.pricingPlans.map((t) => t.price)))}` : "—"}</span></div>
                  <div><span className="text-gray-400">Purchases</span><br /><span className="text-gray-800">{p.stats?.purchases ?? 0}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 8. Portfolios Shared */}
      {(data?.portfolios?.length ?? 0) > 0 && (
        <SectionCard icon={PieChart} title={`Portfolios Shared (${data!.portfolios.length})`} color="text-rose-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Theme</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min Investment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subscribers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.portfolios.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/modelportfolio/allportfolios/${p._id}`)}>
                    <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{p.portfolioName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.theme ?? "—"}</td>
                    <td className="px-4 py-3">{p.riskLevel ? <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{p.riskLevel}</span> : "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{fmtCurrency(p.minimumInvestment)}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{p.subscribedBy?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data!.portfolios.map((p) => (
              <div key={p._id} className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/admin/modelportfolio/allportfolios/${p._id}`)}>
                <p className="text-sm font-semibold text-indigo-700">{p.portfolioName}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><span className="text-gray-400">Theme</span><br /><span className="text-gray-800">{p.theme ?? "—"}</span></div>
                  <div><span className="text-gray-400">Risk</span><br /><span className="text-gray-800">{p.riskLevel ?? "—"}</span></div>
                  <div><span className="text-gray-400">Subscribers</span><br /><span className="text-gray-800">{p.subscribedBy?.length ?? 0}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 9. Events Shared */}
      {(data?.events?.length ?? 0) > 0 && (
        <SectionCard icon={Calendar} title={`Events Shared (${data!.events.length})`} color="text-sky-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registrations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.events.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/admin/events/allevents/${e._id}`)}>
                    <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{e.title}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fmt(e.eventDate)}</td>
                    <td className="px-4 py-3">{e.eventMode ? <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">{e.eventMode}</span> : "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{e.NoOfRegistration ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {data!.events.map((e) => (
              <div key={e._id} className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/admin/events/allevents/${e._id}`)}>
                <p className="text-sm font-semibold text-indigo-700">{e.title}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><span className="text-gray-400">Date</span><br /><span className="text-gray-800">{fmt(e.eventDate)}</span></div>
                  <div><span className="text-gray-400">Mode</span><br /><span className="text-gray-800">{e.eventMode ?? "—"}</span></div>
                  <div><span className="text-gray-400">Registrations</span><br /><span className="text-gray-800">{e.NoOfRegistration ?? 0}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 10. Articles Shared */}
      {(data?.articles?.length ?? 0) > 0 && (
        <SectionCard icon={FileText} title={`Articles Shared (${data!.articles.length})`} color="text-amber-500">
          <div className="space-y-3">
            {data!.articles.map((a) => (
              <div key={a._id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-900">{a.title}</p>
                {a.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{a.authorData?.name ?? "—"}</span>
                  <span>·</span>
                  <span>{fmt(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 11. Creator Details */}
      {data?.creator && (
        <SectionCard icon={User} title="Creator Details" color="text-rose-500">
          <div className="flex flex-col sm:flex-row gap-6">
            {(data.creator as any).profileUrl && (
              <div className="flex-shrink-0">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200">
                  <Image src={(data.creator as any).profileUrl} alt={data.creator.name} fill className="object-cover" unoptimized />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
              <div><span className="text-gray-400 text-xs">Name</span><p className="font-medium text-gray-900">{data.creator.name ?? "—"}</p></div>
              <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-900">{data.creator.email ?? "—"}</p></div>
              {(data.creator as any).number && (
                <div><span className="text-gray-400 text-xs">Phone</span><p className="font-medium text-gray-900">{(data.creator as any).number}</p></div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* 12. Meta Information */}
      <SectionCard icon={Hash} title="Meta Information" color="text-gray-400">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400 text-xs">Marketplace ID</span><p className="font-mono text-xs text-gray-600 break-all">{mp._id}</p></div>
          <div><span className="text-gray-400 text-xs">Slug</span><p className="font-mono text-xs text-gray-600">{mp.slug}</p></div>
          <div><span className="text-gray-400 text-xs">Created At</span><p className="text-gray-700">{fmt(mp.createdAt)}</p></div>
          <div><span className="text-gray-400 text-xs">Updated At</span><p className="text-gray-700">{fmt(mp.updatedAt)}</p></div>
        </div>
      </SectionCard>
    </div>
  );
}
