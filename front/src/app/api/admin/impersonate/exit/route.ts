import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SHADOW_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/impersonation";

// POST /api/admin/impersonate/exit
//
// Restores the admin's stashed session cookie and removes the shadow.
// Callable from either the impersonated SP tab (via the banner button) or
// from the middleware safety net when an admin tab navigates back and the
// shadow cookie is still present.
//
// Returns `{ restored: true }` when a shadow was found and swapped back, or
// `{ restored: false }` when there was nothing to restore (in which case
// we still clear the current session so the SP cookie doesn't linger).
export async function POST() {
  // Next 15: cookies() is async — must await before reading.
  const jar = await cookies();
  const shadow = jar.get(ADMIN_SHADOW_COOKIE_NAME)?.value;

  const res = NextResponse.json({
    success: true,
    restored: Boolean(shadow),
  });

  if (shadow) {
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: shadow,
      ...sessionCookieOptions,
    });
  } else {
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      ...sessionCookieOptions,
      maxAge: 0,
    });
  }

  res.cookies.set({
    name: ADMIN_SHADOW_COOKIE_NAME,
    value: "",
    ...sessionCookieOptions,
    maxAge: 0,
  });

  return res;
}
