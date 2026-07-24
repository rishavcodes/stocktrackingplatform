// helpers/getTelegramChannelIds.ts
import { ServiceModel } from "../models/PostModels";

export async function getTelegramChannelIds(
  planIds: string[]
): Promise<string[]> {
  try {
    const plans = await ServiceModel.find({
      _id: { $in: planIds },
    }).select("telegramChannelId");

    return plans
      .map((plan: any) => plan.telegramChannelId)
      .filter((channelId) => channelId); // Remove undefined/null values
  } catch (error) {
    console.error("Error fetching Telegram channel IDs:", error);
    return [];
  }
}
