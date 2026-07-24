import { Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { ServiceProviderRegModel } from "../models/AuthModels";
import { mailQueue } from "../queues/MailQueues";
import saveInvoiceToS3 from "../helpers/saveInvoiceToS3";
import { OrderModel, TradeboxPlansModel } from "../models/TransactionModels";
import {
  generateInvoiceNumber,
  generateInvoiceNumberSP,
} from "../helpers/generateInvoiceNumber";
import {
  generateServiceInvoicePDF,
  generateTradeboxPlanInvoicePDF,
} from "../utils/generateInvoicePDF";


//RA is purchasing the plan of tradebox
export function InvoiceWorkerTradeboxPlans() {
  const InvoiceWorkerTradeboxPlans = new Worker(
    `invoice-queue-tradeboxplans`,
    async (job) => {
      try {
        console.log("this is the job data: ", job.data);
        const {
          orderId,
          buyerId,
          RegName,
          tradeBoxPlanName,
          price,
          gst,
          total,
          validity,
          endDate,
          gstNum,
          regNum,
        } = job.data;

        const invoiceNumber = await generateInvoiceNumberSP();

        const serviceProvider = await ServiceProviderRegModel.findById(buyerId);

        if (!serviceProvider) {
          throw new Error("Buyer not found.");
        }

        // Generate PDF using PDFKit
        const pdfBuffer = await generateTradeboxPlanInvoicePDF({
          invoiceNumber,
          issueDate: new Date(),
          buyerName: RegName || serviceProvider?.RegName || serviceProvider?.name || "",
          buyerEmail: serviceProvider?.email || "",
          buyerPhone: serviceProvider?.number?.toString() || "",
          buyerCity: serviceProvider?.city,
          buyerGST: gstNum,
          buyerRegNum: regNum,
          planName: tradeBoxPlanName,
          validity: validity,
          endDate: new Date(endDate),
          subtotal: price,
          gst: gst,
          total: total,
        });

        const base64String = pdfBuffer.toString("base64");

        const formattedEndDate = new Date(endDate).toISOString().split("T")[0];

        const mailOptions = {
          from: process.env.EMAIL,
          to: serviceProvider?.email,
          subject: `Invoice for ${tradeBoxPlanName} purchase`,
          html: `
    <p style="font-size: 16px; font-family: Arial, sans-serif;">
      Hello <strong>${serviceProvider?.RegName}</strong>,
    </p>

    <p style="font-size: 14px; font-family: Arial, sans-serif;">
      Thank you for subscribing to <strong>${tradeBoxPlanName}</strong>.
      Please find your invoice attached for your recent purchase.
    </p>

    <p style="font-size: 14px; font-family: Arial, sans-serif;">
      Your subscription is valid until <strong>${formattedEndDate}</strong>.
      If you have any questions or require further assistance, feel free to contact our support team.
    </p>

    <p style="font-size: 14px; font-family: Arial, sans-serif;">
      Best regards,
      <br />
      <strong>Trade Box Fintech Solutions</strong>
      <br />
      <a href="https://tradeboxlive.com" style="color: #007bff; text-decoration: none;">www.tradeboxlive.com</a>
    </p>
  `,
          attachments: [
            {
              filename: `Invoice_${tradeBoxPlanName}.pdf`,
              content: base64String,
              encoding: "base64",
              contentType: "application/pdf",
            },
          ],
        };

        if (serviceProvider?.RegName || serviceProvider?.name) {
          const fileLocation = await saveInvoiceToS3(
            base64String,
            "tradeboxplans",
            (serviceProvider?.RegName || serviceProvider?.name) as string,
            `Invoice_${tradeBoxPlanName}.pdf`
          );
          console.log(fileLocation);
          await TradeboxPlansModel.findByIdAndUpdate(orderId, {
            $set: { invoiceLink: fileLocation },
          });
        }

        await mailQueue.add(
          serviceProvider?._id.toString()!,
          { mailOptions },
          { removeOnComplete: true, removeOnFail: true }
        );
      } catch (error) {
        console.error("Error Sending invoice", error);
        throw error;
      }
    },
    {
      connection,
      autorun: true,
    }
  );
  return InvoiceWorkerTradeboxPlans;
}
// user is purchasing the plan for RA
export function InvoiceWorkerServicePurchase() {
  const InvoiceWorkerService = new Worker(
    "invoice-queue-service",
    async (job) => {
      try {
        const {
          orderId,
          serviceName,
          serviceProviderName,
          serviceprovideremail,
          serviceProviderAddress,
          serviceProviderRegistrationNumber,
          serviceProviderWebsite,
          serviceProviderGST,
          serviceProviderHSN,
          buyerName,
          buyerNumber,
          buyerEmail,
          buyerPan,
          subtotal,
          gst,
          total,
          validity,
          issueDate,
          serviceStartDate,
          serviceEndDate,
          serviceProviderPhone,
          serviceProviderState,
          discountAmount,
          couponCode,
        } = job.data;

        const invoiceNumber = await generateInvoiceNumber();

        // Generate PDF using PDFKit
        const pdfBuffer = await generateServiceInvoicePDF({
          invoiceNumber,
          issueDate: new Date(issueDate),
          // Buyer
          buyerName: buyerName || "",
          buyerEmail: buyerEmail || "",
          buyerPhone: buyerNumber?.toString() || "",
          buyerPan: buyerPan,
          // Service Provider
          serviceProviderName: serviceProviderName || "",
          serviceProviderEmail: serviceprovideremail || "",
          serviceProviderPhone: serviceProviderPhone?.toString() || "",
          serviceProviderAddress: serviceProviderAddress || "",
          serviceProviderGST: serviceProviderGST,
          serviceProviderHSN: serviceProviderHSN,
          serviceProviderRegNumber: serviceProviderRegistrationNumber,
          serviceProviderWebsite: serviceProviderWebsite,
          serviceProviderState: serviceProviderState,
          // Service
          serviceName: serviceName || "",
          validity: validity || "",
          serviceStartDate: new Date(serviceStartDate),
          serviceEndDate: new Date(serviceEndDate),
          // Financial
          subtotal: subtotal || 0,
          gst: gst || 0,
          total: total || 0,
          discountAmount: discountAmount || 0,
          couponCode: couponCode || undefined,
        });

        /* -------- Upload PDF -------- */
        const fileLocation = await saveInvoiceToS3(
          pdfBuffer.toString("base64"),
          "serviceproviderplans",
          buyerName || "",
          `Invoice_${invoiceNumber}.pdf`,
        );

        /* -------- Update Order -------- */
        await OrderModel.findByIdAndUpdate(orderId, {
          $set: { invoiceLink: fileLocation, invoiceNumber },
        });

        return true;
      } catch (error) {
        console.error("Invoice worker failed", error);
        throw error;
      }
    },
    {
      connection,
      autorun: true,
    },
  );
  return InvoiceWorkerService;
}
