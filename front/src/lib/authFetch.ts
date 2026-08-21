import { signOut } from "next-auth/react";

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, options);

  if (res.status === 401) {
    await signOut({
      callbackUrl: "/auth/provider/signin",
    });

    throw new Error("Session expired");
  }

  return res;
};
