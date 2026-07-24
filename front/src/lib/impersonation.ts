// Cookie names and options for the "View as SP" impersonation flow.
//
// The problem: NextAuth scopes its session cookie to the whole domain, so when
// an admin opens the bridge tab and signs in as an SP, the SP's session
// cookie overwrites the admin's — across tabs. Returning to the admin tab
// then shows "Not Authorized" because the cookie now carries the SP role.
//
// The fix: before the bridge runs, /api/admin/impersonate/stash copies the
// admin's session cookie into a "shadow" cookie under a different name.
// /api/admin/impersonate/exit (and the middleware safety net) restore it.
//
// Both names mirror NextAuth's prod/dev naming so the `__Secure-` prefix
// requirements stay aligned with the rest of the auth surface.

const isProd = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = isProd
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

export const ADMIN_SHADOW_COOKIE_NAME = isProd
  ? "__Secure-next-auth.admin-shadow"
  : "next-auth.admin-shadow";

export const SHADOW_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 2; // 2h cap — impersonation tokens live 1h

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  secure: isProd,
  domain: isProd ? ".tradeboxlive.com" : undefined,
};
