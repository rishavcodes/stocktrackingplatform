const VERCEL_API = "https://api.vercel.com";

export type VercelResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type VercelConfig = {
  token: string;
  projectId: string;
  teamId: string | null;
};

function getConfig(): VercelConfig | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return {
    token,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID || null,
  };
}

function urlWithTeam(path: string, teamId: string | null) {
  return teamId
    ? `${VERCEL_API}${path}${path.includes("?") ? "&" : "?"}teamId=${teamId}`
    : `${VERCEL_API}${path}`;
}

const IDEMPOTENT_ADD_CODES = new Set([
  "domain_already_exists",
  "domain_already_in_use",
  "domain_already_in_use_by_this_project",
]);

export async function addVercelDomain(name: string): Promise<VercelResult> {
  const cfg = getConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 0,
      message: "Vercel not configured (VERCEL_TOKEN / VERCEL_PROJECT_ID missing)",
    };
  }
  try {
    const res = await fetch(
      urlWithTeam(`/v10/projects/${cfg.projectId}/domains`, cfg.teamId),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      }
    );
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({} as any));
    const code = body?.error?.code as string | undefined;
    if (res.status === 409 && code && IDEMPOTENT_ADD_CODES.has(code)) {
      return { ok: true };
    }
    return {
      ok: false,
      status: res.status,
      message:
        body?.error?.message ||
        `Vercel add failed (${res.status}${code ? `, ${code}` : ""})`,
    };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message || "Network error" };
  }
}

export async function removeVercelDomain(name: string): Promise<VercelResult> {
  const cfg = getConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 0,
      message: "Vercel not configured (VERCEL_TOKEN / VERCEL_PROJECT_ID missing)",
    };
  }
  try {
    const res = await fetch(
      urlWithTeam(
        `/v9/projects/${cfg.projectId}/domains/${encodeURIComponent(name)}`,
        cfg.teamId
      ),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cfg.token}` },
      }
    );
    if (res.ok || res.status === 404) return { ok: true };
    const body = await res.json().catch(() => ({} as any));
    return {
      ok: false,
      status: res.status,
      message:
        body?.error?.message || `Vercel remove failed (${res.status})`,
    };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message || "Network error" };
  }
}
