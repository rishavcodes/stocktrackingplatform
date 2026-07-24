import jwt from "jsonwebtoken";

/**
 * Short-lived signed token embedded in the Telegram message URL so a
 * subscriber tapping the link inside Telegram's in-app browser can open the
 * PDF without a NextAuth session.
 *
 * Trust model: the message is only broadcast to a plan's Telegram channel,
 * whose members are already paying subscribers. The token's only job is to
 * carry channel-membership authorisation across into the WebView.
 *
 * Scope check on verify prevents cross-use with the user-session JWT (same
 * signing secret, different `scope` field).
 */

const SCOPE = "article-pdf-share";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signArticlePdfShareToken(articleId: string): string {
  return jwt.sign(
    { articleId, scope: SCOPE },
    process.env.JWTSECRET as string,
    { expiresIn: TTL_SECONDS },
  );
}

export function verifyArticlePdfShareToken(
  token: string,
  expectedArticleId: string,
): { ok: true } | { ok: false; reason: string } {
  try {
    const payload = jwt.verify(
      token,
      process.env.JWTSECRET as string,
    ) as { articleId?: string; scope?: string };
    if (payload.scope !== SCOPE) return { ok: false, reason: "wrong scope" };
    if (payload.articleId !== expectedArticleId) {
      return { ok: false, reason: "article mismatch" };
    }
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      reason: err?.name === "TokenExpiredError" ? "expired" : "invalid",
    };
  }
}
