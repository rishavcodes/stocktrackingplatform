// workers/index.ts (your file where you start workers)
import { Worker } from "bullmq";
import {
	InvoiceWorkerServicePurchase,
	InvoiceWorkerTradeboxPlans,
} from "./InvoiceWorkers";
import { mailWorker } from "./MailWorkers";
// Scorecard workers removed - tracking now handled by GlobalTradeTracker service in startCronJobs.ts
import { sendTelegramMessageWorker } from "./TelegramMessageWorker";
import {
	UpdatePlanValidityWorker,
	UpdateTradeboxPlanValidityWorker,
} from "./ValidityStatusWorkers";
import { whatsappMessageWorker } from "./WhatsappMessageWorker";
// import { telegramJoinCheckWorker } from "./telegramJoinCheckWorker";

const activeWorkers: Worker[] = [];

export function startWorkers() {
	// Scorecard tracking now handled by GlobalTradeTracker (see startCronJobs.ts)

	const w1 = UpdatePlanValidityWorker();
	const w2 = UpdateTradeboxPlanValidityWorker();
	const w3 = mailWorker();
	const w4 = sendTelegramMessageWorker();
	const w5 = whatsappMessageWorker();
	const w6 = InvoiceWorkerTradeboxPlans();
	const w7 = InvoiceWorkerServicePurchase();

	// Store references so we can close them on shutdown
	[w1, w2, w3, w4, w5, w6, w7].forEach((w) => {
		if (w) activeWorkers.push(w);
	});

	console.log(`Started ${activeWorkers.length} BullMQ workers`);
}

export async function stopWorkers(): Promise<void> {
	console.log(`Closing ${activeWorkers.length} BullMQ workers...`);
	await Promise.all(activeWorkers.map((w) => w.close()));
	activeWorkers.length = 0;
	console.log("All BullMQ workers closed");
}
