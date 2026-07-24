import { Request, Response, NextFunction, Router } from "express";
import axios, { AxiosError, AxiosResponse } from "axios";
import { OrderModel } from "../models/TransactionModels";
import { UserModel } from "../models/AuthModels";

// Types for Telegram API
interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramChat {
  id: number | string;
}

interface TelegramInviteLink {
  name: string;
}

interface ChatJoinRequest {
  chat: TelegramChat;
  from: TelegramUser;
  invite_link: TelegramInviteLink;
}

interface TelegramUpdate {
  chat_join_request?: ChatJoinRequest;
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

const router = Router();

// Middleware to verify the request comes from Telegram
const verifyTelegramWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const secretToken = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (
    process.env.TELEGRAM_SECRET_TOKEN &&
    secretToken !== process.env.TELEGRAM_SECRET_TOKEN
  ) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// Webhook endpoint
router.post(
  "/telegram-webhook",
  verifyTelegramWebhook,
  async (req: Request, res: Response) => {
    console.log("=== WEBHOOK CALLED ===");
    console.log("Time:", new Date().toISOString());
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("======================");

    const update: TelegramUpdate = req.body;

    // Handle webhook verification or empty updates
    if (!update || Object.keys(update).length === 0) {
      console.log("Empty update - likely webhook verification");
      return res.status(200).json({ ok: true });
    }

    if (update.chat_join_request) {
      const { chat, from: user, invite_link } = update.chat_join_request;

      try {

        if (!chat?.id) {
          console.error("Missing chat.id in join request");
          return res.status(400).json({ error: "Missing chat.id" });
        }

        if (!user?.id) {
          console.error("Missing user.id in join request");
          return res.status(400).json({ error: "Missing user.id" });
        }

        if (!invite_link?.name) {
          console.error("Missing invite_link.name in join request");
          return res.status(400).json({ error: "Missing invite_link.name" });
        }

        const orderId = invite_link.name.replace("Order-", "");
        const order = await OrderModel.findById(orderId);

         if (!order?.orderdBy?.id) {
           console.error("Order not found or missing orderdBy.id:", orderId);
           return res.status(400).json({ error: "Invalid order" });
         }

        await UserModel.findByIdAndUpdate(order?.orderdBy?.id, {
          $set: {
            telegramId: user.id,
          },
        });

        await approveJoinRequest(chat.id, user.id);

        return res.status(200).json({ ok: true });
      } catch (error) {
        console.error("Error processing join request:", error);
        return res.status(500).json({
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(200).json({ ok: true });
  }
);

// Telegram API functions
const approveJoinRequest = async (
  chatId: number | string,
  userId: number
): Promise<TelegramResponse> => {
  try {
    if (!chatId || chatId === "") {
      console.error("chat_id is empty or undefined:", chatId);
      throw new Error("chat_id is required");
    }
    const response: AxiosResponse<TelegramResponse> = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT}/approveChatJoinRequest`,
      { chat_id: chatId, user_id: userId }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<TelegramResponse>;
    console.error(
      "Approve join request failed:",
      axiosError.response?.data || axiosError.message
    );
    throw new Error("Failed to approve join request");
  }
};

export const removeUserFromChannel = async (
  chatId: number | string,
  userId: number,
  revokeMessages: boolean = false
): Promise<TelegramResponse & { already_left?: boolean }> => {
  try {
    const response: AxiosResponse<TelegramResponse> = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT}/banChatMember`,
      {
        chat_id: chatId,
        user_id: userId,
        revoke_messages: revokeMessages,
        until_date: Math.floor(Date.now() / 1000) + 30, // 30-second ban
      }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<TelegramResponse>;
    if (axiosError.response?.data?.description?.includes("user not found")) {
      return { ok: true, already_left: true };
    }
    console.error(
      "Remove user failed:",
      axiosError.response?.data || axiosError.message
    );
    throw new Error("Failed to remove user from channel");
  }
};

// Webhook setup endpoint
router.post("/set-webhook", async (req: Request, res: Response) => {
  try {
   const token = process.env.TELEGRAM_BOT;
   const webhookUrl =
     "https://tradebox-yj8v.onrender.com/api/telegram/telegram-webhook";

   console.log("=== SET WEBHOOK DEBUG ===");
   console.log("Token exists:", !!token);
   console.log("Token length:", token?.length || 0);
   console.log("Webhook URL:", webhookUrl);
   console.log("========================");

   if (!token) {
     return res.status(400).json({ error: "TELEGRAM_BOT token not found" });
   }

   const requestData = {
     url: webhookUrl,
     allowed_updates: ["chat_join_request"],
     secret_token: process.env.TELEGRAM_SECRET_TOKEN || undefined,
   };

   console.log("Request data:", JSON.stringify(requestData, null, 2));

   const response = await axios.post(
     `https://api.telegram.org/bot${token}/setWebhook`,
     requestData
   );

   console.log(
     "Telegram API response:",
     JSON.stringify(response.data, null, 2)
   );
   return res.json(response.data);

  } catch (error) {
    const axiosError = error as AxiosError<TelegramResponse>;
    console.error(
      "Set webhook failed:",
      axiosError.response?.data || axiosError.message
    );
    return res.status(500).json({
      error: "Failed to set webhook",
      details: axiosError.response?.data,
    });
  }
});

// Add endpoint to get webhook info for debugging
router.get("/webhook-info", async (req: Request, res: Response) => {
  try {
    const token = process.env.TELEGRAM_BOT;
    
    if (!token) {
      return res.status(400).json({ error: "TELEGRAM_BOT token not found" });
    }

    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );

    console.log("Webhook info:", response.data);
    return res.json(response.data);

  } catch (error) {
    console.error("Get webhook info error:", error);
    const axiosError = error as AxiosError<TelegramResponse>;
    return res.status(500).json({
      error: "Failed to get webhook info",
      details: axiosError.response?.data || axiosError.message,
    });
  }
});

// Add endpoint to delete webhook (useful for debugging)
router.delete("/webhook", async (req: Request, res: Response) => {
  try {
    const token = process.env.TELEGRAM_BOT;
    
    if (!token) {
      return res.status(400).json({ error: "TELEGRAM_BOT token not found" });
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${token}/deleteWebhook`,
      { drop_pending_updates: true }
    );

    console.log("Webhook deleted:", response.data);
    return res.json(response.data);

  } catch (error) {
    console.error("Delete webhook error:", error);
    const axiosError = error as AxiosError<TelegramResponse>;
    return res.status(500).json({
      error: "Failed to delete webhook",
      details: axiosError.response?.data || axiosError.message,
    });
  }
});

router.get("/debug-env", (req: Request, res: Response) => {
  res.json({
    hasBotToken: !!process.env.TELEGRAM_BOT,
    tokenLength: process.env.TELEGRAM_BOT?.length || 0,
    tokenPrefix: process.env.TELEGRAM_BOT?.substring(0, 10) + "...",
    webhookUrl:
      "https://tradebox-yj8v.onrender.com/api/telegram/telegram-webhook",
  });
});

export default {
  routes: router,
};
