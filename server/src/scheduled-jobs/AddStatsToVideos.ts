import cron from "node-cron";
import { VideoModel } from "../models/PostModels";
import { fetchVideoStats } from "../helpers/FetchVideoStats";

export default function () {
  cron.schedule("0 */8 * * *", async () => {
    const videos = await VideoModel.find({
      schedule: { $lte: new Date().toISOString() },
    })
      .sort({
        createdAt: -1,
      })
      .limit(2500);

    for (const video of videos) {
      try {
        const stats = await fetchVideoStats(video.videoID || "");

        if (stats === undefined) {
          throw new Error("Failed to update stats");
        }

        await VideoModel.findByIdAndUpdate(video._id, {
          $set: { videoStats: stats },
        });
      } catch (error) {
        // console.log(error);
      }
    }
  });
}
