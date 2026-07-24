import { Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { transporter as defaultTransporter, transporter } from "../helpers/nodemailer";

export function mailWorker() {
  console.log('🔄 [WORKER] Starting mail worker...'); // ADD THIS
  
  const mailWorker = new Worker(
    `mail-queue`,
    async (job) => {
      try {
        // console.log(`📨 [WORKER] Processing job ${job.id} - ${job.name}`); // ADD THIS
        
        const { mailOptions } = job.data;

        if (!mailOptions) {
          // console.log('❌ [WORKER] No mailOptions in job data'); // ADD THIS
          return;
        }

        // console.log(`📧 [WORKER] Sending email to: ${mailOptions.to}`); // ADD THIS
        // console.log(`📝 [WORKER] Email subject: ${mailOptions.subject}`); // ADD THIS

        // // Add detailed SMTP debug
        // console.log('🔧 [WORKER] Attempting SMTP connection...'); // ADD THIS
        
        const result = await transporter.sendMail(mailOptions);
        
        // console.log(`✅ [WORKER] Email sent successfully: ${result.messageId}`); // ADD THIS
        // console.log(`✅ [WORKER] Job ${job.id} completed`); // ADD THIS
        
      } catch (error : any) {
        console.log("❌ [WORKER] Error Sending mail", error);
        // console.log(`🔧 [WORKER] Error details:`, { // ADD THIS
        //   code: error?.code,
        //   command: error?.command,
        //   stack: error?.stack
        // });
      }
    },
    {
      connection,
      autorun: true,
    }
  );

  // ADD THESE EVENT LISTENERS
  mailWorker.on('ready', () => {
    console.log('✅ [WORKER] Mail worker is ready and listening'); // ADD THIS
  });

  mailWorker.on('completed', (job) => {
    console.log(`🎉 [WORKER] Job ${job.id} completed successfully`); // ADD THIS
  });

  mailWorker.on('failed', (job, err) => {
    console.error(`💥 [WORKER] Job ${job?.id} failed:`, err); // ADD THIS
  });

  mailWorker.on('error', (err) => {
    console.error('🚨 [WORKER] Worker error:', err); // ADD THIS
  });

  console.log('✅ [WORKER] Mail worker initialized successfully'); // ADD THIS
  return mailWorker;
}