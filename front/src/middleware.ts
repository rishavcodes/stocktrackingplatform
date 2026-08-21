import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { checkSPisVerified } from "./lib/CheckForUser";
import {
  APEX_DOMAIN,
  parseSubdomain,
  resolveSpBySubdomain,
} from "./lib/customDomain";
import {
  ADMIN_SHADOW_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "./lib/impersonation";
import { modulePermissionForPath } from "./lib/subProfilePermissions";

/**
 * Host → marketplace slug mapping for white-label subdomains.
 * Visitors to `bigul.tradeboxlive.com/marketplace` are transparently served
 * the same content as `tradeboxlive.com/marketplace/bigul` via a path rewrite.
 * Adding a new broker subdomain is a one-line change here (v2 will resolve this
 * from the MarketplaceModel.customHost field).
 */
const HOST_TO_SLUG: Record<string, string> = {
  "bigul.tradeboxlive.com": "bigul-market-place",
};

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl.pathname;
    const tokenExp = typeof token?.exp === "number" ? token.exp : null;
    console.log("token", token?.category);

    /* -------------------------------------------------
       0️⃣ WHITE-LABEL SUBDOMAIN REWRITE
       Runs BEFORE auth redirects so unauthenticated visitors
       still reach the marketplace landing.
    -------------------------------------------------- */
    const host = (req.headers.get("host") ?? "").toLowerCase();
    const slugFromHost = HOST_TO_SLUG[host];
    if (slugFromHost) {
      const marketplacePrefix = `/marketplace/${slugFromHost}`;
      if (pathname === "/" || pathname === "/marketplace") {
        const url = req.nextUrl.clone();
        url.pathname = marketplacePrefix;
        return NextResponse.rewrite(url);
      }
      if (
        pathname.startsWith("/marketplace/") &&
        !pathname.startsWith(`${marketplacePrefix}/`) &&
        pathname !== marketplacePrefix
      ) {
        const url = req.nextUrl.clone();
        url.pathname = `${marketplacePrefix}${pathname.slice("/marketplace".length)}`;
        return NextResponse.rewrite(url);
      }
      // Fall through — path is already `/marketplace/<slug>/...` or a
      // non-marketplace route (e.g. /dashboard, /auth) that should not be
      // rewritten even when hit via the subdomain.
    }

    /* -------------------------------------------------
       0b️⃣ SP DASHBOARD CUSTOM SUBDOMAIN
       e.g. acme.tradeboxlive.com/dashboard/...
       Rewrite cosmetic /dashboard/<rest> → /dashboard/serviceprovider/<rest>
       and lock the host to its owning SP.
    -------------------------------------------------- */
    const sub = !slugFromHost ? parseSubdomain(host) : null;
    if (sub) {
      const sp = await resolveSpBySubdomain(sub);
      if (!sp) {
        const apexUrl = new URL(req.nextUrl.toString());
        apexUrl.host = APEX_DOMAIN;
        apexUrl.protocol = "https:";
        return NextResponse.redirect(apexUrl);
      }

      // Lock branded subdomain dashboard to its owner once authenticated.
      // Public /view and /service-providers pages stay open to any visitor.
      if (
        token &&
        token.id &&
        token.id !== sp._id &&
        pathname.startsWith("/dashboard")
      ) {
        const apexUrl = new URL("/dashboard/serviceprovider", req.nextUrl);
        apexUrl.host = APEX_DOMAIN;
        apexUrl.protocol = "https:";
        return NextResponse.redirect(apexUrl);
      }

      // Force login on apex when unauthenticated and visiting dashboard
      if (!token && pathname.startsWith("/dashboard")) {
        const callback = `https://${host}${pathname}${req.nextUrl.search}`;
        const signin = new URL("/auth/provider/signin", req.nextUrl);
        signin.host = APEX_DOMAIN;
        signin.protocol = "https:";
        signin.searchParams.set("callbackUrl", callback);
        return NextResponse.redirect(signin);
      }

      // Cosmetic URL: /dashboard/<rest> → /dashboard/serviceprovider/<rest>
      // Pass through canonical paths so internal <Link> navigations still work.
      if (pathname === "/dashboard" || pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard/serviceprovider";
        return NextResponse.rewrite(url);
      }
      if (
        pathname.startsWith("/dashboard/") &&
        !pathname.startsWith("/dashboard/serviceprovider")
      ) {
        const url = req.nextUrl.clone();
        url.pathname = `/dashboard/serviceprovider${pathname.slice("/dashboard".length)}`;
        return NextResponse.rewrite(url);
      }

      // Redirect off-scope paths back to apex.
      // /view/* and /service-providers/* are SP-scoped public surfaces and
      // remain on the subdomain. /auth/user/* also stays so post-purchase
      // sign-in keeps users in the SP's branded flow. /checkout stays so the
      // eSign → payment → view roundtrip never leaves the branded host.
      // Provider/admin auth pages are global and stay on apex.
      if (
        !pathname.startsWith("/dashboard") &&
        !pathname.startsWith("/api") &&
        !pathname.startsWith("/view") &&
        !pathname.startsWith("/service-providers") &&
        !pathname.startsWith("/auth/user") &&
        !pathname.startsWith("/checkout")
      ) {
        const apexUrl = new URL(req.nextUrl.toString());
        apexUrl.host = APEX_DOMAIN;
        apexUrl.protocol = "https:";
        return NextResponse.redirect(apexUrl);
      }
    }

    /* -------------------------------------------------
       0c️⃣ ROOT → PROVIDER SIGNIN
       There is no landing page any more. Runs after the subdomain
       blocks above so branded hosts keep their own `/` rewrites.
       Authenticated visitors fall through to 2️⃣ below, which bounces
       them from /auth/* to their own dashboard.
    -------------------------------------------------- */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/auth/provider/signin", req.url));
    }

    /* -------------------------------------------------
       1️⃣ HANDLE EXPIRED TOKEN → ROLE-AWARE REDIRECT
    -------------------------------------------------- */
    if (tokenExp && Date.now() / 1000 > tokenExp) {
      if (pathname.startsWith("/dashboard/serviceprovider")) {
        return NextResponse.redirect(new URL("/auth/provider/signin", req.url));
      }

      if (pathname.startsWith("/dashboard/admin")) {
        return NextResponse.redirect(new URL("/auth/admin/signin", req.url));
      }

      // default → user
      return NextResponse.redirect(new URL("/auth/user/signin", req.url));
    }

    /* -------------------------------------------------
       2️⃣ BLOCK AUTH PAGES IF ALREADY LOGGED IN
       Exception: /auth/impersonate is the bridge that swaps an admin's
       session for a target SP's session. By definition the caller is
       already logged in (as an admin), so we must NOT bounce it back to
       the admin dashboard — the bridge page does its own signIn() and
       then routes to /dashboard/serviceprovider.
    -------------------------------------------------- */
    if (token && pathname.startsWith("/auth") && pathname !== "/auth/impersonate") {
      if (token.role === "provider") {
        if (token.category === "Broker") {
          return NextResponse.redirect(new URL("/dashboard/broker", req.url));
        }

        // SP with an approved white-label subdomain → send to branded host.
        if (
          token.customSubdomainStatus === "active" &&
          typeof token.customSubdomain === "string" &&
          token.customSubdomain.length > 0
        ) {
          const branded = new URL("/dashboard", req.nextUrl);
          branded.host = `${token.customSubdomain}.${APEX_DOMAIN}`;
          branded.protocol = "https:";
          return NextResponse.redirect(branded);
        }

        return NextResponse.redirect(
          new URL("/dashboard/serviceprovider", req.url)
        );
      }

      if (token.role === "user") {
        return NextResponse.redirect(new URL("/dashboard/user", req.url));
      }

      if (
        token.role === "admin" ||
        token.role === "sub_admin" ||
        token.role === "super_admin"
      ) {
        return NextResponse.redirect(new URL("/dashboard/admin", req.url));
      }
    }

    /* -------------------------------------------------
       3️⃣ PROVIDER DASHBOARD PROTECTION
    -------------------------------------------------- */
    if (pathname.startsWith("/dashboard/serviceprovider")) {
      if (
        token?.role !== "provider" &&
        token?.category !== "Research Analyst"
      ) {
        return NextResponse.rewrite(
          new URL("/dashboard/serviceprovider/error", req.url)
        );
      }

      const isVerified = await checkSPisVerified(token.id as string);
      if (!isVerified) {
        return NextResponse.rewrite(
          new URL("/dashboard/serviceprovider/error", req.url)
        );
      }

      // Sub-profile route guard: any sub profile (admin or user) can only
      // see modules the master ticked in their `permissions` block. Master /
      // Individual SPs are not gated (subProfileRole undefined → bail out).
      const subRole = (token as any).subProfileRole as
        | "admin"
        | "user"
        | undefined;
      if (subRole === "user" || subRole === "admin") {
        const subPerms = (token as any).subPermissions as
          | Record<string, boolean>
          | undefined;
        const owningKey = modulePermissionForPath(pathname);
        // Always allow the dashboard root + the error page (so the redirect
        // target itself isn't gated).
        const isExempt =
          pathname === "/dashboard/serviceprovider" ||
          pathname === "/dashboard/serviceprovider/overview" ||
          pathname.startsWith("/dashboard/serviceprovider/error");
        if (!isExempt && owningKey && !subPerms?.[owningKey]) {
          return NextResponse.redirect(
            new URL("/dashboard/serviceprovider/overview", req.url),
          );
        }
        // Block "Team" page (sub-profile management) for any sub profile —
        // only the master may manage the team.
        if (pathname.startsWith("/dashboard/serviceprovider/team")) {
          return NextResponse.redirect(
            new URL("/dashboard/serviceprovider/overview", req.url),
          );
        }
      }
      if (
        subRole !== "user" &&
        subRole !== "admin" &&
        pathname.startsWith("/dashboard/serviceprovider/team")
      ) {
        // Also block /team for any SP that isn't a Non Individual master.
        const isNonIndividualMaster =
          (token as any).type === "Non Individual" &&
          !(token as any).addedby?.isSubProfile;
        if (!isNonIndividualMaster) {
          return NextResponse.redirect(
            new URL("/dashboard/serviceprovider/overview", req.url),
          );
        }
      }

      return NextResponse.next();
    }

    /* -------------------------------------------------
       3️⃣ Broker DASHBOARD PROTECTION
    -------------------------------------------------- */

    if (pathname.startsWith("/dashboard/broker")) {
      if (token?.role !== "provider" || token?.category !== "Broker") {
        return NextResponse.rewrite(
          new URL("/dashboard/broker/error", req.url)
        );
      }

      const isVerified = await checkSPisVerified(token.id as string);
      if (!isVerified) {
        return NextResponse.rewrite(
          new URL("/dashboard/broker/error", req.url)
        );
      }
      return NextResponse.next();
    }

    /* -------------------------------------------------
       4️⃣ USER DASHBOARD PROTECTION
    -------------------------------------------------- */
    if (pathname.startsWith("/dashboard/user")) {
      if (token?.role !== "user") {
        return NextResponse.rewrite(new URL("/dashboard/user/error", req.url));
      }
      return NextResponse.next();
    }

    /* -------------------------------------------------
       5️⃣ ADMIN DASHBOARD PROTECTION
    -------------------------------------------------- */
    if (pathname.startsWith("/dashboard/admin")) {
      // allow all admin types
      if (
        !["admin", "sub_admin", "super_admin"].includes(token?.role as string)
      ) {
        // Safety net for the "View as SP" flow: if the admin's cookie was
        // overwritten by an SP signIn and they navigated back here, the
        // shadow cookie still holds the admin's original session. Swap it
        // back and bounce them to the same URL so the next request reads
        // the admin token. Without this they'd hit the generic
        // /dashboard/admin/error page with no way to recover.
        const shadow = req.cookies.get(ADMIN_SHADOW_COOKIE_NAME)?.value;
        if (shadow) {
          const restored = NextResponse.redirect(req.url);
          restored.cookies.set({
            name: SESSION_COOKIE_NAME,
            value: shadow,
            ...sessionCookieOptions,
          });
          restored.cookies.set({
            name: ADMIN_SHADOW_COOKIE_NAME,
            value: "",
            ...sessionCookieOptions,
            maxAge: 0,
          });
          return restored;
        }
        return NextResponse.rewrite(new URL("/dashboard/admin/error", req.url));
      }

      /* 🔐 PERMISSION CHECKS FOR SUB ADMIN */
      if (token?.role === "sub_admin") {
        const permissions = Array.isArray(token.permissions)
          ? token.permissions
          : [];

        const routePermissionMap: Record<string, string> = {
          "/dashboard/admin/serviceprovider": "service_providers",
          "/dashboard/admin/contentstats": "content_stats",
          "/dashboard/admin/customers": "customers",
          "/dashboard/admin/login-activity": "login_activity",
          "/dashboard/admin/allnotifications": "all_notifications",
          "/dashboard/admin/contactleads": "contact_leads",
          "/dashboard/admin/onboarding-issues": "onboarding_issues",
          "/dashboard/admin/support": "support_tickets",
          "/dashboard/admin/withdrawals": "withdrawals",
          "/dashboard/admin/wallet": "wallet",
          "/dashboard/admin/events": "events",
          "/dashboard/admin/services": "services",
          "/dashboard/admin/modelportfolio": "model_portfolio",
          "/dashboard/admin/marketplace": "marketplace",
          "/dashboard/admin/subadmin": "sub_admin_manage", // ❌ block
        };

        for (const route in routePermissionMap) {
          if (pathname.startsWith(route)) {
            const requiredPermission = routePermissionMap[route];

            if (!permissions.includes(requiredPermission)) {
              return NextResponse.rewrite(
                new URL("/dashboard/admin/error", req.url)
              );
            }
          }
        }
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  },

  {
    callbacks: {
      authorized: ({ req, token }) =>
        req.nextUrl.pathname === "/" ||
        req.nextUrl.pathname.startsWith("/auth") ||
        req.nextUrl.pathname.startsWith("/documents") ||
        req.nextUrl.pathname.startsWith("/view") ||
        req.nextUrl.pathname.startsWith("/service-providers") ||
        req.nextUrl.pathname.startsWith("/market-watch") ||
        req.nextUrl.pathname.startsWith("/marketplace") ||
        req.nextUrl.pathname.startsWith("/footer") ||
        !!token,
    },
    pages: {
      signIn: "/auth/provider/signin", // fallback only
    },
  }
);

export const config = {
  // Excludes static asset paths from auth so the browser can load images,
  // gifs, icons, etc. on unauthenticated pages (e.g. the sign-in screen's
  // background gif at /assets/login-bg.gif).
  matcher: ["/((?!api|_next/static|_next/image|assets|images|icons|favicon.ico|manifest\\.json|sw\\.js|workbox-).*)"],
};
