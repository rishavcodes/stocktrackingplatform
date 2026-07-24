/**
 * One-time migration script: copies registeredUsers[] from Event documents
 * into the new EventRegistration collection.
 *
 * Usage:
 *   npx ts-node src/scripts/migrateEventRegistrations.ts
 *
 * Safe to run multiple times — duplicates are skipped via the unique index.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { EventModel, EventRegistrationModel } from "../models/PostModels";
import { UserModel } from "../models/AuthModels";

async function migrate() {
  await mongoose.connect(process.env.MONGOOSE_URL as string);
  console.log("Connected to database");

  const events = await EventModel.find({
    "registeredUsers.0": { $exists: true },
  })
    .select("_id registeredUsers")
    .lean();

  console.log(`Found ${events.length} events with registrations`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const event of events) {
    for (const reg of event.registeredUsers ?? []) {
      try {
        const user = await UserModel.findById(reg.userId, "name email").lean();

        await EventRegistrationModel.create({
          eventId: event._id,
          userId: reg.userId,
          userName: user?.name ?? null,
          userEmail: user?.email ?? null,
          eventMode: reg.eventMode ?? "online",
          createdAt: reg.registrationDate ?? new Date(),
        });
        created++;
      } catch (err: any) {
        if (err.code === 11000) {
          skipped++;
        } else {
          errors++;
          console.error(
            `Error migrating reg for event ${event._id}, user ${reg.userId}:`,
            err.message
          );
        }
      }
    }
  }

  console.log(`Migration complete: ${created} created, ${skipped} duplicates skipped, ${errors} errors`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
