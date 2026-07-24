/**
 * Onboarding Issue Logger
 *
 * Captures real-user failures across the customer onboarding flow into a
 * single inbox so admins can triage and fix issues affecting actual customers.
 *
 * Dedup behavior:
 *   - If the same customer hits the same step + errorCode within DEDUP_WINDOW_MS,
 *     we UPDATE the existing row (occurrenceCount++, lastOccurredAt=now)
 *     instead of inserting a new one.
 *   - Slack alerts are de-duplicated separately: max 1 ping per fingerprint
 *     per SLACK_DEDUP_WINDOW_MS (default 1h).
 *
 * Failure logging never blocks the original flow — its own errors are caught
 * silently. Customer experience is never degraded by observability code.
 */

import { createHash } from "crypto";
import {
    OnboardingIssueModel,
    OnboardingIssueStep,
    OnboardingIssueSeverity,
} from "../models/OnboardingIssueModel";
import { sendPushToAdmins } from "./webPush";

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SLACK_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface LogInput {
    step: OnboardingIssueStep;
    severity?: OnboardingIssueSeverity;
    reason: string;
    errorCode?: string;
    errorMessage?: string;

    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    spId?: string;
    spName?: string;

    planId?: string;
    planTitle?: string;
    planPrice?: number;

    paymentId?: string;
    orderId?: string;
    clientId?: string;

    userAgent?: string;
    ipAddress?: string;

    metadata?: Record<string, any>;
    stack?: string;
}

function makeFingerprint(input: LogInput): string {
    // Stable hash across retries by the same customer hitting the same error.
    // Strips timestamps / IDs that change between attempts.
    const parts = [
        input.step,
        input.errorCode ?? "",
        // Take only the first 80 chars of the message — keeps semantic match
        // but avoids dynamic IDs (txn id, request id) splitting fingerprints
        (input.errorMessage ?? input.reason).slice(0, 80),
        input.customerId ?? input.customerEmail ?? "anon",
    ];
    return createHash("md5").update(parts.join("|")).digest("hex");
}

export async function logOnboardingIssue(input: LogInput): Promise<void> {
    try {
        const severity = input.severity ?? "warning";
        const fingerprint = makeFingerprint(input);
        const now = new Date();
        const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_MS);

        // Try to find a recent matching row to update
        const existing = await OnboardingIssueModel.findOne({
            fingerprint,
            lastOccurredAt: { $gte: dedupCutoff },
            status: { $in: ["new", "investigating"] },
        });

        let issue: any;

        if (existing) {
            existing.occurrenceCount = (existing.occurrenceCount ?? 1) + 1;
            existing.lastOccurredAt = now;
            // Refresh latest context (user agent, IP, payment IDs may differ
            // between attempts)
            if (input.userAgent) existing.userAgent = input.userAgent;
            if (input.ipAddress) existing.ipAddress = input.ipAddress;
            if (input.paymentId) existing.paymentId = input.paymentId;
            if (input.orderId) existing.orderId = input.orderId;
            if (input.clientId) existing.clientId = input.clientId;
            await existing.save();
            issue = existing;
        } else {
            issue = await OnboardingIssueModel.create({
                ...input,
                severity,
                fingerprint,
                occurrenceCount: 1,
                lastOccurredAt: now,
                status: "new",
            });
        }

        console.log(
            `[OnboardingIssue] ${severity.toUpperCase()} · ${input.step} · ${input.reason} (occurrences: ${issue.occurrenceCount})`
        );

        // Alert admins for critical issues, with dedup so a flapping bug
        // doesn't spam everyone's phone.
        if (severity === "critical") {
            const alertCutoff = new Date(now.getTime() - SLACK_DEDUP_WINDOW_MS);
            if (!issue.slackAlertedAt || issue.slackAlertedAt < alertCutoff) {
                issue.slackAlertedAt = now;
                await issue.save();

                // PRIMARY: PWA push to admin devices (SEBI-friendly — payload
                // contains only summary, full details live in your India Mongo)
                sendPushToAdmins({
                    title: `🔴 Onboarding failure — ${issue.step}`,
                    body: `${issue.reason}${issue.customerName ? ` · ${issue.customerName}` : ""}${issue.spName ? ` · ${issue.spName}` : ""}`,
                    url: `/dashboard/admin/onboarding-issues?id=${issue._id}`,
                    tag: `onboarding-${issue.fingerprint ?? issue._id}`,
                    requireInteraction: true,
                    data: { issueId: String(issue._id), step: issue.step },
                }).catch((err) =>
                    console.error("[OnboardingIssue] Push alert failed:", err)
                );

                // OPTIONAL: Slack ping (only if explicitly configured)
                sendSlackAlert(issue.toObject()).catch((err) =>
                    console.error("[OnboardingIssue] Slack alert failed:", err)
                );
            }
        }
    } catch (err) {
        // Logging itself must never break the real flow
        console.error("[OnboardingIssue] Failed to log issue:", err, input);
    }
}

async function sendSlackAlert(issue: any): Promise<void> {
    const webhookUrl = process.env.SLACK_ONBOARDING_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log("[OnboardingIssue] SLACK_ONBOARDING_WEBHOOK_URL not set — skipping Slack alert");
        return;
    }

    const adminUrl = `${process.env.FRONTEND_URL ?? ""}/dashboard/admin/onboarding-issues`;

    const payload = {
        blocks: [
            {
                type: "header",
                text: { type: "plain_text", text: `🔴 Onboarding failure — ${issue.step}` },
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*Reason:*\n${issue.reason}` },
                    { type: "mrkdwn", text: `*Time:*\n${new Date(issue.lastOccurredAt).toLocaleString("en-IN")}` },
                    {
                        type: "mrkdwn",
                        text: `*Customer:*\n${issue.customerName ?? "—"} · ${issue.customerEmail ?? "—"}`,
                    },
                    {
                        type: "mrkdwn",
                        text: `*Service Provider:*\n${issue.spName ?? "—"}`,
                    },
                    {
                        type: "mrkdwn",
                        text: `*Plan:*\n${issue.planTitle ?? "—"}${issue.planPrice ? ` · ₹${issue.planPrice}` : ""}`,
                    },
                    {
                        type: "mrkdwn",
                        text: `*Error:*\n\`${(issue.errorMessage ?? issue.errorCode ?? "see admin panel").slice(0, 200)}\``,
                    },
                ],
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Issue ID: \`${issue._id}\` · Occurrences: ${issue.occurrenceCount} · <${adminUrl}|Open in admin>`,
                    },
                ],
            },
        ],
    };

    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(`Slack webhook returned ${res.status}`);
    }
}
