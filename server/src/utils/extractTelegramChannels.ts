// utils/extractTelegramChannels.ts
import { ServiceModel } from "../models/PostModels";

export const extractTelegramChannels = async (serviceIds: string[]) => {
  const services = await ServiceModel.find(
    { _id: { $in: serviceIds } },
    {
      telegramChannelId: 1,
      telegramChannelAccessHash: 1,
    }
  );

  const channels = services
    .filter((s) => s.telegramChannelId)
    .map((s) => ({
      channelId: s.telegramChannelId!,
      accessHash: s.telegramChannelAccessHash || null,
    }));

  // remove duplicates
  const unique = Array.from(
    new Map(channels.map((c) => [c.channelId, c])).values()
  );

  return unique;
};
