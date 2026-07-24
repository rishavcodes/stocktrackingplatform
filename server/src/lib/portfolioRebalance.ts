import { Types } from "mongoose";
import { PortfolioUpdateEvent } from "./portfolioUpdateEvent";

export type ScriptLike = {
  scriptName: { token: string; exchange: string; name: string };
  quantity: number;
};

export type RebalanceDiff = {
  added: { name: string; quantity: number }[];
  removed: { name: string; quantity: number }[];
  changed: { name: string; from: number; to: number }[];
};

/**
 * Diff two script lists into added / removed / quantity-changed buckets, keyed
 * by token+exchange. Tolerant of undefined inputs (returns empty buckets), so
 * it is safe to run over the before/after snapshots stored on a
 * PortfolioUpdateEvent — a rebalance triggered purely by a closed position has
 * no `scripts` change and yields empty buckets.
 */
export function diffScripts(
  prev: ScriptLike[] | undefined,
  next: ScriptLike[] | undefined
): RebalanceDiff {
  const diff: RebalanceDiff = { added: [], removed: [], changed: [] };
  if (!next) return diff;

  const key = (s: ScriptLike) => `${s.scriptName.token}-${s.scriptName.exchange}`;
  const prevMap = new Map((prev || []).map((s) => [key(s), s]));
  const nextMap = new Map(next.map((s) => [key(s), s]));

  for (const [k, n] of nextMap) {
    const p = prevMap.get(k);
    if (!p && n.quantity > 0) {
      diff.added.push({ name: n.scriptName.name, quantity: n.quantity });
    } else if (p && p.quantity !== n.quantity) {
      if (n.quantity === 0) {
        diff.removed.push({ name: n.scriptName.name, quantity: p.quantity });
      } else {
        diff.changed.push({
          name: n.scriptName.name,
          from: p.quantity,
          to: n.quantity,
        });
      }
    }
  }
  for (const [k, p] of prevMap) {
    if (!nextMap.has(k)) {
      diff.removed.push({ name: p.scriptName.name, quantity: p.quantity });
    }
  }
  return diff;
}

export type RebalanceHistoryEntry = {
  date: Date;
  added: { name: string; quantity: number }[];
  removed: { name: string; quantity: number }[];
  changed: { name: string; from: number; to: number }[];
  closed: { name: string }[];
};

// A closed position has no stable id; token+exchange+closedAt uniquely
// identifies one closing event, so re-closing the same script later still
// counts as a fresh entry.
const closedKey = (cp: any) =>
  `${cp?.scriptName?.token}-${cp?.scriptName?.exchange}-${
    cp?.closedAt ? new Date(cp.closedAt).getTime() : ""
  }`;

function diffClosedPositions(
  before: any[] | undefined,
  after: any[] | undefined
): { name: string }[] {
  if (!Array.isArray(after)) return [];
  const beforeKeys = new Set(
    (Array.isArray(before) ? before : []).map(closedKey)
  );
  return after
    .filter((cp) => !beforeKeys.has(closedKey(cp)))
    .map((cp) => ({ name: cp?.scriptName?.name ?? "—" }));
}

/**
 * Reconstruct the rebalance history for a portfolio from the recorded
 * PortfolioUpdateEvent entries (newest first). Each entry summarises what
 * changed at that rebalance — scripts added/removed/quantity-changed and
 * positions closed — derived from the before/after diff stored on the event.
 * Defensive against old or partial events (missing change keys yield empty
 * buckets, never a throw).
 */
export async function buildRebalanceHistory(
  portfolioId: string | Types.ObjectId
): Promise<RebalanceHistoryEntry[]> {
  const events = await PortfolioUpdateEvent.find({
    portfolio: portfolioId,
    updateType: "rebalance",
  })
    .sort({ updatedAt: -1 })
    .lean();

  return events.map((event: any) => {
    const changes = event?.changes ?? {};
    const { added, removed, changed } = diffScripts(
      changes?.scripts?.before,
      changes?.scripts?.after
    );
    const closed = diffClosedPositions(
      changes?.closedPositions?.before,
      changes?.closedPositions?.after
    );
    return {
      date: event.updatedAt,
      added,
      removed,
      changed,
      closed,
    };
  });
}
