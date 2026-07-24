// S3 invoice URLs look like:
//   https://{bucket}.s3.amazonaws.com/Invoices/serviceproviderplans/{buyerName}/Invoice_{invoiceNumber}.pdf-{uniqid}
// Returns the embedded invoice number (e.g. "-0001-26/27") or null if the
// URL is missing or doesn't match the expected shape.
export function parseInvoiceNumberFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/Invoice_(.+)\.pdf-[a-z0-9]+$/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
