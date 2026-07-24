import axios from "axios";
import cron from "node-cron";
import AdmZip from "adm-zip";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { BigulScriptMasterModel } from "../models/BigulScriptMasterModel";
import { getBigulMasterCsvUrl } from "../config/bigul";

/**
 * Maps CSV filenames inside the zip to Bigul exchange segments.
 * Keys are lowercase so we can match case-insensitively.
 */
const FILE_SEGMENT_MAP: Record<string, string> = {
  "nseequitymaster.csv": "nse_cm",
  "bseequitymaster.csv": "bse_cm",
  "nsederivmaster.csv": "nse_fo",
  "bsederivmaster.csv": "bse_fo",
  "mcxmaster.csv": "mcx_fo",
  "cdsmaster.csv": "cde_fo",
};

/**
 * Normalise a single CSV row into the unified schema.
 * Column names vary across segment files; this handles all known variants.
 */
function normaliseRow(row: Record<string, string>, segment: string) {
  return {
    segment,
    scripCode: String(row.ScripCode ?? row.scripCode ?? "").trim(),
    exch: String(row.Exch ?? row.exch ?? "").trim(),
    name: String(row.Name ?? row.name ?? "").trim(),
    tradingSymbol: String(
      row.TradingSymbol ?? row.tradingSymbol ?? row.Symbol ?? ""
    ).trim(),
    desc: String(row.Desc ?? row.desc ?? row.Description ?? "").trim(),
    tickSize: String(row.TickSize ?? row.tickSize ?? "").trim(),
    series: String(row.Series ?? row.series ?? "").trim(),
    lotSize: String(
      row.MinimumL ?? row.minimumL ?? row.LotQty ?? row.lotQty ?? "1"
    ).trim(),
    instrumentType: String(
      row.OFISType ?? row.oFISType ?? row.InstrumentType ?? ""
    ).trim(),
    cpType: String(row.CPType ?? row.cpType ?? "").trim(),
    strikePrice: String(
      row.StrikePrice ?? row.strikePrice ?? ""
    ).trim(),
    expiryDate: String(
      row.ExpiryDate ?? row.expiryDate ?? row.Expiry ?? ""
    ).trim(),
    underlyingToken: String(
      row.UnderlyingToken ?? row.underlyingToken ?? ""
    ).trim(),
  };
}

/** Parse a CSV buffer into an array of objects using csv-parser. */
function parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csvParser())
      .on("data", (row: Record<string, string>) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function syncBigulScriptMasterData() {
  console.log("BigulScriptMaster sync: Starting...");
  const start = Date.now();

  try {
    const url = getBigulMasterCsvUrl();
    const { data: zipBuffer } = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120_000,
    });

    const zip = new AdmZip(Buffer.from(zipBuffer));
    const entries = zip.getEntries();

    let totalUpserted = 0;
    let totalModified = 0;
    const allSegmentKeys = new Set<string>();

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const filename = entry.entryName.split("/").pop()?.toLowerCase() ?? "";
      const segment = FILE_SEGMENT_MAP[filename];
      if (!segment) continue;

      console.log(`BigulScriptMaster sync: Processing ${entry.entryName} → ${segment}`);

      const csvBuffer = entry.getData();
      const rows = await parseCsvBuffer(csvBuffer);

      const bulkOps = rows
        .map((row) => normaliseRow(row, segment))
        .filter((r) => r.scripCode)
        .map((r) => {
          allSegmentKeys.add(`${r.segment}:${r.scripCode}`);
          return {
            updateOne: {
              filter: { segment: r.segment, scripCode: r.scripCode },
              update: { $set: r },
              upsert: true,
            },
          };
        });

      const BATCH_SIZE = 5000;
      for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
        const batch = bulkOps.slice(i, i + BATCH_SIZE);
        const result = await BigulScriptMasterModel.bulkWrite(batch, {
          ordered: false,
        });
        totalModified += result.modifiedCount;
        totalUpserted += result.upsertedCount;
      }

      console.log(
        `BigulScriptMaster sync: ${segment} — ${rows.length} rows processed`
      );
    }

    // Remove stale entries that no longer appear in the fresh CSV data
    const allSegments = Object.values(FILE_SEGMENT_MAP);
    const existingDocs = await BigulScriptMasterModel.find(
      { segment: { $in: allSegments } },
      { segment: 1, scripCode: 1, _id: 1 }
    ).lean();

    const staleIds = existingDocs
      .filter((doc) => !allSegmentKeys.has(`${doc.segment}:${doc.scripCode}`))
      .map((doc) => doc._id);

    if (staleIds.length > 0) {
      await BigulScriptMasterModel.deleteMany({ _id: { $in: staleIds } });
      console.log(
        `BigulScriptMaster sync: Removed ${staleIds.length} stale entries`
      );
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `BigulScriptMaster sync: Done in ${elapsed}s — ${totalUpserted} new, ${totalModified} updated`
    );
  } catch (error) {
    console.error("BigulScriptMaster sync failed:", error);
  }
}

export function startBigulScriptMasterSync() {
  // Daily at 8:20 AM IST (5 min after Angel One sync at 8:15 AM)
  cron.schedule("20 8 * * *", () => {
    syncBigulScriptMasterData();
  });

  // Run immediately on startup if collection is empty
  BigulScriptMasterModel.estimatedDocumentCount().then((count) => {
    if (count === 0) {
      console.log(
        "BigulScriptMaster sync: Collection empty, running initial sync..."
      );
      syncBigulScriptMasterData();
    } else {
      console.log(
        `BigulScriptMaster sync: ${count} entries already present, scheduled for 8:20 AM IST`
      );
    }
  });

  console.log("BigulScriptMaster sync cron registered (daily at 8:20 AM IST)");
}

export { syncBigulScriptMasterData };
