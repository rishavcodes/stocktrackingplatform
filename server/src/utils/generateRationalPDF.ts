import PDFDocument from "pdfkit";
import axios from "axios";
import { format } from "date-fns";
import path from "path";
import fs from "fs";

interface GenerateRationalPDFOptions {
  scorecard: any;
  rationalText: string;
  raName: string;
  raRegistration: string;
  imageBuffer?: Buffer;
  scriptname?: string;
  exchange?: string;
  entryType?: string;
  entryPrice?: number;
  target?: number;
  targets?: Array<{ price: number; isHit?: boolean; hitAt?: Date }>;
  stoploss?: number;
  validity?: string;
  riskRewardRatio?: string;
  lotsize?: string;
  raDetails?: {
    RegName?: string;
    name?: string;
    companyName?: string;
    email?: string;
    number?: string | number;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    website?: string;
    profileUrl?: string;
    disclaimer?: string;
    AboutMe?: string;
    complianceOfficerName?: string;
    complianceOfficerEmail?: string;
    complianceOfficerNumber?: string;
    regNumber?: string;
    [key: string]: any;
  };
  raSignature?: string;
}

export async function generateRationalPDF(
  options: GenerateRationalPDFOptions,
  returnBuffer: boolean = true
): Promise<string | Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: "A4",
        bufferPages: true,
      });

      const colors = {
        primary: "#10b981",
        secondary: "#3b82f6",
        accent: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        lightBg: "#f8fafc",
        darkText: "#1f2937",
        mediumText: "#4b5563",
        lightText: "#6b7280",
        border: "#e5e7eb",
      };

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Result handling
      if (returnBuffer) {
        const chunks: Uint8Array[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      } else {
        const reportsDir = path.join(process.cwd(), "reports");
        if (!fs.existsSync(reportsDir))
          fs.mkdirSync(reportsDir, { recursive: true });
        const filePath = path.join(reportsDir, `rational-${Date.now()}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        stream.on("finish", () => resolve(filePath));
      }

      // ========== HEADER & FOOTER FUNCTIONS ==========
      const drawHeader = () => {
        doc.rect(0, 0, pageWidth, 60).fill(colors.primary);
        
        doc.fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(16)
          .text("TRADE RATIONALE", margin, 20);

        doc.fillColor("rgba(255, 255, 255, 0.8)")
          .font("Helvetica")
          .fontSize(9)
          .text(format(new Date(), "dd MMM yyyy, HH:mm"), margin, 42);

        doc.fillColor("rgba(255, 255, 255, 0.7)")
          .font("Helvetica")
          .fontSize(7)
          .text(
            `Doc ID: ${options.scorecard?._id || "TRD-" + Date.now()}`,
            pageWidth - margin - 100,
            42
          );

        return 70; // Header height + spacing
      };

      const drawSignatureSection = () => {
        const signatureY = pageHeight - 60;

        doc.moveTo(margin, signatureY - 20)
          .lineTo(pageWidth - margin, signatureY - 20)
          .stroke("#d1d5db")
          .lineWidth(0.5)
          .dash(3, { space: 3 });

        // Left: Digital Signature
        if (options.raSignature) {
          try {
            const signatureBuffer = Buffer.from(
              options.raSignature.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            );
            doc.image(signatureBuffer, margin + 10, signatureY - 25, {
              width: 100,
              height: 25,
            });
          } catch (error) {
            doc.fillColor(colors.mediumText)
              .font("Helvetica-Oblique")
              .fontSize(8)
              .text("Digitally Signed", margin + 10, signatureY - 20, {
                width: 100,
                align: "center",
              });
          }
        }

        doc.moveTo(margin + 10, signatureY + 10)
          .lineTo(margin + 110, signatureY + 10)
          .stroke(colors.mediumText)
          .lineWidth(0.5);

        doc.fillColor(colors.darkText)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(
            options.raName ||
              options.raDetails?.RegName ||
              options.raDetails?.name ||
              "N/A",
            margin + 10,
            signatureY + 12,
            { width: 100, align: "center" }
          );

        doc.fillColor(colors.mediumText)
          .font("Helvetica")
          .fontSize(7)
          .text(
            `SEBI Reg: ${
              options.raRegistration || options.raDetails?.regNumber || "N/A"
            }`,
            margin + 10,
            signatureY + 23,
            { width: 100, align: "center" }
          );

        
       

       

        // Page number
        const pages = doc.bufferedPageRange();
        doc.fillColor(colors.lightText)
          .font("Helvetica")
          .fontSize(7)
          .text(
            `Page ${pages.start + 1}`,
            pageWidth - margin - 30,
            pageHeight - 15
          );
      };

      const drawWatermark = () => {
        
      };

      // ========== PAGE EVENT HANDLER ==========
      doc.on("pageAdded", () => {
        drawHeader();
        drawSignatureSection();
        drawWatermark();
      });

      // ========== FIRST PAGE ==========
      let currentY = drawHeader();
      
      // Draw signature and watermark on first page immediately
      drawSignatureSection();
      drawWatermark();

      // === RA PROFILE ===
      const profileBoxHeight = 65;
      doc.rect(margin, currentY, contentWidth, profileBoxHeight)
        .fill("#f0fdf4")
        .stroke("#bbf7d0")
        .lineWidth(1);

      const profileX = margin + 10;
      const profileY = currentY + 10;

      // Profile Image
      if (options.raDetails?.profileUrl) {
        try {
          const profileResponse = await axios.get(
            options.raDetails.profileUrl,
            {
              responseType: "arraybuffer",
              timeout: 3000,
            }
          );
          const profileBuffer = Buffer.from(profileResponse.data);
          doc.save();
          doc.circle(profileX + 25, profileY + 25, 25);
          doc.clip();
          doc.image(profileBuffer, profileX, profileY, {
            width: 50,
            height: 50,
            fit: [50, 50],
          });
          doc.restore();
        } catch (error) {
          doc.circle(profileX + 25, profileY + 25, 25).fill(colors.secondary);
          doc.fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(12)
            .text(
              (options.raName || "RA").charAt(0),
              profileX + 20,
              profileY + 15
            );
        }
      } else {
        doc.circle(profileX + 25, profileY + 25, 25).fill(colors.secondary);
        doc.fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(
            (options.raName || "RA").charAt(0),
            profileX + 20,
            profileY + 15
          );
      }

      const raInfoX = profileX + 60;
      doc.fillColor(colors.primary)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("RESEARCH ANALYST", raInfoX, profileY);

      doc.fillColor(colors.darkText)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          options.raName ||
            options.raDetails?.RegName ||
            options.raDetails?.name ||
            "N/A",
          raInfoX,
          profileY + 12
        );

      doc.fillColor(colors.mediumText)
        .font("Helvetica")
        .fontSize(9)
        .text(
          `SEBI Reg: ${
            options.raRegistration || options.raDetails?.regNumber || "N/A"
          }`,
          raInfoX,
          profileY + 27
        );

      if (options.raDetails?.companyName) {
        doc.fillColor(colors.lightText)
          .font("Helvetica")
          .fontSize(8)
          .text(options.raDetails.companyName, raInfoX, profileY + 39, {
            width: 150,
          });
      }

      currentY += profileBoxHeight + 15;

      // ========== TRADE DETAILS ==========
      doc.rect(margin, currentY, contentWidth, 12)
        .fill("#10b981")
        .stroke("#10b981");

      doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("TRADE DETAILS", margin + 10, currentY + 3);

      currentY += 17;

      const tradeCellHeight = 28;
      const tradeCellWidth = (contentWidth - 20) / 4;
      const tradeSectionHeight = tradeCellHeight * 3 + 20;
      
      doc.rect(margin, currentY, contentWidth, tradeSectionHeight)
        .stroke("#d1d5db")
        .lineWidth(0.5);

      const tradeContentY = currentY + 10;

      const tradeData = [
        {
          label: "SCRIPT",
          value: options.scriptname || options.scorecard?.scriptname || "N/A",
        },
        {
          label: "EXCHANGE",
          value: options.exchange || options.scorecard?.exchange || "N/A",
        },
        {
          label: "ACTION",
          value: (options.entryType || "BUY").toUpperCase(),
          color:
            (options.entryType || "").toUpperCase() === "SELL"
              ? colors.danger
              : colors.accent,
        },
        {
          label: "VALIDITY",
          value: options.validity || options.scorecard?.validity || "Intraday",
        },
      ];

      tradeData.forEach((item, index) => {
        const x = margin + 10 + index * tradeCellWidth;
        const y = tradeContentY;

        doc.rect(x, y, tradeCellWidth - 10, tradeCellHeight)
          .fill("#ffffff")
          .stroke("#e5e7eb")
          .lineWidth(0.5);

        doc.fillColor(colors.mediumText)
          .font("Helvetica")
          .fontSize(8)
          .text(item.label, x + 8, y + 7);

        doc.fillColor(item.color || colors.darkText)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(item.value, x + 8, y + 20, {
            width: tradeCellWidth - 20,
          });
      });

      const priceData: Array<{ label: string; value: string; color?: string }> = [
        {
          label: "ENTRY PRICE",
          value: `Rs. ${Number(
            options.entryPrice || options.scorecard?.entryPrice || 0
          ).toFixed(2)}`,
        },
      ];

      const targetsArr = options.targets || options.scorecard?.targets || [];
      if (targetsArr.length > 1) {
        targetsArr.forEach((t: any, i: number) => {
          priceData.push({
            label: `TARGET ${i + 1}`,
            value: `Rs. ${Number(t.price).toFixed(2)}`,
            color: colors.accent,
          });
        });
      } else {
        priceData.push({
          label: "TARGET",
          value: `Rs. ${Number(
            options.target || options.scorecard?.target || 0
          ).toFixed(2)}`,
          color: colors.accent,
        });
      }

      priceData.push(
        {
          label: "STOP LOSS",
          value: `Rs. ${Number(
            options.stoploss || options.scorecard?.stoploss || 0
          ).toFixed(2)}`,
          color: colors.danger,
        },
        {
          label: "LOT SIZE",
          value: options.lotsize || options.scorecard?.lotsize || "N/A",
        },
      );

      const priceColsPerRow = Math.min(priceData.length, 4);
      const priceCellWidth = (contentWidth - 20) / priceColsPerRow;

      priceData.forEach((item, index) => {
        const row = Math.floor(index / priceColsPerRow);
        const col = index % priceColsPerRow;
        const x = margin + 10 + col * priceCellWidth;
        const y = tradeContentY + tradeCellHeight + row * tradeCellHeight;

        doc.rect(x, y, priceCellWidth - 10, tradeCellHeight)
          .fill("#ffffff")
          .stroke("#e5e7eb")
          .lineWidth(0.5);

        doc.fillColor(colors.mediumText)
          .font("Helvetica")
          .fontSize(8)
          .text(item.label, x + 8, y + 7);

        doc.fillColor(item.color || colors.darkText)
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(item.value, x + 8, y + 20, {
            width: priceCellWidth - 20,
          });
      });

      currentY += tradeSectionHeight + 20;

      // ========== KEY METRICS ==========
      doc.rect(margin, currentY, contentWidth, 12)
        .fill("#3b82f6")
        .stroke("#3b82f6");

      doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("KEY METRICS", margin + 10, currentY + 3);

      currentY += 17;

      const metricWidth = contentWidth / 3;
      const metricHeight = 25;
      const metricsContainerHeight = metricHeight + 15;
      
      doc.rect(margin, currentY, contentWidth, metricsContainerHeight)
        .fill("#eff6ff")
        .stroke("#dbeafe")
        .lineWidth(0.5);

      const calculateAbsoluteValues = () => {
        const entry = options.entryPrice || options.scorecard?.entryPrice || 0;
        const allTargets = options.targets || options.scorecard?.targets || [];
        const finalTarget = allTargets.length > 0
          ? Number(allTargets[allTargets.length - 1].price)
          : (options.target || options.scorecard?.target || 0);
        const stoploss = options.stoploss || options.scorecard?.stoploss || 0;
        
        const action = (options.entryType || "BUY").toUpperCase();
        
        let potentialReward = action === "BUY" ? finalTarget - entry : entry - finalTarget;
        let potentialRisk = action === "BUY" ? entry - stoploss : stoploss - entry;
        
        return {
          reward: Math.abs(potentialReward),
          risk: Math.abs(potentialRisk)
        };
      };

      const absoluteValues = calculateAbsoluteValues();

      const metrics = [
        {
          label: "RISK-REWARD RATIO",
          value: options.riskRewardRatio || "1:2",
          color: colors.warning,
        },
        {
          label: "POTENTIAL RISK",
          value: `Rs. ${absoluteValues.risk.toFixed(2)}`,
          color: colors.danger,
        },
        {
          label: "POTENTIAL REWARD",
          value: `Rs. ${absoluteValues.reward.toFixed(2)}`,
          color: colors.accent,
        }
      ];

      metrics.forEach((metric, index) => {
        const x = margin + 15 + index * metricWidth;
        const y = currentY + 8;

        doc.rect(x, y, metricWidth - 20, metricHeight)
          .fill("#ffffff")
          .stroke("#dbeafe")
          .lineWidth(0.5);

        doc.fillColor(colors.mediumText)
          .font("Helvetica")
          .fontSize(8)
          .text(metric.label, x + 10, y + 6);

        doc.fillColor(metric.color)
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(metric.value, x + 10, y + 18);
      });

      currentY += metricsContainerHeight + 20;

      // ========== ANALYSIS RATIONALE ==========
      doc.rect(margin, currentY, contentWidth, 12)
        .fill("#8b5cf6")
        .stroke("#8b5cf6");

      doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("ANALYSIS RATIONALE", margin + 10, currentY + 3);

      currentY += 17;

      const analysisHeight = 140;
      doc.rect(margin, currentY, contentWidth, analysisHeight)
        .fill("#faf5ff")
        .stroke("#e9d5ff")
        .lineWidth(0.5);

      const rationaleText = options.rationalText || "No analysis provided.";

      doc.fillColor("rgba(139, 92, 246, 0.05)")
        .font("Helvetica-Bold")
        .fontSize(60)
        .text("ANALYSIS", margin + 50, currentY + 50, {
          width: contentWidth - 100,
          align: "center",
        });

      doc.fillColor(colors.darkText)
        .font("Helvetica")
        .fontSize(9)
        .text(rationaleText, margin + 15, currentY + 15, {
          width: contentWidth - 30,
          lineGap: 4,
          align: "justify",
        });

      currentY += analysisHeight + 25;

      // ========== IMAGE SECTION ==========
      if (options.imageBuffer && currentY < pageHeight - 200) {
        try {
          const imageHeight = 120;
          doc.rect(margin, currentY, contentWidth, imageHeight + 25)
            .fill("#f9fafb")
            .stroke("#d1d5db")
            .lineWidth(0.5);

          doc.fillColor("#374151")
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("TECHNICAL ANALYSIS CHART", margin + 10, currentY + 10);

          doc.image(options.imageBuffer, margin + 5, currentY + 30, {
            width: contentWidth - 10,
            height: imageHeight - 10,
            align: "center",
            valign: "center",
          });

          currentY += imageHeight + 40;
        } catch (error) {
          // Continue without image
        }
      }

      // ========== DISCLAIMER ==========
      // Calculate available space and required space for disclaimer
      const disclaimerHeight = 100;
      const signatureSpaceNeeded = 80; // Space for signature section at bottom
      const availableSpace = pageHeight - signatureSpaceNeeded - currentY;
      
      // Only add new page if disclaimer won't fit in available space
      let disclaimerY;
      if (availableSpace < disclaimerHeight + 20) {
        // Not enough space, add new page
        doc.addPage();
        currentY = 70;
        disclaimerY = currentY;
      } else {
        // Enough space, place disclaimer in current page
        disclaimerY = currentY;
      }

      doc.rect(margin, disclaimerY, contentWidth, disclaimerHeight)
        .fill("#fffbeb")
        .stroke("#fde68a")
        .lineWidth(0.5);

      doc.fillColor("#92400e")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("DISCLAIMER", margin + 10, disclaimerY + 10);

      const disclaimerText =
        options.raDetails?.disclaimer ||
        "This document is for informational purposes only. Investments are subject to market risks. Past performance is not indicative of future results. The information provided here should not be considered as investment advice. Please consult with your financial advisor before making any investment decisions.";

      doc.fillColor("#92400e")
        .font("Helvetica")
        .fontSize(8)
        .text(disclaimerText, margin + 10, disclaimerY + 22, {
          width: contentWidth - 20,
          lineGap: 3,
          align: "justify",
        });

      doc.end();
    } catch (err) {
      console.error("PDF Generation Error:", err);
      reject(err);
    }
  });
}