import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/slices/authSlice";

/**
 * Absolute backend origin for the SERVER-SIDE fetches in this file.
 *
 * NEXT_PUBLIC_BACKEND_URL is deliberately left EMPTY on Vercel: it gets inlined
 * into the browser bundle, and an empty value makes every client-side call
 * relative (`/api/auth/checkotpnumber`) so it flows through the `/api` proxy
 * rewrite in next.config.js instead of being blocked as mixed content.
 *
 * That trick breaks server-side fetch, which rejects relative URLs outright —
 * which is why authorize() was returning null and NextAuth answered 401 on
 * /api/auth/callback/credentials. Server code needs a real absolute origin, so
 * set BACKEND_INTERNAL_URL (server-only, no NEXT_PUBLIC_ prefix).
 *
 * Falls back to NEXT_PUBLIC_BACKEND_URL (local dev sets it in .env.local), then
 * to NEXTAUTH_URL — routing back through our own /api proxy, which reaches the
 * same backend at the cost of one extra hop.
 */
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXTAUTH_URL ||
  "";

/**
 * `.tradeboxlive.com` when NEXTAUTH_URL points at that domain (so the session
 * is shared with branded subdomains), otherwise undefined → host-scoped cookie.
 */
const SESSION_COOKIE_DOMAIN = (() => {
  if (process.env.NODE_ENV !== "production") return undefined;
  try {
    const host = new URL(process.env.NEXTAUTH_URL ?? "").hostname;
    return host === "tradeboxlive.com" || host.endsWith(".tradeboxlive.com")
      ? ".tradeboxlive.com"
      : undefined;
  } catch {
    return undefined;
  }
})();

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        number: { label: "Phone Number", type: "text" },
        loginAs: { label: "Login As", type: "text" },
        brokerType: { label: "Broker Type", type: "text" },
        clientCode: { label: "Client Code", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
        expiresAt: { label: "Expires At", type: "text" },
        // Set by the admin's "View as SP" flow. When present we skip the
        // OTP / phone-number flow and trust the pre-signed backend JWT —
        // it was issued by /api/admin/impersonate which verifies the
        // caller is an admin before signing.
        impersonateToken: { label: "Impersonate Token", type: "text" },
      },
      async authorize(credentials, req) {
        // Impersonation branch — admin already proved themselves to the
        // backend; we just fetch the target user's data and establish a
        // session backed by the pre-signed token.
        if (credentials?.impersonateToken) {
          try {
            // The token's `id` claim is the SP/user we're impersonating, and
            // `role` is "provider" | "user". `impersonatedBy` (set by
            // /api/admin/impersonate) is the admin's id; we propagate it
            // into the session so the UI can show an "Exit Impersonation"
            // banner. Decoding without verification is fine here: the
            // backend re-verifies on every subsequent request.
            const payload = JSON.parse(
              Buffer.from(
                credentials.impersonateToken.split(".")[1],
                "base64",
              ).toString("utf8"),
            ) as { id?: string; role?: string; impersonatedBy?: string };
            if (!payload?.id) return null;

            // getuserdata defaults to ServiceProviderRegModel; pass type=user
            // so customer impersonation looks up UserModel instead.
            const typeParam = payload.role === "user" ? "&type=user" : "";
            const res = await fetch(
              `${BACKEND_URL}/api/auth/getuserdata?id=${payload.id}${typeParam}`,
              { headers: { Authorization: `Bearer ${credentials.impersonateToken}` } },
            );
            if (!res.ok) return null;
            const json = await res.json();
            if (!json?.user) return null;
            return {
              ...json.user,
              // The user document doesn't carry a `role` field, so force it
              // from the JWT claim. Without this, the session.user.role would
              // be undefined and the middleware would block /dashboard/user.
              role: payload.role,
              backendToken: credentials.impersonateToken,
              isImpersonation: true,
              impersonatedBy: payload.impersonatedBy,
            };
          } catch {
            return null;
          }
        }

        const hasBrokerCreds =
          credentials?.brokerType &&
          credentials?.clientCode &&
          credentials?.loginAs === "user";

        if (hasBrokerCreds) {
          const body: Record<string, unknown> = {
            brokerType: credentials.brokerType,
            clientCode: credentials.clientCode,
            loginAs: "user",
          };
          if (credentials.accessToken != null && credentials.expiresAt != null) {
            body.accessToken = credentials.accessToken;
            body.expiresAt = Number(credentials.expiresAt);
          }
          const response = await fetch(
            `${BACKEND_URL}/api/auth/signin`,
            {
              method: "POST",
              body: JSON.stringify(body),
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!response.ok) return null;
          const data = await response.json();
          const { user, token, userExists } = data;
          if (!userExists || !user) return null;
          return { ...user, backendToken: token, brokerSession: data.brokerSession ?? null };
        }

        if (!credentials?.number || !credentials?.loginAs) {
          return null;
        }

        const response = await fetch(
          `${BACKEND_URL}/api/auth/signin`,
          {
            method: "POST",
            body: JSON.stringify({
              number: credentials.number,
              loginAs: credentials.loginAs,
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) return null;

        const { user, token, userExists } = await response.json();
        if (!userExists || !user) return null;
        // console.log(user);
        return { ...user, backendToken: token };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  jwt: {
    maxAge: 60 * 60 * 24, // 1 day
  },
  // Scope the session cookie to `.tradeboxlive.com` ONLY when we are actually
  // deployed there, so a user signed in on the apex stays signed in on broker
  // subdomains like `bigul.tradeboxlive.com`.
  //
  // Anywhere else (localhost, *.vercel.app, any other host) the domain must be
  // left undefined so the cookie is host-scoped. A browser silently DROPS a
  // Set-Cookie whose Domain doesn't match the current host — hardcoding
  // `.tradeboxlive.com` in every production build meant a successful login on
  // e.g. stocktrackingplatform.vercel.app set no session cookie at all.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: SESSION_COOKIE_DOMAIN,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        const u = user as any;
        token.backendToken = u.backendToken;
        token.brokerSession = u.brokerSession ?? null;
        token.id = u._id;
        token.role = u.role;
        token.type = u.type;
        token.profileUrl = u.profileUrl;
        token.RegName = u.RegName;
        token.number = u.number;
        token.email = u.email;
        token.pannumber = u.pannumber;
        token.category = u.category;
        token.addedby = u.addedby;
        // Sub-profile gates — only meaningful when addedby.isSubProfile === true.
        // Pulled out so sidebar/middleware can read them without traversing addedby.
        token.subProfileRole = u.addedby?.subProfileRole;
        token.subPermissions = u.addedby?.permissions;
        token.permissions = u.permissions || [];
        token.customSubdomain = u.customSubdomain ?? null;
        token.customSubdomainStatus = u.customSubdomainStatus ?? null;
        token.isImpersonation = u.isImpersonation === true;
        token.impersonatedBy = u.impersonatedBy;
		token.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
      }
      

      // Handle session updates from client (e.g. after KYC/details modal, profile pic update)
      if (trigger === "update" && updateData) {
        // Merge a broker session when a user links a broker while already signed in
        // (e.g. connecting Bigul from the dashboard via updateSession({ brokerSession })).
        if (updateData.brokerSession !== undefined) token.brokerSession = updateData.brokerSession;
        if (updateData.RegName !== undefined) token.RegName = updateData.RegName;
        if (updateData.email !== undefined) token.email = updateData.email;
        if (updateData.pannumber !== undefined) token.pannumber = updateData.pannumber;
        if (updateData.profileUrl !== undefined) token.profileUrl = updateData.profileUrl;
        if (updateData.name !== undefined) token.name = updateData.name;
        if (updateData.number !== undefined) token.number = updateData.number;
        if (updateData.customSubdomain !== undefined) token.customSubdomain = updateData.customSubdomain;
        if (updateData.customSubdomainStatus !== undefined) token.customSubdomainStatus = updateData.customSubdomainStatus;
        // Also handle nested user object format: update({ user: { profileUrl } })
        if (updateData.user) {
          if (updateData.user.profileUrl !== undefined) token.profileUrl = updateData.user.profileUrl;
          if (updateData.user.name !== undefined) token.name = updateData.user.name;
          if (updateData.user.number !== undefined) token.number = updateData.user.number;
          if (updateData.user.RegName !== undefined) token.RegName = updateData.user.RegName;
          if (updateData.user.customSubdomain !== undefined) token.customSubdomain = updateData.user.customSubdomain;
          if (updateData.user.customSubdomainStatus !== undefined) token.customSubdomainStatus = updateData.user.customSubdomainStatus;
        }
      }

      // Live-refresh sub-profile permission gates on an EXPLICIT client update()
      // call (the SP dashboard calls useSession().update() once on mount — see
      // layout.tsx). This lets a page refresh pick up tabs the master just
      // granted/removed WITHOUT a re-login.
      //
      // CRITICAL — this is gated to `trigger === "update"`, so it does NOT run
      // on the frequent automatic session reads (mount/focus/poll). That caps it
      // at ONE backend lookup per page load and is what prevents the request
      // amplification that previously tripped Vercel's rate-limiter. Do not
      // change this to fire on every jwt() call.
      if (
        trigger === "update" &&
        token?.id &&
        token?.role === "provider" &&
        (token as any).addedby?.isSubProfile
      ) {
        try {
          const res = await fetch(
            `${BACKEND_URL}/api/auth/getuserdata?id=${token.id}`,
          );
          if (res.ok) {
            const data = await res.json();
            const freshAddedby = data?.user?.addedby;
            if (freshAddedby) {
              token.addedby = freshAddedby;
              token.subProfileRole = freshAddedby.subProfileRole;
              token.subPermissions = freshAddedby.permissions;
            }
          }
        } catch {
          // Never break auth over a refresh failure — keep the existing gates.
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      // Allow callbacks back to *.tradeboxlive.com after central login,
      // so SPs land on their branded subdomain when they auth from the apex.
      try {
        const u = new URL(url, baseUrl);
        const host = u.hostname;
        if (
          host === "tradeboxlive.com" ||
          host.endsWith(".tradeboxlive.com") ||
          host === "localhost"
        ) {
          return u.toString();
        }
      } catch {}
      return baseUrl;
    },
    async session({ session, token }) {
      // Pass backend token + user info to client
      // console.log("session token: ", token);
      session.backendToken = token.backendToken;
      session.brokerSession = token.brokerSession ?? null;
      session.isImpersonation = token.isImpersonation === true;
      session.impersonatedBy = token.impersonatedBy;
      if (
        token.role === "provider" ||
        token.role === "user"
      ) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.type = token.type;
        session.user.backendToken = token.backendToken;
        session.user.profileUrl = token.profileUrl;
        session.user.RegName = token.RegName;
        session.user.category = token.category;
        session.user.number = token.number;
        session.user.email = token.email;
        session.user.pannumber = token.pannumber;
        session.user.addedby = token.addedby;
        // Sub-profile gates — sidebar / middleware / can() read these.
        (session.user as any).subProfileRole = (token as any).subProfileRole;
        (session.user as any).subPermissions = (token as any).subPermissions;
        if (token.role === "provider") {
          session.user.customSubdomain = token.customSubdomain ?? null;
          session.user.customSubdomainStatus = token.customSubdomainStatus ?? null;
        }
      } else if (
        token.role === "admin" ||
        token.role === "sub_admin" ||
        token.role === "super_admin"
      ) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
        session.user.backendToken = token.backendToken;
      }
      // console.log("session",session)
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
};
