// utils/generatePortfolioPDF.ts
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

export async function generatePortfolioPDF(
  portfolio: any,
  returnBuffer: boolean = false
): Promise<string | Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true
      });
      let result: string | Buffer;

      if (returnBuffer) {
        const chunks: Uint8Array[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      } else {
        const reportsDir = path.join(process.cwd(), "reports");
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);
        const filePath = path.join(reportsDir, `${portfolio._id}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        stream.on("finish", () => resolve(filePath));
      }

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // ============================================
      // HEADER - Company Branding
      // ============================================
      doc
        .fontSize(24)
        .fillColor("#01DDAA")
        .font("Helvetica-Bold")
        .text("TradeBox Securities", { align: "center" });
      
      doc
        .fontSize(10)
        .fillColor("#666")
        .font("Helvetica")
        .text("SEBI Registered Investment Advisor", { align: "center" });
      
      doc.moveDown(0.3);
      doc
        .moveTo(margin, doc.y)
        .lineTo(pageWidth - margin, doc.y)
        .strokeColor("#01DDAA")
        .lineWidth(2)
        .stroke();
      
      doc.moveDown(1);

      // ============================================
      // PORTFOLIO TITLE
      // ============================================
      doc
        .fontSize(20)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text(portfolio.portfolioName, { align: "center" });
      
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#666")
        .font("Helvetica-Oblique")
        .text("Portfolio Performance Report", { align: "center" });
      
      doc
        .fontSize(10)
        .fillColor("#999")
        .font("Helvetica")
        .text(`Report Generated: ${format(new Date(), "dd MMMM yyyy, hh:mm a")}`, {
          align: "center",
        });
      
      doc.moveDown(2);

      // ============================================
      // PORTFOLIO OVERVIEW - Key Metrics Box
      // ============================================
      const totalValue = portfolio.scripts.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
      const constituentsCount = portfolio.scripts.length;
      
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Portfolio Overview", { underline: true });
      
      doc.moveDown(0.5);
      
      // Draw a box for key metrics
      const boxY = doc.y;
      doc
        .roundedRect(margin, boxY, pageWidth - 2 * margin, 100, 5)
        .fillAndStroke("#f8f9fa", "#01DDAA");
      
      doc.fillColor("#000").font("Helvetica");
      doc.fontSize(11);
      
      const col1X = margin + 20;
      const col2X = pageWidth / 2 + 20;
      let metricY = boxY + 15;
      
      doc.text(`Launch Date:`, col1X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ${format(new Date(portfolio.launchDate), "dd MMM yyyy")}`);
      
      doc.font("Helvetica").text(`Total Constituents:`, col2X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ${constituentsCount}`);
      
      metricY += 20;
      doc.font("Helvetica").text(`Total Portfolio Value:`, col1X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ₹${totalValue.toFixed(2)}`);
      
      doc.font("Helvetica").text(`Rebalance Count:`, col2X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ${portfolio.rebalanceCount || 0}`);
      
      metricY += 20;
      doc.font("Helvetica").text(`Risk Level:`, col1X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ${portfolio.riskLevel}/10`);
      
      doc.font("Helvetica").text(`Investment Horizon:`, col2X, metricY, { continued: true, width: 150 });
      doc.font("Helvetica-Bold").text(` ${portfolio.investmentHorizon} months`);
      
      doc.y = boxY + 110;
      doc.moveDown(1.5);

      // ============================================
      // AUTHOR INFORMATION
      // ============================================
      if (portfolio.authorData) {
        doc
          .fontSize(16)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text("Portfolio Manager", { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor("#333").font("Helvetica");
        
        doc.text(`Name: ${portfolio.authorData.name || "N/A"}`);
        doc.text(`Email: ${portfolio.authorData.email || "N/A"}`);
        if (portfolio.authorData.type) {
          doc.text(`Type: ${portfolio.authorData.type}`);
        }
        if (portfolio.authorData.aboutAuthor) {
          doc.moveDown(0.3);
          doc.text(`About: ${portfolio.authorData.aboutAuthor}`, { align: "justify" });
        }
        
        doc.moveDown(1.5);
      }

      // ============================================
      // PORTFOLIO DETAILS
      // ============================================
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Portfolio Details", { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#333").font("Helvetica");
      
      doc.text(`Theme: ${portfolio.theme}`);
      doc.text(`Methodology: ${portfolio.methodology}`);
      doc.text(`Benchmark Index: ${portfolio.benchmarkIndex}`);
      doc.text(`Review Frequency: ${portfolio.reviewFrequency} month(s)`);
      doc.text(`Minimum Investment: ₹${portfolio.minInvestmentAmount?.toLocaleString('en-IN') || 'N/A'}`);
      doc.text(`Management Fees: ₹${portfolio.fees?.toLocaleString('en-IN') || 'N/A'}`);
      doc.text(`Fee Validity: ${portfolio.feeValidity || 'N/A'}`);
      
      doc.moveDown(1.5);

      // ============================================
      // RATIONALE
      // ============================================
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Investment Rationale", { underline: true });
      
      doc.moveDown(0.5);
      doc
        .fontSize(11)
        .fillColor("#333")
        .font("Helvetica")
        .text(portfolio.rationale, { align: "justify" });
      
      doc.moveDown(1.5);

      // ============================================
      // CURRENT CONSTITUENTS TABLE
      // ============================================
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Current Portfolio Constituents", { underline: true });
      
      doc.moveDown(0.5);

      // Table headers
      const tableStartY = doc.y;
      const colWidths = [30, 120, 70, 60, 50, 70, 70];
      const tableStartX = margin;
      
      // Header background
      doc
        .rect(tableStartX, tableStartY, pageWidth - 2 * margin, 20)
        .fillAndStroke("#01DDAA", "#01DDAA");
      
      doc.fontSize(9).fillColor("#FFF").font("Helvetica-Bold");
      let currentX = tableStartX + 5;
      
      doc.text("#", currentX, tableStartY + 5, { width: colWidths[0] });
      currentX += colWidths[0];
      doc.text("Script Name", currentX, tableStartY + 5, { width: colWidths[1] });
      currentX += colWidths[1];
      doc.text("Exchange", currentX, tableStartY + 5, { width: colWidths[2] });
      currentX += colWidths[2];
      doc.text("CMP (₹)", currentX, tableStartY + 5, { width: colWidths[3] });
      currentX += colWidths[3];
      doc.text("Qty", currentX, tableStartY + 5, { width: colWidths[4] });
      currentX += colWidths[4];
      doc.text("Value (₹)", currentX, tableStartY + 5, { width: colWidths[5] });
      currentX += colWidths[5];
      doc.text("Weight %", currentX, tableStartY + 5, { width: colWidths[6] });
      
      doc.y = tableStartY + 25;
      
      // Table rows
      portfolio.scripts.forEach((s: any, idx: number) => {
        const rowY = doc.y;
        
        // Alternating row colors
        if (idx % 2 === 0) {
          doc
            .rect(tableStartX, rowY, pageWidth - 2 * margin, 18)
            .fillAndStroke("#f8f9fa", "#f8f9fa");
        }
        
        doc.fontSize(9).fillColor("#000").font("Helvetica");
        currentX = tableStartX + 5;
        
        doc.text(`${idx + 1}`, currentX, rowY + 4, { width: colWidths[0] });
        currentX += colWidths[0];
        doc.text(s.scriptName.name, currentX, rowY + 4, { width: colWidths[1] });
        currentX += colWidths[1];
        doc.text(s.scriptName.exchange, currentX, rowY + 4, { width: colWidths[2] });
        currentX += colWidths[2];
        doc.text(`${s.cmp?.toFixed(2) || 'N/A'}`, currentX, rowY + 4, { width: colWidths[3] });
        currentX += colWidths[3];
        doc.text(`${s.quantity || 0}`, currentX, rowY + 4, { width: colWidths[4] });
        currentX += colWidths[4];
        doc.text(`${s.value?.toFixed(2) || 'N/A'}`, currentX, rowY + 4, { width: colWidths[5] });
        currentX += colWidths[5];
        doc.text(`${s.weightage?.toFixed(2) || 'N/A'}%`, currentX, rowY + 4, { width: colWidths[6] });
        
        doc.y = rowY + 20;
      });
      
      // Total row
      const totalRowY = doc.y;
      doc
        .rect(tableStartX, totalRowY, pageWidth - 2 * margin, 20)
        .fillAndStroke("#e9ecef", "#01DDAA");
      
      doc.fontSize(10).fillColor("#000").font("Helvetica-Bold");
      doc.text("Total Portfolio Value:", tableStartX + 5, totalRowY + 5, { width: 300 });
      doc.text(`₹${totalValue.toFixed(2)}`, tableStartX + 310, totalRowY + 5);
      
      doc.y = totalRowY + 25;
      doc.moveDown(1.5);

      // ============================================
      // PREVIOUS REBALANCES (if available)
      // ============================================
      const rebalanceHistory = portfolio.rebalanceHistory || [];
      if (rebalanceHistory.length > 0) {
        doc
          .fontSize(16)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text("Previous Rebalances", { underline: true });

        doc.moveDown(0.5);

        const tableWidth = pageWidth - 2 * margin;
        const rebalTableY = doc.y;
        // Date | Added | Removed | Closed | Qty changed
        const rebalColWidths = [
          70,
          110,
          100,
          95,
          tableWidth - 70 - 110 - 100 - 95,
        ];

        // Header
        doc
          .rect(tableStartX, rebalTableY, tableWidth, 20)
          .fillAndStroke("#01DDAA", "#01DDAA");

        doc.fontSize(9).fillColor("#FFF").font("Helvetica-Bold");
        currentX = tableStartX + 5;

        doc.text("Date", currentX, rebalTableY + 5, { width: rebalColWidths[0] });
        currentX += rebalColWidths[0];
        doc.text("Added", currentX, rebalTableY + 5, { width: rebalColWidths[1] });
        currentX += rebalColWidths[1];
        doc.text("Removed", currentX, rebalTableY + 5, { width: rebalColWidths[2] });
        currentX += rebalColWidths[2];
        doc.text("Closed", currentX, rebalTableY + 5, { width: rebalColWidths[3] });
        currentX += rebalColWidths[3];
        doc.text("Qty changed", currentX, rebalTableY + 5, { width: rebalColWidths[4] });

        doc.y = rebalTableY + 25;

        const nameList = (items: any[]) =>
          (items || [])
            .map((i: any) => i?.name)
            .filter(Boolean)
            .join(", ") || "—";
        const changedList = (items: any[]) =>
          (items || [])
            .map((i: any) => `${i?.name} (${i?.from}→${i?.to})`)
            .join(", ") || "—";

        rebalanceHistory.forEach((rb: any, idx: number) => {
          doc.fontSize(9).font("Helvetica");
          const added = nameList(rb.added);
          const removed = nameList(rb.removed);
          const closed = nameList(rb.closed);
          const changed = changedList(rb.changed);

          // Grow the row to fit the tallest wrapped cell so long lists don't overlap
          const rowH =
            Math.max(
              18,
              doc.heightOfString(added, { width: rebalColWidths[1] - 4 }),
              doc.heightOfString(removed, { width: rebalColWidths[2] - 4 }),
              doc.heightOfString(closed, { width: rebalColWidths[3] - 4 }),
              doc.heightOfString(changed, { width: rebalColWidths[4] - 4 })
            ) + 6;

          if (doc.y + rowH > pageHeight - 80) {
            doc.addPage();
            doc.y = margin;
          }

          const rowY = doc.y;
          if (idx % 2 === 0) {
            doc
              .rect(tableStartX, rowY, tableWidth, rowH)
              .fillAndStroke("#f8f9fa", "#f8f9fa");
          }

          doc.fontSize(9).fillColor("#000").font("Helvetica");
          currentX = tableStartX + 5;

          doc.text(
            rb.date ? format(new Date(rb.date), "dd MMM yyyy") : "—",
            currentX,
            rowY + 4,
            { width: rebalColWidths[0] - 4 }
          );
          currentX += rebalColWidths[0];
          doc.text(added, currentX, rowY + 4, { width: rebalColWidths[1] - 4 });
          currentX += rebalColWidths[1];
          doc.text(removed, currentX, rowY + 4, { width: rebalColWidths[2] - 4 });
          currentX += rebalColWidths[2];
          doc.text(closed, currentX, rowY + 4, { width: rebalColWidths[3] - 4 });
          currentX += rebalColWidths[3];
          doc.text(changed, currentX, rowY + 4, { width: rebalColWidths[4] - 4 });

          doc.y = rowY + rowH + 2;
        });

        doc.moveDown(1.5);
      }

      // ============================================
      // PERFORMANCE HISTORY (if available)
      // ============================================
      if (portfolio.performanceHistory && portfolio.performanceHistory.length > 0) {
        doc
          .fontSize(16)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text("Performance History", { underline: true });
        
        doc.moveDown(0.5);
        
        const perfTableY = doc.y;
        const perfColWidths = [100, 120, 120, 120];
        
        // Header
        doc
          .rect(tableStartX, perfTableY, pageWidth - 2 * margin, 20)
          .fillAndStroke("#01DDAA", "#01DDAA");
        
        doc.fontSize(9).fillColor("#FFF").font("Helvetica-Bold");
        currentX = tableStartX + 5;
        
        doc.text("Month", currentX, perfTableY + 5, { width: perfColWidths[0] });
        currentX += perfColWidths[0];
        doc.text("Portfolio Value (₹)", currentX, perfTableY + 5, { width: perfColWidths[1] });
        currentX += perfColWidths[1];
        doc.text("Returns %", currentX, perfTableY + 5, { width: perfColWidths[2] });
        currentX += perfColWidths[2];
        doc.text("Profit/Loss (₹)", currentX, perfTableY + 5, { width: perfColWidths[3] });
        
        doc.y = perfTableY + 25;
        
        portfolio.performanceHistory.slice(-12).forEach((ph: any, idx: number) => {
          const rowY = doc.y;
          
          if (idx % 2 === 0) {
            doc
              .rect(tableStartX, rowY, pageWidth - 2 * margin, 18)
              .fillAndStroke("#f8f9fa", "#f8f9fa");
          }
          
          doc.fontSize(9).font("Helvetica");
          currentX = tableStartX + 5;
          
          doc.fillColor("#000").text(ph.month, currentX, rowY + 4, { width: perfColWidths[0] });
          currentX += perfColWidths[0];
          doc.text(`${ph.value?.toFixed(2) || 'N/A'}`, currentX, rowY + 4, { width: perfColWidths[1] });
          currentX += perfColWidths[1];
          
          if (ph.returns !== undefined) {
            const returnColor = ph.returns >= 0 ? "#28a745" : "#dc3545";
            doc.fillColor(returnColor).text(`${ph.returns?.toFixed(2)}%`, currentX, rowY + 4, { width: perfColWidths[2] });
          } else {
            doc.fillColor("#000").text("N/A", currentX, rowY + 4, { width: perfColWidths[2] });
          }
          currentX += perfColWidths[2];
          
          if (ph.profitLoss !== undefined) {
            const plColor = ph.profitLoss >= 0 ? "#28a745" : "#dc3545";
            doc.fillColor(plColor).text(`${ph.profitLoss?.toFixed(2)}`, currentX, rowY + 4, { width: perfColWidths[3] });
          } else {
            doc.fillColor("#000").text("N/A", currentX, rowY + 4, { width: perfColWidths[3] });
          }
          
          doc.y = rowY + 20;
        });
        
        doc.moveDown(1.5);
      }

      // ============================================
      // RISK METRICS
      // ============================================
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Risk Metrics", { underline: true });
      
      doc.moveDown(0.5);
      
      const riskBoxY = doc.y;
      doc
        .roundedRect(margin, riskBoxY, pageWidth - 2 * margin, 80, 5)
        .fillAndStroke("#fff3cd", "#ffc107");
      
      doc.fontSize(11).fillColor("#000").font("Helvetica");
      let riskY = riskBoxY + 15;
      
      doc.text(`Standard Deviation: `, margin + 20, riskY, { continued: true });
      doc.font("Helvetica-Bold").text(`${portfolio.riskMetrics?.standardDeviation || 'N/A'}`);
      
      riskY += 20;
      doc.font("Helvetica").text(`Sharpe Ratio: `, margin + 20, riskY, { continued: true });
      doc.font("Helvetica-Bold").text(`${portfolio.riskMetrics?.sharpeRatio || 'N/A'}`);
      
      riskY += 20;
      doc.font("Helvetica").text(`Maximum Drawdown: `, margin + 20, riskY, { continued: true });
      doc.font("Helvetica-Bold").text(`${portfolio.riskMetrics?.maximumDrawdown || 'N/A'}`);
      
      doc.y = riskBoxY + 90;
      doc.moveDown(1.5);

      // ============================================
      // COMMERCIALS (if available)
      // ============================================
      if (portfolio.Commercials) {
        doc
          .fontSize(16)
          .fillColor("#000")
          .font("Helvetica-Bold")
          .text("Fee Structure & Commercials", { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor("#333").font("Helvetica");
        
        if (portfolio.Commercials.yearlyCharge) {
          doc.text(`Yearly Charge: ₹${portfolio.Commercials.yearlyCharge.toLocaleString('en-IN')}`);
        }
        if (portfolio.Commercials.deductionPerSale) {
          doc.text(`Deduction Per Sale: ₹${portfolio.Commercials.deductionPerSale.toLocaleString('en-IN')}`);
        }
        if (portfolio.Commercials.startDate && portfolio.Commercials.endDate) {
          doc.text(`Validity Period: ${format(new Date(portfolio.Commercials.startDate), "dd MMM yyyy")} to ${format(new Date(portfolio.Commercials.endDate), "dd MMM yyyy")}`);
        }
        doc.text(`Admin Approved: ${portfolio.Commercials.approvedByAdmin ? 'Yes' : 'No'}`);
        
        doc.moveDown(1.5);
      }

      // ============================================
      // DISCLOSURE
      // ============================================
      doc
        .fontSize(16)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text("Definitions and Disclosures", { underline: true });
      
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#333")
        .font("Helvetica")
        .text(portfolio.disclosure || "No additional disclosures provided.", {
          align: "justify",
        });
      
      doc.moveDown(2);

      // ============================================
      // FOOTER ON ALL PAGES
      // ============================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Footer line
        doc
          .moveTo(margin, pageHeight - 60)
          .lineTo(pageWidth - margin, pageHeight - 60)
          .strokeColor("#01DDAA")
          .lineWidth(1)
          .stroke();
        
        // Footer text
        doc
          .fontSize(8)
          .fillColor("#666")
          .font("Helvetica")
          .text(
            `SEBI Registration No: INH000012345`,
            margin,
            pageHeight - 50,
            { align: "center", width: pageWidth - 2 * margin }
          );
        
        doc
          .fontSize(8)
          .text(
            `Generated on ${format(new Date(), "dd MMMM yyyy, hh:mm a")}`,
            margin,
            pageHeight - 38,
            { align: "center", width: pageWidth - 2 * margin }
          );
        
        // Page number
        doc
          .fontSize(8)
          .text(
            `Page ${i + 1} of ${range.count}`,
            margin,
            pageHeight - 26,
            { align: "center", width: pageWidth - 2 * margin }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
