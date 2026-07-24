import mongoose from "mongoose";

const telegramKeySchema = new mongoose.Schema(
  { key: { type: String } },
  { timestamps: true }
);

const TelegramInviteSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    serviceId: { type: String },
    userId: { type: String, required: true },
    channelId: { type: String },

    inviteLink: { type: String, required: true },
    inviteLinkId: { type: String },

    status: {
      type: String,
      enum: ["pending", "joined", "expired", "revoked", "removed"],
      default: "pending",
    },

    isUsed: { type: Boolean, default: false },

    telegramUserId: { type: String },

    botApproved: { type: Boolean, default: false },

    usedAt: { type: Date },
    joinedAt: { type: Date },
    removedAt: { type: Date },
    removedReason: {
      type: String,
      enum: ["plan_expired", "manual", "free_trial_expired"],
    },
  },
  { timestamps: true }
);


export const telegramModel = mongoose.model("telegram", telegramKeySchema);
export const TelegramInviteModel = mongoose.model("telegraminvitelinks", TelegramInviteSchema);
