/**
 * One-time migration: backfills `raId` on existing EsignSession documents.
 *
 * The "e-sign T&C once per RA" skip looks up prior signatures by `raId`, which
 * was added after these sessions were written. Without this backfill, customers
 * who signed before the feature shipped would be asked to sign once more before
 * the skip recognises them.
 *
 * RA id is resolved in two ways, most authoritative first:
 *   1. From the signed item itself — `serviceId` → service/portfolio/package
 *      `authorData.id`. Every session has a `serviceId`, so this covers rows
 *      whose `metadata.cartItem` is missing/empty (the common legacy case).
 *   2. Fallback to `metadata.cartItem.authorId` / `soldById` (client snapshot),
 *      used only when the item no longer exists.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillEsignRaId.ts
 *
 * Safe to run multiple times — only touches rows missing `raId`.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { EsignSessionModel } from "../models/EsignSessionModel";
import { ServiceModel } from "../models/PostModels";
import { Portfolio } from "../lib/schema";
import { PackageModel } from "../models/PackageModel";

// serviceId -> RA id, cached so repeat items aren't looked up twice.
const raCache = new Map<string, string | null>();

async function resolveRaFromServiceId(
  serviceId: string | undefined
): Promise<string | null> {
  if (!serviceId) return null;
  if (raCache.has(serviceId)) return raCache.get(serviceId) ?? null;

  let raId: string | null = null;
  try {
    for (const Model of [ServiceModel, Portfolio, PackageModel] as const) {
      const doc = (await (Model as any)
        .findById(serviceId)
        .select("authorData.id")
        .lean()) as any;
      if (doc?.authorData?.id) {
        raId = String(doc.authorData.id);
        break;
      }
    }
  } catch (err) {
    console.error("resolve RA from serviceId failed", { serviceId, err });
  }

  raCache.set(serviceId, raId);
  return raId;
}

async function backfill() {
  await mongoose.connect(process.env.MONGOOSE_URL as string);
  console.log("Connected to database");

  const sessions = await EsignSessionModel.find({
    $or: [{ raId: { $exists: false } }, { raId: null }, { raId: "" }],
  })
    .select("_id serviceId metadata")
    .lean();

  console.log(`Found ${sessions.length} eSign sessions without raId`);

  let viaItem = 0;
  let viaMetadata = 0;
  let skipped = 0;

  for (const s of sessions) {
    // 1. Authoritative: resolve from the signed item.
    let raId = await resolveRaFromServiceId(
      (s as any).serviceId ? String((s as any).serviceId) : undefined
    );
    let source: "item" | "metadata" | null = raId ? "item" : null;

    // 2. Fallback: client cart snapshot.
    if (!raId) {
      const cartItem = (s.metadata as any)?.cartItem ?? {};
      raId = cartItem.authorId ?? cartItem.soldById ?? null;
      if (raId) source = "metadata";
    }

    if (!raId) {
      skipped++;
      continue;
    }

    await EsignSessionModel.updateOne(
      { _id: s._id },
      { $set: { raId: String(raId) } }
    );
    if (source === "item") viaItem++;
    else viaMetadata++;
  }

  console.log(
    `Backfill complete: ${viaItem} via item, ${viaMetadata} via metadata, ` +
      `${skipped} skipped (item deleted & no metadata RA id)`
  );
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
