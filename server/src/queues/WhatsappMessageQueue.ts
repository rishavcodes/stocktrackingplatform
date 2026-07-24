import { Queue } from "bullmq";
import { connection } from "../config/redisConnection";

/**
 * WhatsApp Message Queue for handling WhatsApp Business API messages
 * Uses BullMQ for reliable message delivery with retry and acknowledgment support
 */
export const whatsappQueue = new Queue("whatsapp-message-queue", {
	connection,
	defaultJobOptions: {
		// Job configuration for reliable delivery
		attempts: 3, // Retry failed jobs up to 3 times
		backoff: {
			type: "exponential", // Exponential backoff for retries
			delay: 2000, // Initial delay of 2 seconds
		},
		removeOnComplete: 10, // Keep only last 10 completed jobs
		removeOnFail: 50, // Keep last 50 failed jobs for debugging
	},
});

/**
 * Data structure for WhatsApp message jobs
 */
export interface WhatsappMessageJob {
	phoneNumber: string; // WhatsApp phone number (with country code)
	name: string; // Subscriber name
	message: string; // Message content
	templateName?: string; // Optional: WhatsApp template name
	templateParams?: string[]; // Optional: Template parameters
	subscriberId: string; // Subscriber ID for tracking
	planId: string; // Plan ID the message is related to
	scorecardId: string; // Scorecard ID that triggered the message
	authorId: string; // Service provider ID
	priority?: number; // Message priority (higher number = higher priority)
}

/**
 * Add a WhatsApp message to the queue
 * @param jobData - WhatsApp message job data
 * @param priority - Optional priority (default: 0)
 */
export const addWhatsappMessageToQueue = async (
	jobData: WhatsappMessageJob,
	priority: number = 0,
): Promise<void> => {
	try {
		await whatsappQueue.add("send-whatsapp-message", jobData, {
			priority,
			// Add unique job ID to prevent duplicate messages
			jobId: `whatsapp-${jobData.subscriberId}-${jobData.scorecardId}-${Date.now()}`,
		});
		console.log(
			`WhatsApp message queued for subscriber ${jobData.subscriberId}`,
		);
	} catch (error) {
		console.error("Error adding WhatsApp message to queue:", error);
		throw error;
	}
};

/**
 * Add multiple WhatsApp messages to the queue in bulk
 * @param jobsData - Array of WhatsApp message job data
 */
export const addBulkWhatsappMessagesToQueue = async (
	jobsData: WhatsappMessageJob[],
): Promise<void> => {
	try {
		const jobs = jobsData.map((jobData, index) => ({
			name: "send-whatsapp-message",
			data: jobData,
			opts: {
				priority: jobData.priority || 0,
				jobId: `whatsapp-${jobData.subscriberId}-${jobData.scorecardId}-${Date.now()}-${index}`,
			},
		}));

		await whatsappQueue.addBulk(jobs);
		console.log(`${jobs.length} WhatsApp messages queued for bulk processing`);
	} catch (error) {
		console.error("Error adding bulk WhatsApp messages to queue:", error);
		throw error;
	}
};
