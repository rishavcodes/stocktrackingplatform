import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import {
  APEX_DOMAIN,
  parseSubdomain,
  resolveSpBySubdomain,
} from "./lib/customDomain";
import { modulePermissionForPath } from "./lib/subProfilePermissions";

/**
 * Provider-only app. The only account type is `role === "provider"`; there is
 * no customer, admin, broker or marketplace surface any more. The whole route
 * table is:
 *
 *   /                          → /auth/provider/signin
 *   /auth/provider/signin
 *   /dashboard/serviceprovider/**
 */
export default withAuth(
  async function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl.pathname;
    const tokenExp = typeof token?.exp === "number" ? token.exp : null;

    /* -------------------------------------------------
       0️⃣ SP DASHBOARD CUSTOM SUBDOMAIN
       e.g. acme.tradeboxlive.com/dashboard/...
       Rewrite cosmetic /dashboard/<rest> → /dashboard/serviceprovider/<rest>
       and lock the host to its owning SP.
    -------------------------------------------------- */
    const host = (req.headers.get("host") ?? "").toLowerCase();
    const sub = parseSubdomain(host);
    if (sub) {
      const sp = await resolveSpBySubdomain(sub);
      if (!sp) {
        const apexUrl = new URL(req.nextUrl.toString());
        apexUrl.host = APEX_DOMAIN;
        apexUrl.protocol = "https:";
        return NextResponse.redirect(apexUrl);
      }

      // Lock branded subdomain dashboard to its owner once authenticated.
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

      // Everything else on a branded host belongs on the apex. Only /dashboard
      // and /api are SP-scoped now that the public surfaces are gone.
      if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
        const apexUrl = new URL(req.nextUrl.toString());
        apexUrl.host = APEX_DOMAIN;
        apexUrl.protocol = "https:";
        return NextResponse.redirect(apexUrl);
      }
    }

    /* -------------------------------------------------
       1️⃣ ROOT → PROVIDER SIGNIN
       There is no landing page. Runs after the subdomain block above so
       branded hosts keep their own `/` rewrite. Authenticated visitors
       fall through to 3️⃣, which bounces them to the dashboard.
    -------------------------------------------------- */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/auth/provider/signin", req.url));
    }

    /* -------------------------------------------------
       2️⃣ EXPIRED TOKEN → SIGNIN
    -------------------------------------------------- */
    if (tokenExp && Date.now() / 1000 > tokenExp) {
      return NextResponse.redirect(new URL("/auth/provider/signin", req.url));
    }

    /* -------------------------------------------------
       3️⃣ BLOCK THE AUTH PAGE IF ALREADY LOGGED IN
    -------------------------------------------------- */
    if (token && pathname.startsWith("/auth")) {
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
        new URL("/dashboard/serviceprovider/recommendations", req.url)
      );
    }

    /* -------------------------------------------------
       4️⃣ PROVIDER DASHBOARD PROTECTION
       Note: there is deliberately NO "is this SP verified by an admin"
       check here any more. Any signed-in provider gets the full dashboard.
    -------------------------------------------------- */
    if (pathname.startsWith("/dashboard/serviceprovider")) {
      // The dashboard error page is gone; a non-provider simply goes back to
      // sign-in rather than being rewritten to a page that no longer exists.
      if (token?.role !== "provider") {
        return NextResponse.redirect(new URL("/auth/provider/signin", req.url));
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
        // Always allow the dashboard root + the landing section (so the
        // redirect target itself isn't gated).
        const isExempt =
          pathname === "/dashboard/serviceprovider" ||
          pathname === "/dashboard/serviceprovider/recommendations";
        if (!isExempt && owningKey && !subPerms?.[owningKey]) {
          return NextResponse.redirect(
            new URL("/dashboard/serviceprovider/recommendations", req.url),
          );
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
