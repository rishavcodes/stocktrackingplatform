// Page route at /dashboard/serviceprovider/myprofile/details — renders the
// SP's own profile (no userId → MyProfile falls back to the session id).
// The MyProfile component lives in /components/MyProfile so admin-facing
// consumers (e.g. SuperUserApprovalDetailsPage) can import it without
// violating Next.js App Router page export rules (page files may only
// export `default` + a fixed set of metadata fields).

"use client";

import { MyProfile } from "@/components/MyProfile/MyProfileForm";

export default function Page() {
  return <MyProfile />;
}
