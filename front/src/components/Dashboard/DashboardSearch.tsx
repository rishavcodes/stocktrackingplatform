"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Search,
  Loader2,
  Users,
  Briefcase,
  Newspaper,
  GraduationCap,
  Calendar,
  TrendingUp,
  PieChart,
  CreditCard,
  BookOpen,
  Settings,
  HelpCircle,
  User as UserIcon,
} from "lucide-react";

type Item = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;

// Static dashboard destinations — always searchable, instant.
const PAGES: { title: string; href: string; Icon: typeof Users }[] = [
  { title: "My Profile", href: "/dashboard/user/myprofile", Icon: UserIcon },
  { title: "Plans", href: "/dashboard/user/subscribedservices", Icon: Briefcase },
  { title: "Research Reports", href: "/dashboard/user/researchreports", Icon: Newspaper },
  { title: "Experts", href: "/dashboard/user/experts", Icon: Users },
  { title: "Recommendations", href: "/dashboard/user/recommendations", Icon: TrendingUp },
  { title: "Model Portfolio", href: "/dashboard/user/subscribedmodelportfolio", Icon: PieChart },
  { title: "Events", href: "/dashboard/user/events", Icon: Calendar },
  { title: "Courses", href: "/dashboard/user/subscribedcourses", Icon: GraduationCap },
  { title: "Billing", href: "/dashboard/user/billing", Icon: CreditCard },
  { title: "Brokers", href: "/dashboard/user/broker", Icon: BookOpen },
  { title: "Settings", href: "/dashboard/user/settings", Icon: Settings },
  { title: "Support", href: "/dashboard/user/support", Icon: HelpCircle },
];

type Content = {
  experts: Item[];
  plans: Item[];
  reports: Item[];
  courses: Item[];
  events: Item[];
};

const EMPTY: Content = {
  experts: [],
  plans: [],
  reports: [],
  courses: [],
  events: [],
};

export default function DashboardSearch() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<Content>(EMPTY);
  // Cache so reopening the palette doesn't refetch within the session.
  const loadedRef = useRef(false);

  // ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadContent = useCallback(async () => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);

    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    // Experts + the RA list we need for research reports both come from billing.
    const [billing, plansRes, coursesRes, eventsRes] = await Promise.all([
      safeJson(`${BACKEND}/api/payment/user-billing?userId=${userId}`),
      safeJson(
        `${BACKEND}/api/services/subscribedservices?id=${userId}&role=${role ?? "user"}`
      ),
      safeJson(`${BACKEND}/api/services/subscribedcourses?id=${userId}`),
      safeJson(`${BACKEND}/api/user/events/enrolled?userId=${userId}`),
    ]);

    // Experts — unique service providers from orders.
    const expertMap = new Map<string, string>();
    (billing?.data?.orders ?? []).forEach((o: any) => {
      if (o?.soldBy?.id && o?.soldBy?.name)
        expertMap.set(String(o.soldBy.id), o.soldBy.name);
    });
    const experts: Item[] = Array.from(expertMap, ([id, name]) => ({
      id,
      title: name,
      subtitle: "Expert",
      href: `/dashboard/user/experts/${id}`,
    }));

    const plans: Item[] = (plansRes?.data ?? []).map((s: any) => ({
      id: String(s._id),
      title: s.title ?? "Plan",
      subtitle: s.authorData?.name || "Plan",
      href: `/view/services/${s._id}`,
    }));

    const courses: Item[] = (coursesRes?.data ?? []).map((c: any) => ({
      id: String(c._id),
      title: c.title ?? "Course",
      subtitle: c.authorData?.name || "Course",
      href: "/dashboard/user/subscribedcourses",
    }));

    const events: Item[] = (eventsRes?.data ?? []).map((e: any) => ({
      id: String(e._id),
      title: e.title ?? "Event",
      subtitle: "Event",
      href: "/dashboard/user/events",
    }));

    // Show what we have immediately; reports stream in after (they depend on
    // the per-RA fetch, which is slower).
    setContent({ experts, plans, courses, events, reports: [] });

    // Research reports — aggregate each subscribed RA's articles.
    const reportResults = await Promise.all(
      experts.map((e) =>
        safeJson(`${BACKEND}/api/post/allarticles/previous?id=${e.id}`).then(
          (j) =>
            (j?.data ?? []).map((a: any) => ({
              id: String(a._id),
              title: a.title ?? "Research report",
              subtitle: e.title,
              href: `/view/researchreport/page/${a._id}`,
            }))
        )
      )
    );
    const reports: Item[] = reportResults.flat();

    setContent({ experts, plans, courses, events, reports });
    setLoading(false);
  }, [userId, role]);

  // Kick off the fetch the first time the palette opens.
  useEffect(() => {
    if (open) loadContent();
  }, [open, loadContent]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const renderGroup = (
    heading: string,
    Icon: typeof Users,
    items: Item[]
  ) => {
    if (items.length === 0) return null;
    return (
      <CommandGroup heading={heading}>
        {items.map((it) => (
          <CommandItem
            key={`${heading}-${it.id}`}
            value={`${it.title} ${it.subtitle ?? ""}`}
            onSelect={() => go(it.href)}
            className="cursor-pointer gap-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                {it.title}
              </span>
              {it.subtitle && (
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {it.subtitle}
                </span>
              )}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  return (
    <>
      {/* Desktop trigger — pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-9 w-64 xl:w-80 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm"
        aria-label="Search"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger — icon */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <Search className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search plans, experts, reports, courses…" />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your content…
            </div>
          )}
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem
                key={p.href}
                value={`${p.title} page`}
                onSelect={() => go(p.href)}
                className="cursor-pointer gap-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <p.Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {p.title}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          {renderGroup("Experts", Users, content.experts)}
          {renderGroup("Plans", Briefcase, content.plans)}
          {renderGroup("Research Reports", Newspaper, content.reports)}
          {renderGroup("Courses", GraduationCap, content.courses)}
          {renderGroup("Events", Calendar, content.events)}
        </CommandList>
      </CommandDialog>
    </>
  );
}
