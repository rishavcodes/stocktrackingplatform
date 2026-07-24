import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "readline";
import { TelegramInviteModel, telegramModel } from "../models/TelegramString";
import TelegramBot from "node-telegram-bot-api";
import { Api } from "telegram";
import { ServiceModel } from "../models/PostModels";
import bigInt from "big-integer";
import { UserModel } from "../models/AuthModels";
import axios from "axios";
import { OrderModel } from "../models/TransactionModels";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT!, { polling: true });

export async function sendTelegramMessage(to: string, message: string) {
  try {
    if (!to) {
      console.log("not channel id provided");
    }
    await bot.sendMessage(to, message, {
      parse_mode: "HTML", // Ensures the message is parsed as HTML
    });
  } catch (error) {
    console.log(error);
    console.log("Failed to send message to telegram");
  }
}

/**
 * Send a photo with an optional caption to a Telegram channel.
 * Used by Quick Message broadcasts that include an image — the bot calls
 * sendPhoto with the caption set to the RA's message (instead of the
 * text-only sendMessage path).
 */
export async function sendTelegramPhoto(
  to: string,
  imageUrl: string,
  caption?: string,
) {
  try {
    if (!to) {
      console.log("no channel id provided for photo send");
      return;
    }
    await bot.sendPhoto(to, imageUrl, {
      caption: caption || "",
      parse_mode: "HTML",
    });
  } catch (error) {
    console.log(error);
    console.log("Failed to send photo to telegram");
  }
}

export async function sendBotAdminMessage(message: string) {
  try {
    await bot.sendMessage(
      process.env.TELEGRAM_ADMIN_CHANNEL_ID as string,
      message
    );
  } catch (error) {
    console.log("Failed to log at telegram");
  }
}

export async function sendBotPublicMessage(message: string, image?: string) {
  try {
    if (image !== "" && image !== undefined) {
      await bot.sendPhoto(
        process.env.TELEGRAM_PUBLIC_CHANNEL_ID as string,
        image,
        {
          caption: message,
          parse_mode: "HTML",
        }
      );
    } else {
      await bot.sendMessage(
        process.env.TELEGRAM_PUBLIC_CHANNEL_ID as string,
        message,
        {
          parse_mode: "HTML", // Ensures the message is parsed as HTML
        }
      );
    }
  } catch (error) {
    console.log(error);
    console.log("Failed to log at telegram");
  }
}

/**
 * Remove a user from a Telegram channel.
 * Throws on failure so callers can handle retries.
 * Treats "user not found" / "user already left" as a no-op success.
 */
export async function removeUserFromChannel(
  serviceId: string,
  telegramUserId: string | undefined,
  user_id: string
) {
  if (!telegramUserId) {
    throw new Error("No telegramUserId provided for removal");
  }

  const service = await ServiceModel.findById(serviceId);
  if (!service || !service.telegramChannelId) {
    throw new Error(
      `Service ${serviceId} not found or missing telegramChannelId`
    );
  }

  const telegramChannelId = service.telegramChannelId;

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT!}/banChatMember`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChannelId,
        user_id: telegramUserId,
        until_date: Math.floor(Date.now() / 1000) + 60,
      }),
    }
  );

  const data = await response.json();

  if (data.ok) {
    console.log(
      `[Telegram] User ${telegramUserId} removed from channel ${telegramChannelId}`
    );
    return;
  }

  const desc: string = data.description ?? "";
  if (desc.includes("user not found") || desc.includes("USER_NOT_PARTICIPANT")) {
    console.log(
      `[Telegram] User ${telegramUserId} already not in channel ${telegramChannelId}, treating as success`
    );
    return;
  }

  throw new Error(`Telegram API error: ${desc}`);
}

/**
 * Check if a user is currently a member of a Telegram channel
 * Used for renewals to determine if we need to create a new invite link
 */
export async function isUserInChannel(
  channelId: string,
  telegramUserId: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT as string;
  const formattedChannelId = channelId.startsWith("-100")
    ? channelId
    : `-100${channelId}`;

  const apiUrl = `https://api.telegram.org/bot${token}/getChatMember`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: formattedChannelId,
        user_id: telegramUserId,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.log("User not found in channel or API error:", data.description);
      return false;
    }

    // User is in channel if status is member, administrator, or creator
    // User is NOT in channel if status is left, kicked, or restricted
    const status = data.result?.status;
    const inChannelStatuses = ["member", "administrator", "creator"];

    return inChannelStatuses.includes(status);
  } catch (error) {
    console.error("Error checking if user in channel:", error);
    return false; // Assume not in channel on error, will create new invite link
  }
}

export async function getChannelInviteLink(
  channelId: string,
  orderId: string,
  serviceId: string,
  orderById: string,
) {
  const token = process.env.TELEGRAM_BOT as string;
  const formattedChannelId = channelId.startsWith("-100")
    ? channelId
    : `-100${channelId}`;

  const apiUrl = `https://api.telegram.org/bot${token}/createChatInviteLink`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: formattedChannelId,
        creates_join_request: true,
        name: `Order-${orderId}`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      throw new Error(data.description || "Failed to create invite link");
    }

    const inviteLink = data.result.invite_link;
    //  console.log("invite link:", inviteLink);
    const inviteLinkId = data.result.invite_link_id;
    console.log(data.result);

    await TelegramInviteModel.create({
      orderId: orderId,
      serviceId: serviceId,
      userId: orderById,
      inviteLink: inviteLink,
      inviteLinkId: inviteLinkId,
    });

    return { link: inviteLink, inviteLinkId: inviteLinkId };
  } catch (error) {
    console.error("Error generating invite link:", error);
    throw error;
  }
}

interface BotAdminRequestParams {
  channelId: string;
  serviceId: string;
  serviceTitle: string;
  authorName: string;
}

export async function sendBotAdminRequest(params: BotAdminRequestParams) {
  try {
    // This URL should point to your Telegram bot service
    const botServiceUrl = process.env.TELEGRAM_BOT_SERVICE_URL;

    if (!botServiceUrl) {
      throw new Error("Telegram bot service URL not configured");
    }

    const response = await axios.post(
      `${botServiceUrl}/api/bot/request-admin`,
      {
        channelId: params.channelId,
        metadata: {
          serviceId: params.serviceId,
          serviceTitle: params.serviceTitle,
          authorName: params.authorName,
        },
      }
    );

    if (response.data.success) {
      return true;
    } else {
      throw new Error(response.data.message || "Failed to send admin request");
    }
  } catch (error) {
    console.error("Error in sendBotAdminRequest:", error);
    throw error;
  }
}

console.log("Bot initialized. Token exists:", !!process.env.TELEGRAM_BOT);
console.log("Waiting for join requests...");

// Add error handlers
bot.on("polling_error", (error) => {
  //   console.error("Polling error:", error);
});

bot.on("webhook_error", (error) => {
  console.error("Webhook error:", error);
});

bot.on("chat_join_request", async (request) => {
  try {
    const telegramUserId = request.from.id; // Telegram user ID
    const chatId = String(request.chat.id);
    const inviteLinkUsed = request?.invite_link?.invite_link; // Which invite link they joined with

    if (!inviteLinkUsed) {
      console.log("not invite link used");
      return;
    }

    const result = await handleJoinRequest({
      telegramUserId,
      chatId,
      inviteLinkUsed,
    });

    console.log("Join request handling result:", result);
  } catch (error) {
    console.error("Error handling join request:", error);
  }
});

export async function handleJoinRequest({
  telegramUserId,
  chatId,
  inviteLinkUsed,
}: {
  telegramUserId: number;
  chatId: string;
  inviteLinkUsed: string;
}) {
  try {
    if (!telegramUserId || !inviteLinkUsed || !chatId) {
      console.log(
        "No invite link, chatid, telegramuserid detected in join request"
      );
      return { success: false, message: "Missing required parameters" };
    }

    // 1. Find the order that matches this invite link
    const order = await OrderModel.findOne({
      telegramInviteLink: inviteLinkUsed,
    });
    if (!order) {
      console.log("No order found for invite link:", inviteLinkUsed);
      return { success: false, message: "No order found for invite link" };
    }
    console.log("order found", order);

    // 2. Approve the join request
    await bot.approveChatJoinRequest(chatId, telegramUserId);

    // 3. Find the user who ordered (orderedBy.id)
    const user = await UserModel.findById(order?.orderdBy?.id);
    if (!user) {
      console.log("No user found for orderedBy.id:", order?.orderdBy?.id);
      return { success: false, message: "No user found for order" };
    }

    // 4. Save the Telegram userId into that user's model
    user.telegramUserId = telegramUserId.toString();
    await user.save();

    // 5. Track the join in TelegramInviteModel
    await TelegramInviteModel.findOneAndUpdate(
      { inviteLink: inviteLinkUsed },
      {
        $set: {
          status: "joined",
          joinedAt: new Date(),
          telegramUserId: telegramUserId.toString(),
          isUsed: true,
          usedAt: new Date(),
          botApproved: true,
          channelId: chatId,
        },
      }
    );

    console.log(
      `[Telegram] Approved and saved Telegram ID (${telegramUserId}) for user ${user._id}, order ${order._id}`
    );

    return {
      success: true,
      message: "Join request approved and user saved",
      user: user._id,
      order: order._id,
    };
  } catch (error) {
    console.error("Error handling join request:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
