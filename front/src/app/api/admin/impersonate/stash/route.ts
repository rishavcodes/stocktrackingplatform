import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  ADMIN_SHADOW_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SHADOW_COOKIE_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/impersonation";

// POST /api/admin/impersonate/stash
//
// Backs the admin's current NextAuth session cookie up to a shadow cookie
// *before* the bridge page calls signIn() as the target SP. Without this,
// the SP signIn overwrites the only NextAuth cookie on the domain and the
// admin returning to their tab sees "Not Authorized".
//
// The shadow cookie carries the same options (httpOnly, sameSite=lax,
// domain in prod) so it round-trips across the same subdomains the
// original cookie covers.
export async function POST() {
  const session = await getServerSession(options);
  const role = session?.user?.role;
  if (
    role !== "admin" &&
    role !== "sub_admin" &&
    role !== "super_admin"
  ) {
    return NextResponse.json(
      { success: false, message: "Only admins can stash a session" },
      { status: 403 },
    );
  }

  // Next 15: cookies() is async — must await before reading.
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!current) {
    return NextResponse.json(
      { success: false, message: "No active session cookie to stash" },
      { status: 400 },
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: ADMIN_SHADOW_COOKIE_NAME,
    value: current,
    ...sessionCookieOptions,
    maxAge: SHADOW_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
