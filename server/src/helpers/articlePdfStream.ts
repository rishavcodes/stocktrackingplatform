import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/**
 * Thrown when the bytes stored in S3 for an article's PDF aren't actually
 * a PDF. This is a data problem (a non-PDF was uploaded before the upload
 * fileFilter existed, or the object was truncated/corrupted), not a system
 * failure — callers should handle it as 422 + a clear user-facing message
 * rather than crashing into a 500 + an `error`-level stack trace.
 */
export class InvalidArticlePdfError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly size: number,
    public readonly header: string
  ) {
    super(message);
    this.name = "InvalidArticlePdfError";
  }
}

/**
 * Thrown when the source PDF is valid but pdf-lib fails to load, watermark,
 * or save it (e.g. an unsupported PDF feature, a parser quirk, or a save-side
 * issue). Distinct from `InvalidArticlePdfError` so callers can separate
 * "bad input" from "watermarking pipeline broke on otherwise-valid input".
 */
export class WatermarkFailedError extends Error {
  constructor(
    message: string,
    public readonly key: string,
    public readonly stage:
      | "load"
      | "copy"
      | "embed-font"
      | "draw"
      | "save"
      | "verify",
    public readonly cause: unknown
  ) {
    super(message);
    this.name = "WatermarkFailedError";
  }
}

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

/**
 * Parse the bucket + key out of an S3 URL we previously persisted on
 * `articlePDF`. Supports both the virtual-hosted ("bucket.s3.region…") and
 * path-style ("s3.region.amazonaws.com/bucket/…") forms.
 */
export function parseS3Url(
  url: string
): { bucket: string; key: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const pathname = decodeURIComponent(u.pathname.replace(/^\//, ""));

    const virtualMatch = host.match(/^([^.]+)\.s3[.-][^.]+\.amazonaws\.com$/);
    if (virtualMatch) {
      return { bucket: virtualMatch[1], key: pathname };
    }

    if (/^s3[.-][^.]+\.amazonaws\.com$/.test(host)) {
      const slash = pathname.indexOf("/");
      if (slash <= 0) return null;
      return {
        bucket: pathname.slice(0, slash),
        key: pathname.slice(slash + 1),
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetch the article PDF from S3 and stamp a watermark on every page.
 * The watermark identifies the viewer so any leaked copy traces back to
 * the user that opened it.
 */
export async function fetchAndWatermarkArticlePdf(
  pdfUrl: string,
  watermarkText: string
): Promise<Buffer> {
  const parsed = parseS3Url(pdfUrl);
  if (!parsed) {
    throw new Error("Article PDF URL does not point to a recognized S3 bucket");
  }

  const obj = await s3.send(
    new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key })
  );

  if (!obj.Body) {
    throw new Error("Empty S3 response body for article PDF");
  }

  const sourceBuf = await streamToBuffer(obj.Body as NodeJS.ReadableStream);

  // A valid PDF must start with "%PDF-". If the stored object isn't a PDF
  // (e.g. a wrong file was uploaded, the upload was truncated, or an HTML
  // error body was persisted by mistake) pdf-lib throws a cryptic
  // MissingPDFHeaderError deep in parseHeader. Fail fast with a clearer
  // message so operators can identify the broken record from logs.
  const header = sourceBuf.subarray(0, 5).toString("latin1");
  if (header !== "%PDF-") {
    throw new InvalidArticlePdfError(
      `Article PDF in S3 is not a valid PDF`,
      parsed.key,
      sourceBuf.length,
      header
    );
  }

  // Each pdf-lib step is wrapped so a failure surfaces with the stage that
  // broke, instead of bubbling up as an opaque "rendering failed" error in
  // the browser. We deliberately don't edit `sourceDoc` in place — pdf-lib's
  // in-place edit path silently drops pages on some real-world PDFs (Word /
  // Acrobat exports with object streams, non-standard page trees). Instead
  // we copy every page into a fresh document and watermark that, then
  // verify the page count round-trips before returning.
  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(sourceBuf, { ignoreEncryption: true });
  } catch (err) {
    throw new WatermarkFailedError(
      "pdf-lib failed to load the source PDF",
      parsed.key,
      "load",
      err
    );
  }

  const sourcePageCount = sourceDoc.getPageCount();
  console.log("fetchAndWatermarkArticlePdf: source loaded", {
    key: parsed.key,
    size: sourceBuf.length,
    pageCount: sourcePageCount,
  });

  let outDoc: PDFDocument;
  try {
    outDoc = await PDFDocument.create();
    const copied = await outDoc.copyPages(
      sourceDoc,
      sourceDoc.getPageIndices()
    );
    for (const p of copied) outDoc.addPage(p);
  } catch (err) {
    throw new WatermarkFailedError(
      "pdf-lib failed to copy pages into the output document",
      parsed.key,
      "copy",
      err
    );
  }

  if (outDoc.getPageCount() !== sourcePageCount) {
    throw new WatermarkFailedError(
      `page count changed during copy: source=${sourcePageCount}, copied=${outDoc.getPageCount()}`,
      parsed.key,
      "copy",
      null
    );
  }

  let font;
  try {
    font = await outDoc.embedFont(StandardFonts.Helvetica);
  } catch (err) {
    throw new WatermarkFailedError(
      "pdf-lib failed to embed the watermark font",
      parsed.key,
      "embed-font",
      err
    );
  }

  const fontSize = 14;
  const colour = rgb(0.6, 0.6, 0.6);

  try {
    for (const page of outDoc.getPages()) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
      page.drawText(watermarkText, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size: fontSize,
        font,
        color: colour,
        opacity: 0.25,
        rotate: degrees(45),
      });
    }
  } catch (err) {
    throw new WatermarkFailedError(
      "pdf-lib failed to draw watermark on a page",
      parsed.key,
      "draw",
      err
    );
  }

  // `useObjectStreams: false` is the standard mitigation for pdf-lib's
  // save-side page-loss bug — object streams can confuse some downstream
  // PDF parsers and have been linked to silent page drops.
  let out: Uint8Array;
  try {
    out = await outDoc.save({ useObjectStreams: false });
  } catch (err) {
    throw new WatermarkFailedError(
      "pdf-lib failed to save the watermarked PDF",
      parsed.key,
      "save",
      err
    );
  }

  // Verify round-trip: parse the saved bytes back and confirm the page
  // count matches the source. If pdf-lib silently dropped pages on save,
  // this is where it surfaces — the controller's catch then falls back to
  // the raw S3 PDF so the user sees all pages (without watermark).
  const outBuf = Buffer.from(out);
  try {
    const verifyDoc = await PDFDocument.load(outBuf, {
      ignoreEncryption: true,
    });
    const verifyPageCount = verifyDoc.getPageCount();
    console.log("fetchAndWatermarkArticlePdf: watermarked output verified", {
      key: parsed.key,
      size: outBuf.length,
      sourcePageCount,
      verifyPageCount,
    });
    if (verifyPageCount !== sourcePageCount) {
      throw new WatermarkFailedError(
        `page count changed during save: source=${sourcePageCount}, saved=${verifyPageCount}`,
        parsed.key,
        "verify",
        null
      );
    }
  } catch (err) {
    if (err instanceof WatermarkFailedError) throw err;
    throw new WatermarkFailedError(
      "pdf-lib failed to re-parse the watermarked PDF for verification",
      parsed.key,
      "verify",
      err
    );
  }

  return outBuf;
}

/**
 * Fetch the raw, un-watermarked PDF from S3. Intended for the env-gated
 * `?raw=1` debug bypass on the stream endpoint — DO NOT call from any path
 * that serves to subscribers, since it defeats the per-viewer watermark.
 */
export async function fetchRawArticlePdf(pdfUrl: string): Promise<Buffer> {
  const parsed = parseS3Url(pdfUrl);
  if (!parsed) {
    throw new Error("Article PDF URL does not point to a recognized S3 bucket");
  }
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key })
  );
  if (!obj.Body) {
    throw new Error("Empty S3 response body for article PDF");
  }
  return streamToBuffer(obj.Body as NodeJS.ReadableStream);
}
