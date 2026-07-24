import axios from "axios";
import cron from "node-cron";
import { ScriptMasterModel } from "../models/ScriptMasterModel";

const SCRIP_MASTER_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

// Only sync exchanges used by the platform
const ALLOWED_EXCHANGES = new Set(["NSE", "BSE", "NFO", "BFO", "MCX"]);

async function syncScriptMasterData() {
  console.log("ScriptMaster sync: Starting...");
  const start = Date.now();

  try {
    const { data } = await axios.get(SCRIP_MASTER_URL, {
      timeout: 360000, // 60s timeout for the large file
    });

    if (!Array.isArray(data) || data.length === 0) {
      console.error("ScriptMaster sync: Invalid or empty data received");
      return;
    }

    // Filter to only the exchanges we need
    const filtered = data.filter((item: any) =>
      ALLOWED_EXCHANGES.has(item.exch_seg)
    );

    console.log(
      `ScriptMaster sync: Fetched ${data.length} total, ${filtered.length} relevant entries`
    );

    // Build bulk operations — upsert each entry by token + exch_seg
    const bulkOps = filtered.map((item: any) => ({
      updateOne: {
        filter: { token: item.token, exch_seg: item.exch_seg },
        update: {
          $set: {
            token: item.token,
            symbol: item.symbol,
            name: item.name,
            expiry: item.expiry || "",
            strike: item.strike || "0.000000",
            lotsize: item.lotsize || "1",
            instrumenttype: item.instrumenttype || "",
            exch_seg: item.exch_seg,
            tick_size: item.tick_size || "0.000000",
          },
        },
        upsert: true,
      },
    }));

    // Execute in batches of 5000 to avoid memory spikes
    const BATCH_SIZE = 5000;
    let totalModified = 0;
    let totalUpserted = 0;

    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      const result = await ScriptMasterModel.bulkWrite(batch, {
        ordered: false,
      });
      totalModified += result.modifiedCount;
      totalUpserted += result.upsertedCount;
    }

    // Remove entries that no longer exist in the source
    // Collect all token+exch_seg pairs from the fresh data
    const freshTokens = new Set(
      filtered.map((item: any) => `${item.token}:${item.exch_seg}`)
    );

    // Find and delete stale entries (only for the exchanges we track)
    const existingDocs = await ScriptMasterModel.find(
      { exch_seg: { $in: [...ALLOWED_EXCHANGES] } },
      { token: 1, exch_seg: 1, _id: 1 }
    ).lean();

    const staleIds = existingDocs
      .filter((doc) => !freshTokens.has(`${doc.token}:${doc.exch_seg}`))
      .map((doc) => doc._id);

    if (staleIds.length > 0) {
      await ScriptMasterModel.deleteMany({ _id: { $in: staleIds } });
      console.log(`ScriptMaster sync: Removed ${staleIds.length} stale entries`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `ScriptMaster sync: Done in ${elapsed}s — ${totalUpserted} new, ${totalModified} updated`
    );
  } catch (error) {
    console.error("ScriptMaster sync failed:", error);
  }
}

export function startScriptMasterSync() {
  // Run daily at 6:00 AM IST (00:30 UTC)
  cron.schedule("15 8 * * *", () => {
    syncScriptMasterData();
  });

  // Also run immediately on server start to populate data if empty
  ScriptMasterModel.estimatedDocumentCount().then((count) => {
    if (count === 0) {
      console.log("ScriptMaster sync: Collection empty, running initial sync...");
      syncScriptMasterData();
    } else {
      console.log(`ScriptMaster sync: ${count} entries already present, scheduled for 6 AM IST`);
    }
  });

  console.log("ScriptMaster sync cron registered (daily at 6:00 AM IST)");
}

// Export for manual trigger via API
export { syncScriptMasterData };
