import { ServiceProviderRegModel } from "../models/AuthModels";
import { ServiceModel } from "../models/PostModels";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { ArticleModel } from "../models/PostModels";
import { VideoModel } from "../models/PostModels";
import { PodcastModel } from "../models/PostModels";
import { EventModel } from "../models/PostModels";
import { LeadModel, OrderModel } from "../models/TransactionModels";

export const updateServiceProviderStats = async (authorId: string) => {
  try {
    // Fetch service stats
    const now = new Date();

    // Helper function to get date ranges
    const getRange = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    };

    const lastWeek = getRange(7);
    const lastMonth = getRange(30);
    const lastYear = getRange(365);

    const totalPlans = await ServiceModel.countDocuments({
      "authorData.id": authorId,
    });
    const totalSubscribers = await ServiceModel.aggregate([
      { $match: { "authorData.id": authorId } },
      { $project: { subscribersCount: { $size: "$orders" } } },
      { $group: { _id: null, total: { $sum: "$subscribersCount" } } },
    ]);
    const subscribers =
      totalSubscribers.length > 0 ? totalSubscribers[0].total : 0;
    const totalRevenueAgg = await OrderModel.aggregate([
      { $match: { "soldBy.id": authorId } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const totalLeads = await LeadModel.aggregate([
      { $match: { "subscribedToId": authorId } },
      { $group: { _id: null, total: { $sum: "$leads" } } },
    ]);
    const leads = totalLeads.length > 0 ? totalLeads[0].total : 0;

    const ordersLastWeek = await OrderModel.countDocuments({
      "soldBy.id": authorId,
      createdAt: { $gte: lastWeek },
    });
    const ordersPrevWeek = await OrderModel.countDocuments({
      "soldBy.id": authorId,
      createdAt: { $lt: lastWeek, $gte: getRange(14) },
    });

    const weekGrowth =
      ordersPrevWeek === 0
        ? 100
        : ((ordersLastWeek - ordersPrevWeek) / ordersPrevWeek) * 100;

    const monthlySales = await OrderModel.aggregate([
      { $match: { "soldBy.id": authorId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch recommendation stats
    const open = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "open",
    });

    const close = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "closed",
    });

    const total = open + close; // Total recommendations

    const returnData = await ScoreCardModel.aggregate([
      { $match: { "authorData.id": authorId, status: "closed" } },
      { $group: { _id: null, avgReturn: { $avg: "$pnlpercentage" } } },
    ]);
    const returnPercentage =
      returnData.length > 0 ? Number(returnData[0].avgReturn).toFixed(2) : 0;

    const returnRatio =
      close > 0 ? ((close / (open + close)) * 100).toFixed(2) : 0;

    // Fetch content stats
    const articles = await ArticleModel.countDocuments({
      "authorData.id": authorId,
    });
    const videos = await VideoModel.countDocuments({
      "authorData.id": authorId,
    });
    const podcasts = await PodcastModel.countDocuments({
      "authorData.id": authorId,
    });

    // Fetch event stats
    const today = new Date();
    const upcomingEvents = await EventModel.countDocuments({
      "authorData.id": authorId,
      schedule: { $gte: today },
    });

    const pastEvents = await EventModel.countDocuments({
      "authorData.id": authorId,
      schedule: { $lt: today },
    });

    return {
      overview: {
        totalPlans,
        subscribers,
        totalRevenueAgg,
        leads,
        ordersLastWeek,
        weekGrowth: parseFloat(weekGrowth.toFixed(2)),
        openRecommendations: open,
        closedRecommendations: closed,
        totalRecommendations: total,
        returnPercentage,
        returnRatio,
        upcomingEvents,
        pastEvents,
      },
      monthlySales,
    };

    // console.log("Stats updated successfully");
  } catch (error) {
    return;
    // console.error("Error updating stats:", error);
  }
};
