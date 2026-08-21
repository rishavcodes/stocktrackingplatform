// workers/index.ts (your file where you start workers)
import { Worker } from "bullmq";
import {
	UpdatePlanValidityWorker,
	UpdateTradeboxPlanValidityWorker,
} from "./ValidityStatusWorkers";

const activeWorkers: Worker[] = [];

export function startWorkers() {
	// Scorecard tracking now handled by GlobalTradeTracker (see startCronJobs.ts)

	const w1 = UpdatePlanValidityWorker();
	const w2 = UpdateTradeboxPlanValidityWorker();

	// Store references so we can close them on shutdown
	[w1, w2].forEach((w) => {
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
