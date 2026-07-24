#!/usr/bin/env node
/**
 * Generates a VAPID key pair for Web Push.
 *
 * Run once:
 *   node server/scripts/generateVapidKeys.js
 *
 * Then add the printed lines to BOTH:
 *   - server/.env          (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
 *   - front/.env.local     (NEXT_PUBLIC_VAPID_PUBLIC_KEY — public key only)
 *
 * IMPORTANT:
 *   - Generate this ONCE for production and keep the keys stable.
 *     If you rotate VAPID keys, every existing browser subscription becomes
 *     invalid and admins have to re-enable notifications.
 *   - The private key is server-only. Never expose it to the browser.
 *   - VAPID_SUBJECT should be a mailto: or https URL identifying you.
 */

const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\n✅ VAPID key pair generated.\n");
console.log("─".repeat(64));
console.log("Add these to server/.env:");
console.log("─".repeat(64));
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@yourdomain.com`);
console.log("\n─".repeat(64));
console.log("Add this to front/.env.local:");
console.log("─".repeat(64));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log("\nKeep the private key secret. The public key can be shipped to browsers.\n");
