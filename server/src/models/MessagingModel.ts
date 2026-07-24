import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const messageModel = mongoose.model("messages", messageSchema);
