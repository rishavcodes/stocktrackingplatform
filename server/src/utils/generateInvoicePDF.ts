import PDFDocument from "pdfkit";
import { ToWords } from "to-words";
import { format } from "date-fns";

// Service Purchase Invoice (User buying RA service)
export interface ServiceInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  // Buyer
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerPan?: string;
  // Service Provider
  serviceProviderName: string;
  serviceProviderEmail: string;
  serviceProviderPhone: string;
  serviceProviderAddress: string;
  serviceProviderGST?: string;
  serviceProviderHSN?: string;
  serviceProviderRegNumber?: string;
  serviceProviderWebsite?: string;
  serviceProviderState?: string;
  // Service
  serviceName: string;
  validity: string;
  serviceStartDate: Date;
  serviceEndDate: Date;
  // Financial
  subtotal: number;
  gst: number;
  total: number;
  // Coupon (optional) — when discountAmount > 0 the invoice renders a
  // Discount line item between Subtotal (pre-discount) and GST. `subtotal`
  // is the post-discount amount that GST is computed on; the original price
  // is `subtotal + discountAmount`.
  discountAmount?: number;
  couponCode?: string;
}

// Tradebox Plan Invoice (Service Provider buying Tradebox plan)
export interface TradeboxPlanInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  // Buyer (Service Provider buying Tradebox plan)
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCity?: string;
  buyerGST?: string;
  buyerRegNum?: string;
  // Plan
  planName: string;
  validity: string;
  endDate: Date;
  // Financial
  subtotal: number;
  gst: number;
  total: number;
}

const colors = {
  primary: "#10b981",
  secondary: "#3b82f6",
  darkText: "#1f2937",
  mediumText: "#4b5563",
  lightText: "#6b7280",
  border: "#e5e7eb",
  lightBg: "#f8fafc",
  headerBg: "#059669",
};

const toWords = new ToWords({ localeCode: "en-IN" });

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function generateServiceInvoicePDF(
  data: ServiceInvoiceData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: "A4",
        bufferPages: true,
      });

      const chunks: Uint8Array[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      let currentY = 0;

      // ========== HEADER ==========
      doc.rect(0, 0, pageWidth, 80).fill(colors.headerBg);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("TAX INVOICE", margin, 25);

      // doc
      //   .fillColor("rgba(255, 255, 255, 0.9)")
      //   .font("Helvetica")
      //   .fontSize(10)
      //   .text("Trade Box Fintech Solutions", margin, 50);

      // doc
      //   .fillColor("rgba(255, 255, 255, 0.7)")
      //   .font("Helvetica")
      //   .fontSize(9)
      //   .text("www.tradeboxlive.com", margin, 63);

      currentY = 100;

      // ========== INVOICE INFO BAR ==========
      doc
        .rect(margin, currentY, contentWidth, 35)
        .fill(colors.lightBg)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`Invoice No: ${data.invoiceNumber}`, margin + 15, currentY + 12);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
          `Date: ${format(data.issueDate, "dd/MM/yyyy")}`,
          pageWidth - margin - 150,
          currentY + 12
        );

      currentY += 50;

      // ========== BILLING SECTION ==========
      const colWidth = (contentWidth - 20) / 2;

      // FROM Section (Service Provider)
      doc
        .rect(margin, currentY, colWidth, 140)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .rect(margin, currentY, colWidth, 25)
        .fill(colors.primary)
        .stroke(colors.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("FROM (Service Provider)", margin + 10, currentY + 8);

      let fromY = currentY + 35;
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(data.serviceProviderName, margin + 10, fromY, {
          width: colWidth - 20,
        });

      fromY += 18;
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text(`Email: ${data.serviceProviderEmail}`, margin + 10, fromY);

      fromY += 14;
      doc.text(`Phone: ${data.serviceProviderPhone}`, margin + 10, fromY);

      if (data.serviceProviderRegNumber) {
        fromY += 14;
        doc.text(
          `SEBI Reg: ${data.serviceProviderRegNumber}`,
          margin + 10,
          fromY
        );
      }

      if (data.serviceProviderGST) {
        fromY += 14;
        doc.text(`GSTIN: ${data.serviceProviderGST}`, margin + 10, fromY);
      }

      if (data.serviceProviderHSN) {
        fromY += 14;
        doc.text(`HSN Code: ${data.serviceProviderHSN}`, margin + 10, fromY);
      }

      if (data.serviceProviderAddress) {
        fromY += 14;
        doc.text(data.serviceProviderAddress, margin + 10, fromY, {
          width: colWidth - 20,
        });
      }

      // TO Section (Buyer)
      const toX = margin + colWidth + 20;
      doc
        .rect(toX, currentY, colWidth, 140)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .rect(toX, currentY, colWidth, 25)
        .fill(colors.secondary)
        .stroke(colors.secondary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("TO (Buyer)", toX + 10, currentY + 8);

      let toY = currentY + 35;
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(data.buyerName, toX + 10, toY, { width: colWidth - 20 });

      toY += 18;
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text(`Email: ${data.buyerEmail}`, toX + 10, toY);

      toY += 14;
      doc.text(`Phone: ${data.buyerPhone}`, toX + 10, toY);

      if (data.buyerPan) {
        toY += 14;
        doc.text(`PAN: ${data.buyerPan}`, toX + 10, toY);
      }

      currentY += 155;

      // ========== SERVICE DETAILS ==========
      doc
        .rect(margin, currentY, contentWidth, 25)
        .fill(colors.primary)
        .stroke(colors.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("SERVICE DETAILS", margin + 10, currentY + 7);

      currentY += 25;

      doc
        .rect(margin, currentY, contentWidth, 80)
        .stroke(colors.border)
        .lineWidth(0.5);

      let serviceY = currentY + 15;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Service Name:", margin + 15, serviceY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(data.serviceName, margin + 120, serviceY);

      serviceY += 20;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Validity:", margin + 15, serviceY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(data.validity, margin + 120, serviceY);

      serviceY += 20;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Service Period:", margin + 15, serviceY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
          `${format(data.serviceStartDate, "dd/MM/yyyy")} - ${format(
            data.serviceEndDate,
            "dd/MM/yyyy"
          )}`,
          margin + 120,
          serviceY
        );

      currentY += 95;

      // ========== FINANCIAL SUMMARY ==========
      doc
        .rect(margin, currentY, contentWidth, 25)
        .fill(colors.secondary)
        .stroke(colors.secondary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("FINANCIAL SUMMARY", margin + 10, currentY + 7);

      currentY += 25;

      // Grow the financial-summary box by one row (22pt) when a Discount
      // line is being inserted between Subtotal and GST.
      const hasDiscount = (data.discountAmount ?? 0) > 0;
      const summaryBoxHeight = hasDiscount ? 142 : 120;
      const summaryBlockHeight = hasDiscount ? 157 : 135;
      // The Subtotal line shows the pre-discount price when a coupon was
      // used, so the customer sees what they would have paid without the
      // deal. data.subtotal is already the post-discount amount GST is
      // computed on.
      const subtotalLine = hasDiscount
        ? data.subtotal + (data.discountAmount as number)
        : data.subtotal;

      doc
        .rect(margin, currentY, contentWidth, summaryBoxHeight)
        .stroke(colors.border)
        .lineWidth(0.5);

      const finX = pageWidth - margin - 200;
      let finY = currentY + 20;

      // Subtotal
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(10)
        .text("Subtotal:", finX, finY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica")
        .fontSize(10)
        .text(formatCurrency(subtotalLine), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 22;

      // Discount (only when a coupon was applied)
      if (hasDiscount) {
        const discountLabel = data.couponCode
          ? `Discount (Coupon ${data.couponCode}):`
          : "Discount:";
        doc
          .fillColor(colors.mediumText)
          .font("Helvetica")
          .fontSize(10)
          .text(discountLabel, finX, finY);

        // U+2212 minus sign keeps the typography aligned with the rest of
        // the rupee values rather than the narrower hyphen-minus.
        doc
          .fillColor(colors.darkText)
          .font("Helvetica")
          .fontSize(10)
          .text(
            `−${formatCurrency(data.discountAmount as number)}`,
            finX + 100,
            finY,
            { align: "right", width: 80 }
          );

        finY += 22;
      }

      // GST
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(10)
        .text("GST (18%):", finX, finY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica")
        .fontSize(10)
        .text(formatCurrency(data.gst), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 22;

      // Divider line
      doc
        .moveTo(finX, finY)
        .lineTo(finX + 180, finY)
        .stroke(colors.border)
        .lineWidth(1);

      finY += 10;

      // Total
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("TOTAL:", finX, finY);

      doc
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(formatCurrency(data.total), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 25;

      // Amount in words
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica-Oblique")
        .fontSize(9)
        .text(
          `Amount in Words: ${toWords.convert(data.total, { currency: true })}`,
          margin + 15,
          finY,
          { width: contentWidth - 30 }
        );

      currentY += summaryBlockHeight;

      // ========== FOOTER ==========
      doc
        .rect(margin, currentY, contentWidth, 60)
        .fill(colors.lightBg)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .fillColor(colors.lightText)
        .font("Helvetica")
        .fontSize(8)
        .text(
          "This is a computer-generated invoice and does not require a physical signature.",
          margin + 15,
          currentY + 25,
          { width: contentWidth - 30, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateTradeboxPlanInvoicePDF(
  data: TradeboxPlanInvoiceData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: "A4",
        bufferPages: true,
      });

      const chunks: Uint8Array[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      let currentY = 0;

      // ========== HEADER ==========
      doc.rect(0, 0, pageWidth, 80).fill(colors.headerBg);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("TAX INVOICE", margin, 25);

      doc
        .fillColor("rgba(255, 255, 255, 0.9)")
        .font("Helvetica")
        .fontSize(10)
        .text("Trade Box Fintech Solutions", margin, 50);

      doc
        .fillColor("rgba(255, 255, 255, 0.7)")
        .font("Helvetica")
        .fontSize(9)
        .text("www.tradeboxlive.com", margin, 63);

      currentY = 100;

      // ========== INVOICE INFO BAR ==========
      doc
        .rect(margin, currentY, contentWidth, 35)
        .fill(colors.lightBg)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`Invoice No: ${data.invoiceNumber}`, margin + 15, currentY + 12);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(
          `Date: ${format(data.issueDate, "dd/MM/yyyy")}`,
          pageWidth - margin - 150,
          currentY + 12
        );

      currentY += 50;

      // ========== BILLING SECTION ==========
      const colWidth = (contentWidth - 20) / 2;

      // FROM Section (Trade Box)
      doc
        .rect(margin, currentY, colWidth, 130)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .rect(margin, currentY, colWidth, 25)
        .fill(colors.primary)
        .stroke(colors.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("FROM", margin + 10, currentY + 8);

      let fromY = currentY + 35;
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Trade Box Fintech Solutions", margin + 10, fromY, {
          width: colWidth - 20,
        });

      fromY += 18;
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Email: info@tradeboxlive.com", margin + 10, fromY);

      fromY += 14;
      doc.text("Website: www.tradeboxlive.com", margin + 10, fromY);

      // TO Section (Service Provider / Buyer)
      const toX = margin + colWidth + 20;
      doc
        .rect(toX, currentY, colWidth, 130)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .rect(toX, currentY, colWidth, 25)
        .fill(colors.secondary)
        .stroke(colors.secondary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("TO (Subscriber)", toX + 10, currentY + 8);

      let toY = currentY + 35;
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(data.buyerName, toX + 10, toY, { width: colWidth - 20 });

      toY += 18;
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text(`Email: ${data.buyerEmail}`, toX + 10, toY);

      toY += 14;
      doc.text(`Phone: ${data.buyerPhone}`, toX + 10, toY);

      if (data.buyerCity) {
        toY += 14;
        doc.text(`City: ${data.buyerCity}`, toX + 10, toY);
      }

      if (data.buyerGST) {
        toY += 14;
        doc.text(`GSTIN: ${data.buyerGST}`, toX + 10, toY);
      }

      if (data.buyerRegNum) {
        toY += 14;
        doc.text(`Reg No: ${data.buyerRegNum}`, toX + 10, toY);
      }

      currentY += 145;

      // ========== PLAN DETAILS ==========
      doc
        .rect(margin, currentY, contentWidth, 25)
        .fill(colors.primary)
        .stroke(colors.primary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("PLAN DETAILS", margin + 10, currentY + 7);

      currentY += 25;

      doc
        .rect(margin, currentY, contentWidth, 80)
        .stroke(colors.border)
        .lineWidth(0.5);

      let planY = currentY + 15;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Plan Name:", margin + 15, planY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(data.planName, margin + 120, planY);

      planY += 20;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Validity:", margin + 15, planY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(data.validity, margin + 120, planY);

      planY += 20;

      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text("Valid Until:", margin + 15, planY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(format(data.endDate, "dd/MM/yyyy"), margin + 120, planY);

      currentY += 95;

      // ========== FINANCIAL SUMMARY ==========
      doc
        .rect(margin, currentY, contentWidth, 25)
        .fill(colors.secondary)
        .stroke(colors.secondary);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("FINANCIAL SUMMARY", margin + 10, currentY + 7);

      currentY += 25;

      doc
        .rect(margin, currentY, contentWidth, 120)
        .stroke(colors.border)
        .lineWidth(0.5);

      const finX = pageWidth - margin - 200;
      let finY = currentY + 20;

      // Subtotal
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(10)
        .text("Subtotal:", finX, finY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica")
        .fontSize(10)
        .text(formatCurrency(data.subtotal), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 22;

      // GST
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(10)
        .text("GST (18%):", finX, finY);

      doc
        .fillColor(colors.darkText)
        .font("Helvetica")
        .fontSize(10)
        .text(formatCurrency(data.gst), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 22;

      // Divider line
      doc
        .moveTo(finX, finY)
        .lineTo(finX + 180, finY)
        .stroke(colors.border)
        .lineWidth(1);

      finY += 10;

      // Total
      doc
        .fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("TOTAL:", finX, finY);

      doc
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(formatCurrency(data.total), finX + 100, finY, {
          align: "right",
          width: 80,
        });

      finY += 25;

      // Amount in words
      doc
        .fillColor(colors.mediumText)
        .font("Helvetica-Oblique")
        .fontSize(9)
        .text(
          `Amount in Words: ${toWords.convert(data.total, { currency: true })}`,
          margin + 15,
          finY,
          { width: contentWidth - 30 }
        );

      currentY += 135;

      // ========== FOOTER ==========
      doc
        .rect(margin, currentY, contentWidth, 60)
        .fill(colors.lightBg)
        .stroke(colors.border)
        .lineWidth(0.5);

      doc
        .fillColor(colors.lightText)
        .font("Helvetica")
        .fontSize(8)
        .text(
          "This is a computer-generated invoice and does not require a physical signature.",
          margin + 15,
          currentY + 15,
          { width: contentWidth - 30, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
