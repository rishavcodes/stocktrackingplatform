// cron/portfolioReportCron.ts
import cron from "node-cron";
import { Portfolio } from "../lib/schema";
import { generatePortfolioPDF } from "../utils/generatePortfolioPDF";
import { mailQueue } from "../queues/MailQueues";
import { getCachedPriceBulk } from "../services/PriceCache";
import { buildRebalanceHistory } from "../lib/portfolioRebalance";
import { getActiveSubscriberEmails } from "../lib/portfolioSubscribers";

// Factsheets are generated + emailed on a rolling 15-day cadence per portfolio.
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export default function portfolioReportCron() {
  // Daily tick at 5:33 PM (after the 5 PM price update cron); the per-portfolio
  // 15-day gate below decides which portfolios are actually due.
  cron.schedule("33 17 * * *", async () => {
    console.log("Running portfolio factsheet cron...");
    try {
      const portfolios = await Portfolio.find({}).populate("authorData");
      for (const portfolio of portfolios) {
        try {
          // Rolling 15-day cadence: skip portfolios sent within the last 15 days.
          const lastSent = portfolio.lastFactsheetSentAt;
          if (
            lastSent &&
            Date.now() - new Date(lastSent).getTime() < FIFTEEN_DAYS_MS
          ) {
            continue;
          }

          // Resolve active subscribers up front — skip work entirely if none,
          // so subscriber-less portfolios don't generate/upload a PDF.
          const subscriberEmails = await getActiveSubscriberEmails(
            String(portfolio._id)
          );
          if (subscriberEmails.length === 0) {
            console.log(
              `No active subscribers for portfolio: ${portfolio.portfolioName} — skipping`
            );
            continue;
          }

          // Reconstruct previous rebalances for the factsheet (in-memory only).
          (portfolio as any).rebalanceHistory = await buildRebalanceHistory(
            portfolio._id
          );

          // Enrich scripts with live CMP from Redis (in-memory only, not saved to DB)
          const tokenList = portfolio.scripts.map((s: any) => ({
            exchange: s.scriptName.exchange,
            token: s.scriptName.token,
          }));
          const priceMap = await getCachedPriceBulk(tokenList);

          portfolio.scripts = portfolio.scripts.map((script: any) => {
            const liveCMP = priceMap.get(script.scriptName.token) ?? script.cmp;
            return {
              ...(script.toObject ? script.toObject() : script),
              cmp: liveCMP,
              value: liveCMP * script.quantity,
            };
          }) as any;

          // Generate PDF as buffer
          const pdfBuffer = (await generatePortfolioPDF(
            portfolio,
            true
          )) as Buffer;

          // Create S3 key
          const email = portfolio.authorData?.email || "unknown";
          const regName = portfolio.authorData?.name || "unknown";
          const id = portfolio._id;
          const s3Key = `Portfolio-Reports/${regName}-(${email})/${id}-${
            portfolio.portfolioName
          }/${new Date().toISOString().split("T")[0]}/report.pdf`;

          // Upload to S3
          const s3Url = await uploadFileToS3FromBuffer(pdfBuffer, s3Key);

          console.log(
            `Uploaded PDF for portfolio: ${portfolio.portfolioName} -> ${s3Url}`
          );

          // Send emails to subscribers via BullMQ queue
          await sendPortfolioReportToSubscribers(
            portfolio,
            s3Url,
            subscriberEmails
          );

          // Mark sent. Use a targeted updateOne — NOT portfolio.save() — because
          // portfolio.scripts was mutated in-memory with live CMP above and
          // save() would persist that, corrupting the stored daily snapshot.
          await Portfolio.updateOne(
            { _id: portfolio._id },
            { $set: { lastFactsheetSentAt: new Date() } }
          );
        } catch (perPortfolioError) {
          console.error(
            `Error generating factsheet for portfolio ${portfolio?.portfolioName}`,
            perPortfolioError
          );
        }
      }
    } catch (error) {
      console.error("Error generating portfolio factsheets", error);
    }
  });
}
 
async function sendPortfolioReportToSubscribers(
  portfolio: any,
  s3Url: string,
  subscriberEmails: string[]
): Promise<void> {
  try {
    if (!subscriberEmails || subscriberEmails.length === 0) {
      console.log(
        `No active subscriber emails for portfolio: ${portfolio.portfolioName}`
      );
      return;
    }

    // Create email content
    const emailSubject = `Your Portfolio Report: ${
      portfolio.portfolioName
    } Date: ${new Date().toISOString().split("T")[0]}`;
    const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #fafafa; }
      .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); overflow: hidden; }
      .header { background: #01DDAA; color: #fff; padding: 20px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; }
      .content { padding: 20px; }
      .content h2 { margin-top: 0; }
      .button {
        display: inline-block;
        margin-top: 15px;
        padding: 10px 20px;
        background: #01DDAA;
        color: #fff !important;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      }
      .button:hover {
        background: #00c596;
      }
      .footer { margin-top: 20px; padding: 15px; background: #f4f4f4; text-align: center; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Portfolio Report</h1>
      </div>
      <div class="content">
        <h2>${portfolio.portfolioName}</h2>
        <p>Your portfolio report for <strong>${new Date().toLocaleDateString()}</strong> is ready.</p>
        <p>You can view the detailed report by clicking the button below:</p>
        <p><a href="${s3Url}" class="button" target="_blank">Open Report</a></p>
      </div>
      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
  </html>

    `;

    // Add email job to BullMQ queue for each subscriber
    for (const subscriberEmail of subscriberEmails) {
      const mailOptions = {
        from: process.env.EMAIL,
        to: subscriberEmail,
        subject: emailSubject,
        html: emailHtml,
        // attachments: [
        //   {
        //     filename: `${portfolio.portfolioName}-report.pdf`,
        //     content: Buffer, // You'd need to pass the buffer here
        //     contentType: "application/pdf",
        //   },
        // ],
      };
      await mailQueue.add(
        subscriberEmail,
        { mailOptions }
        // { removeOnComplete: true, removeOnFail: true }
      );
    }

    console.log(
      `Added ${subscriberEmails.length} email jobs to queue for portfolio: ${portfolio.portfolioName}`
    );
  } catch (error) {
    console.error(
      `Error sending emails for portfolio ${portfolio.portfolioName}:`,
      error
    );
  }
}

async function uploadFileToS3FromBuffer(
  buffer: Buffer,
  key: string
): Promise<string> {
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

  const S3client = new S3Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME as string,
    Key: key,
    Body: buffer,
    ACL: "public-read",
    ContentType: "application/pdf",
  });

  await S3client.send(command);
   

  return `https://${process.env.BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${key}`;
}
