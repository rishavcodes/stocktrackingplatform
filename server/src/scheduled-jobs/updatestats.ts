import cron from "node-cron";

import {
  ArticleModel,
  PodcastModel,
  ServiceModel,
  VideoModel,
  EventModel,
} from "../models/PostModels";

import { CourseModel } from "../models/CourseModel";
import { Portfolio } from "../lib/schema";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { ServiceProviderRegModel } from "../models/AuthModels";

export const startServiceProviderStatsCron = () => {
  console.log("[CRON] Service Provider stats job registered");

  // ⏰ TEMP: runs at 3:00 PM for testing (change back to 0 8 * * *)
  cron.schedule("0 15 * * *", async () => {
   
    try {
      const providers = await ServiceProviderRegModel.find(
        { role: "provider" },
        { _id: 1 }
      );

      console.log(`[CRON] Providers found: ${providers.length}`);

      for (const provider of providers) {
        const providerId = provider._id.toString();

       

        /* ================= CONTENT STATS ================= */
        // NOTE: All these models embed `authorData.id` (string), NOT `authorId`.
        // Article/Video/Podcast/Service have no `type` field — that filter was a bug.
        const contentStats = {
          articles: await ArticleModel.countDocuments({
            "authorData.id": providerId,
          }),
          videos: await VideoModel.countDocuments({
            "authorData.id": providerId,
          }),
          podcasts: await PodcastModel.countDocuments({
            "authorData.id": providerId,
          }),
          events: await EventModel.countDocuments({
            "authorData.id": providerId,
          }),
          services: await ServiceModel.countDocuments({
            "authorData.id": providerId,
          }),
        };

        console.log("[CRON] contentStats:", contentStats);

        /* ================= EVENT STATS ================= */
        const now = new Date();

        const eventStats = {
          upcomingEvents: await EventModel.countDocuments({
            "authorData.id": providerId,
            schedule: { $gte: now },
          }),
          pastEvents: await EventModel.countDocuments({
            "authorData.id": providerId,
            schedule: { $lt: now },
          }),
        };

        console.log("[CRON] eventStats:", eventStats);

        /* ================= SERVICE STATS ================= */
        // Plans = approved services. Subscribers = unique users across this RA's services.
        const serviceStats = {
          totalPlans: await ServiceModel.countDocuments({
            "authorData.id": providerId,
            approvalStatus: true,
          }),
          totalSubscribers: 0,
          totalLeads: 0,
        };

        // Compute unique subscribers across all of this RA's services
        const subAgg = await ServiceModel.aggregate([
          { $match: { "authorData.id": providerId } },
          {
            $unwind: {
              path: "$subscribedBy",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $group: {
              _id: null,
              subs: { $addToSet: "$subscribedBy" },
            },
          },
          { $project: { count: { $size: "$subs" } } },
        ]);
        serviceStats.totalSubscribers = subAgg[0]?.count || 0;

        console.log("[CRON] serviceStats:", serviceStats);

        /* ================= RECOMMENDATION STATS ================= */
        const recommendationStatsAgg = await ScoreCardModel.aggregate([
          { $match: { "authorData.id": providerId } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: {
                $sum: {
                  $cond: [{ $eq: ["$status", "open"] }, 1, 0],
                },
              },
              close: {
                $sum: {
                  $cond: [{ $eq: ["$status", "closed"] }, 1, 0],
                },
              },
              returnPercentage: { $avg: "$pnlpercentage" },
              returnRatio: { $avg: "$riskRewardRatio" },
            },
          },
        ]);

        const recommendationStats = recommendationStatsAgg[0] || {
          total: 0,
          open: 0,
          close: 0,
          returnPercentage: 0,
          returnRatio: 0,
        };

        console.log("[CRON] recommendationStats:", recommendationStats);

        /* ================= MODEL PORTFOLIO STATS ================= */
        const portfolios = await Portfolio.find({
          "authorData.id": providerId,
        });

        const modelPortfolioStates = {
          totalPortfolios: portfolios.length,
          activePortfolios: portfolios.filter(
            (p) => !p.closedPositions?.length
          ).length,
          closedPortfolios: portfolios.filter(
            (p) => p.closedPositions?.length
          ).length,
          totalSubscribers: portfolios.reduce(
            (sum, p) => sum + (p.subscribedBy?.length || 0),
            0
          ),
          avgReturnPercentage: 0,
          avgRiskLevel:
            portfolios.length > 0
              ? portfolios.reduce(
                  (s, p) => s + (p.riskLevel || 0),
                  0
                ) / portfolios.length
              : 0,
        };

        console.log("[CRON] modelPortfolioStates:", modelPortfolioStates);

        /* ================= COURSE STATS ================= */
        const courses = await CourseModel.find({
          instructorId: providerId,
        });

        const courseStates = {
          totalCourses: courses.length,
          publishedCourses: courses.filter(
            (c) => c.status === "published"
          ).length,
          draftCourses: courses.filter(
            (c) => c.status === "draft"
          ).length,
          totalEnrollments: 0,
          totalRevenue: 0,
        };

        console.log("[CRON] courseStates:", courseStates);

        /* ================= FINAL UPDATE PAYLOAD ================= */
        const updatePayload = {
          stats: {
            contentStats,
            eventStats,
            serviceStats,
            recommendationStats,
            modelPortfolioStates,
            courseStates,
          },
        };

        console.log("[CRON] UPDATE PAYLOAD:", JSON.stringify(updatePayload, null, 2));

        /* ================= UPDATE PROVIDER ================= */
        const updateResult = await ServiceProviderRegModel.updateOne(
          { _id: providerId },
          { $set: updatePayload }
        );

        console.log("[CRON] Mongo update result:", updateResult);
        console.log("----------------------------------------------");
      }

      console.log("==============================================");
      console.log("[CRON] Service Provider stats job COMPLETED");
      console.log("==============================================");
    } catch (err) {
      console.error("[CRON] Service Provider stats job FAILED", err);
    }
  });
};
