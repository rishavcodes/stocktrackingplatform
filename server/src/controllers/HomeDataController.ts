import { Request, Response } from "express";
import mongoose from "mongoose";

import {
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_REGEX,
  ServiceProviderRegModel,
  UserModel,
} from "../models/AuthModels";
import {
  ArticleModel,
  EventModel,
  EventRegistrationModel,
  PodcastModel,
  ServiceModel,
  VideoModel,
} from "../models/PostModels";
import { notificationModel } from "../models/NotificationModel";
import { LeadModel, OrderModel } from "../models/TransactionModels";
import { updateServiceProviderStats } from "../helpers/updateServiceProviderStats";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { PackageModel } from "../models/PackageModel";
import {
  sanitizeArticleForResponse,
  sanitizeArticleListForResponse,
} from "../helpers/sanitizeArticle";

export const GetALLServiceProviders = async (req: Request, res: Response) => {
  try {
    const data = await ServiceProviderRegModel.aggregate([
      {
        $match: {
          role: "provider",
          verified: true,
        },
      },
      {
        $sort: {
          category: 1,
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$category",
          users: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          category: "$_id",
          users: { $slice: ["$users", 5] },
        },
      },
      {
        $unwind: "$users",
      },
      {
        $replaceRoot: {
          newRoot: "$users",
        },
      },
      {
        $project: {
          category: 1,
          RegName: 1,
          regNumber: 1,
          profileUrl: 1,
          stats: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "SPs fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sps",
      error: error,
    });
  }
};

export const GetServiceProviders = async (req: Request, res: Response) => {
  try {
    const serviceproviders = await ServiceProviderRegModel.aggregate([
      {
        $match: {
          role: "provider",
          verified: true,
        },
      },
      {
        $sort: {
          category: 1,
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          users: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          category: "$_id",
          users: { $slice: ["$users", 5] },
        },
      },
      {
        $unwind: "$users",
      },
      {
        $replaceRoot: {
          newRoot: "$users",
        },
      },

      {
        $project: {
          category: 1,
          RegName: 1,
          regNumber: 1,
          profileUrl: 1,
          companyLogo: 1,
          stats: 1,
          socials: 1,
        },
      },
    ]);

    const categories = await ServiceProviderRegModel.aggregate([
      {
        $match: {
          role: "provider",
          verified: true,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "SPs fetched",
      data: { serviceproviders, categories },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sps",
      error: error,
    });
  }
};

export const GetArticles = async (req: Request, res: Response) => {
  try {
    const uniqueArticles = await ArticleModel.aggregate([
      {
        $match: {
          "authorData.isVerified": true,
          schedule: { $lte: new Date().toISOString() },
        },
      },
      {
        $group: {
          _id: "$authorData.id",
          article: { $last: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$article" },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Article fetched",
      data: uniqueArticles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const GetEvents = async (req: Request, res: Response) => {
  try {
    const events = await EventModel.aggregate([
      {
        $match: {
          "authorData.isVerified": true,
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "eventregistrations",
          localField: "_id",
          foreignField: "eventId",
          as: "_registrations",
        },
      },
      {
        $addFields: {
          registrationCount: { $size: "$_registrations" },
        },
      },
      {
        $project: {
          _registrations: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Event fetched",
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const GetVideos = async (req: Request, res: Response) => {
  try {
    const uniqueVideos = await VideoModel.aggregate([
      {
        $match: {
          "authorData.isVerified": true,
          schedule: { $lte: new Date().toISOString() },
        },
      },
      {
        $group: {
          _id: "$authorData.id",
          video: { $last: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$video" },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Videos fetched",
      data: uniqueVideos,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const GetServices = async (req: Request, res: Response) => {
  const { segment } = req.query;

  let data;

  if (segment === "" || segment === "All") {
    data = await ServiceModel.aggregate([
      // {
      //   $match: {
      //     approvalStatus: true,
      //   }
      // },
      {
        $addFields: {
          price: { $round: [{ $multiply: ["$price"] }, 2] },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
  } else {
    data = await ServiceModel.aggregate([
      {
        $match: {
          segment: segment,
          approvalStatus: true,
        },
      },
      {
        $addFields: {
          price: { $round: [{ $multiply: ["$price", 1.18] }, 2] },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
  }

  try {
    return res.status(200).json({
      success: true,
      message: "Services fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getSubProfiles = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }
  try {
    const { id } = req.query;
    console.log(id)

    const subProfiles = await ServiceProviderRegModel.find({
      "addedby.id": id,
    }).select("_id category RegName profileUrl verified email regNumber");
    console.log(subProfiles)
    return res.status(200).json({
      success: true,
      message: "Profiles fetched",
      data: subProfiles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const GetServiceProviderByCategory = async (
  req: Request,
  res: Response
) => {
  if (!req.query.category) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { category } = req.query;

  try {
    const data = await ServiceProviderRegModel.find({
      role: "provider",
      verified: true,
      category,
    }).select(
      "type category RegName regNumber profileUrl companyLogo stats addedby"
    );

    // console.log(data)
    return res.status(200).json({
      success: true,
      message: "SPs fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sps",
      error: error,
    });
  }
};

export const GetFullSpDetails = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id } = req.query;

  try {
    const [data, topExchange, packageCount] = await Promise.all([
      ServiceProviderRegModel.findById(id).select(
        "-password -wallet -subscriptionDetails -ServicesAndOrders -paymentDetails -WalletBalance"
      ).lean(),
      ScoreCardModel.aggregate([
        { $match: { "authorData.id": id as string } },
        { $group: { _id: { $toUpper: "$exchange" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PackageModel.countDocuments({ "authorData.id": id as string }),
    ]);

    if (!data) {
      return res.status(404).json({ success: false, message: "Service provider not found" });
    }

    // Attach top exchange segment to the response
    (data as any).topExchange = topExchange.length > 0 ? topExchange[0]._id : null;
    (data as any).exchangeBreakdown = topExchange.map((e: any) => ({ exchange: e._id, count: e.count }));

    // Inject live portfolio + package counts into stats (cron doesn't track these reliably)
    if (!(data as any).stats) (data as any).stats = {};
    if (!(data as any).stats.modelPortfolioStates) {
      (data as any).stats.modelPortfolioStates = {
        totalPortfolios: 0,
        activePortfolios: 0,
        closedPortfolios: 0,
        totalSubscribers: 0,
        avgReturnPercentage: 0,
        avgRiskLevel: 0,
      };
    }
    (data as any).stats.modelPortfolioStates.totalPortfolios = 0;
    (data as any).stats.packageStats = { totalPackages: packageCount };

    return res.status(200).json({
      success: true,
      message: "SPs fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Sps",
      error: error,
    });
  }
};

export const GetSPStats = async (req: Request, res: Response) => {
  const { id, filter } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Failed to fetch, no id provided",
    });
  }


  const authorId = id;
  const now = new Date();

  // Helper for date ranges
  const getRange = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  let currentStart: Date;
  let previousStart: Date;
  let label: string;

  switch (filter) {
    case "1 Day":
      currentStart = getRange(1);
      previousStart = getRange(2);
      label = "day";
      break;
    case "1 Week":
      currentStart = getRange(7);
      previousStart = getRange(14);
      label = "week";
      break;
    case "1 Month":
      currentStart = getRange(30);
      previousStart = getRange(60);
      label = "month";
      break;
    case "1 Year":
      currentStart = getRange(365);
      previousStart = getRange(730);
      label = "year";
      break;
    default:
      currentStart = getRange(30);
      previousStart = getRange(60);
      label = "month";
  }

  try {
    // ---------- CURRENT PERIOD STATS ----------
    const currentOrders = await OrderModel.countDocuments({
      "soldBy.id": authorId,
      paymentStatus: { $ne: "rejected" },
      createdAt: { $gte: currentStart },
    });

    const totalPlans = await ServiceModel.countDocuments({
      "authorData.id": authorId,
    });

    // Distinct, currently-active paying subscribers — avoids double-counting
    // users who bought multiple plans, excludes expired orders and rejected manual payments.
    const currentSubscribersAgg = await OrderModel.aggregate([
      {
        $match: {
          "soldBy.id": authorId,
          isExpired: { $ne: true },
          paymentStatus: { $ne: "rejected" },
        },
      },
      { $group: { _id: "$orderdBy.id" } },
      { $count: "total" },
    ]);
    const subscribers = currentSubscribersAgg[0]?.total || 0;

    // Subscribers snapshot as of the previous-period boundary (for trend arrow)
    const prevSubscribersAgg = await OrderModel.aggregate([
      {
        $match: {
          "soldBy.id": authorId,
          isExpired: { $ne: true },
          paymentStatus: { $ne: "rejected" },
          createdAt: { $lt: currentStart },
        },
      },
      { $group: { _id: "$orderdBy.id" } },
      { $count: "total" },
    ]);
    const prevSubscribers = prevSubscribersAgg[0]?.total || 0;

    const totalRevenueAgg = await OrderModel.aggregate([
      {
        $match: {
          "soldBy.id": authorId,
          paymentStatus: { $ne: "rejected" },
          createdAt: { $gte: currentStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Mirror the Leads listing endpoint: exclude leads that have already
    // converted to paid subscribers, otherwise the stat over-counts vs the
    // Leads page.
    const leadFilter = (start: Date, end?: Date) => ({
      providerId: authorId as string,
      status: { $nin: ["payment_success", "converted"] },
      createdAt: end ? { $gte: start, $lt: end } : { $gte: start },
    });

    const currentLeads = await LeadModel.countDocuments(leadFilter(currentStart));

    const open = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "open",
      createdAt: { $gte: currentStart },
    });
    const close = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "closed",
      createdAt: { $gte: currentStart },
    });
    const total = open + close;

    const returnData = await ScoreCardModel.aggregate([
      {
        $match: {
          "authorData.id": authorId,
          status: "closed",
          createdAt: { $gte: currentStart },
        },
      },
      { $group: { _id: null, avgReturn: { $avg: "$pnlpercentage" } } },
    ]);

    const returnPercentage =
      returnData.length > 0
        ? Number(returnData[0].avgReturn).toFixed(2)
        : "0.00";

    const returnRatio = total > 0 ? ((close / total) * 100).toFixed(2) : "0.00";

    const today = new Date();
    const upcomingEvents = await EventModel.countDocuments({
      "authorData.id": authorId,
      schedule: { $gte: today },
    });
    const pastEvents = await EventModel.countDocuments({
      "authorData.id": authorId,
      schedule: { $lt: today },
    });

    // ---------- PREVIOUS PERIOD STATS ----------
    const prevOrders = await OrderModel.countDocuments({
      "soldBy.id": authorId,
      paymentStatus: { $ne: "rejected" },
      createdAt: { $gte: previousStart, $lt: currentStart },
    });

    const prevRevenueAgg = await OrderModel.aggregate([
      {
        $match: {
          "soldBy.id": authorId,
          paymentStatus: { $ne: "rejected" },
          createdAt: { $gte: previousStart, $lt: currentStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const prevRevenue = prevRevenueAgg[0]?.total || 0;

    const prevLeads = await LeadModel.countDocuments(
      leadFilter(previousStart, currentStart)
    );

    const prevOpen = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "open",
      createdAt: { $gte: previousStart, $lt: currentStart },
    });

    const prevClose = await ScoreCardModel.countDocuments({
      "authorData.id": authorId,
      status: "closed",
      createdAt: { $gte: previousStart, $lt: currentStart },
    });

    const prevTotal = prevOpen + prevClose;

    const prevReturnData = await ScoreCardModel.aggregate([
      {
        $match: {
          "authorData.id": authorId,
          status: "closed",
          createdAt: { $gte: previousStart, $lt: currentStart },
        },
      },
      { $group: { _id: null, avgReturn: { $avg: "$pnlpercentage" } } },
    ]);

    const prevReturnPercentage =
      prevReturnData.length > 0
        ? Number(prevReturnData[0].avgReturn).toFixed(2)
        : "0.00";

    const prevReturnRatio =
      prevTotal > 0 ? ((prevClose / prevTotal) * 100).toFixed(2) : "0.00";

    // ---------- GROWTH RATE ----------
    const growthRate =
      prevOrders === 0
        ? 100
        : ((currentOrders - prevOrders) / prevOrders) * 100;

    const monthlyStats = await OrderModel.aggregate([
      { $match: { "soldBy.id": authorId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);


    // ---------- RESPONSE ----------
    return res.status(200).json({
      success: true,
      message: `Stats successfully fetched for ${label}`,
      currentStats: {
        totalPlans,
        subscribers,
        totalRevenue,
        totalLeads:currentLeads,
        openRecommendations: open,
        closedRecommendations: close,
        totalRecommendations: total,
        returnPercentage,
        returnRatio,
        upcomingEvents,
        pastEvents,
        currentOrders,
        monthlyStats
      },
      previousStats: {
        subscribers: prevSubscribers,
        totalRevenue: prevRevenue,
        totalLeads: prevLeads,
        openRecommendations: prevOpen,
        closedRecommendations: prevClose,
        totalRecommendations: prevTotal,
        returnPercentage: prevReturnPercentage,
        returnRatio: prevReturnRatio,
        prevOrders,
      },
      growthRate: parseFloat(growthRate.toFixed(2)),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SP stats",
      error: error.message,
    });
  }
};



export const getFullArticle = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id } = req.query;

  try {
    const article = await ArticleModel.findById(id);

    const moreArticles = await ArticleModel.find({
      "authorData.id": article?.authorData?.id,
      schedule: { $lte: new Date().toISOString() },
    })
      .sort({ createdAt: -1 })
      .limit(3);

    return res.status(200).json({
      success: true,
      message: "Article details fetched",
      article: sanitizeArticleForResponse(article as any),
      moreArticles: sanitizeArticleListForResponse(moreArticles as any),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Article",
      error: error,
    });
  }
};

export const articlesByAuthor = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id } = req.query;

  try {
    const articles = await ArticleModel.find({
      "authorData.id": id,
    });

    return res.status(200).json({
      success: true,
      message: "Articles details fetched",
      articles: sanitizeArticleListForResponse(articles as any),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Articles",
      error: error,
    });
  }
};

export const getFullEvent = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id } = req.query;

  try {
    const event = await EventModel.findById(id);

    const [regStats, moreevents] = await Promise.all([
      EventRegistrationModel.aggregate([
        { $match: { eventId: new mongoose.Types.ObjectId(id as string) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: { $sum: { $cond: [{ $eq: ["$eventMode", "online"] }, 1, 0] } },
            offline: { $sum: { $cond: [{ $eq: ["$eventMode", "offline"] }, 1, 0] } },
          },
        },
      ]),
      EventModel.find({
        "authorData.id": event?.authorData?.id,
        schedule: { $lte: new Date().toISOString() },
      })
        .sort({ createdAt: -1 })
        .limit(3),
    ]);

    const stats = regStats[0] || { total: 0, online: 0, offline: 0 };

    return res.status(200).json({
      success: true,
      message: "Article details fetched",
      event,
      moreevents,
      registrationCount: stats.total,
      onlineCount: stats.online,
      offlineCount: stats.offline,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Article",
      error: error,
    });
  }
};

export const checkSPVerified = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id } = req.query;
  console.log(id);

  try {
    const SP = await ServiceProviderRegModel.findById(id);

    if (SP?.verified !== true) {
      return res.status(500).json({
        success: false,
        message: "SP not verified",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SP is verified",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check status",
      error: error,
    });
  }
};

export const getAllNotifications = async (req: Request, res: Response) => {
  if (!req.query.id || !req.query.role) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id, role } = req.query;

  try {
    let document;
    let notificationArray;
    let notifications;

    if (role === "provider") {
      document = await ServiceProviderRegModel.findById(id);
      notificationArray = document?.notifications;
    }

    if (role === "user") {
      document = await UserModel.findById(id);
      notificationArray = document?.notifications;
    }

    if (role === "admin") {
      notifications = await notificationModel
        .find({ "sendTo.id": id })
        .sort({ createdAt: -1 });
    } else {
      notifications = await notificationModel
        .find({
          _id: { $in: notificationArray },
        })
        .sort({ createdAt: -1 });
    }

    return res
      .status(200)
      .json({ success: true, message: "Notification fetched", notifications });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error,
    });
  }
};

export const getAllNotificationsLength = async (
  req: Request,
  res: Response
) => {
  if (!req.query.id || !req.query.role) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id, role } = req.query;

  try {
    let count = 0;

    if (role === "user") {
      const user = await UserModel.findById(id);
      count = await notificationModel.countDocuments({
        _id: { $in: user?.notifications ?? [] },
        "readBy.id": { $ne: id },
      });
    }
    if (role === "provider") {
      const sp = await ServiceProviderRegModel.findById(id);
      count = await notificationModel.countDocuments({
        _id: { $in: sp?.notifications ?? [] },
        "readBy.id": { $ne: id },
      });
    }
    if (role === "admin") {
      count = await notificationModel.countDocuments({
        "sendTo.id": id,
        "readBy.id": { $ne: id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification fetched",
      notifications: count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error,
    });
  }
};

export const readSingleNotification = async (req: Request, res: Response) => {
  const { notificationId, userId } = req.body;

  if (!notificationId || !userId) {
    return res.status(400).json({
      success: false,
      message: "notificationId and userId are required",
    });
  }

  try {
    await notificationModel.updateOne(
      { _id: notificationId, "readBy.id": { $ne: userId } },
      { $push: { readBy: { id: userId, readAt: new Date() } } }
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error,
    });
  }
};

export const readAllNotifications = async (req: Request, res: Response) => {
  if (!req.body.id || !req.body.role) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }

  const { id, role } = req.body;

  try {
    let notificationArray: string[] | undefined;

    if (role === "provider") {
      const sp = await ServiceProviderRegModel.findById(id);
      notificationArray = sp?.notifications;
    }

    if (role === "user") {
      const user = await UserModel.findById(id);
      notificationArray = user?.notifications;
    }

    if (role === "admin") {
      await notificationModel.updateMany(
        { "sendTo.id": id, "readBy.id": { $ne: id } },
        { $push: { readBy: { id, readAt: new Date() } } }
      );
    } else if (notificationArray && notificationArray.length > 0) {
      await notificationModel.updateMany(
        { _id: { $in: notificationArray }, "readBy.id": { $ne: id } },
        { $push: { readBy: { id, readAt: new Date() } } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Notifications read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to read notifications",
      error,
    });
  }
};

/**
 * POST /api/data/deletenotifications
 * Body: { id: string, role: "user"|"provider", notificationIds: string[] }
 * Removes specific notification IDs from the user's notifications array
 * and deletes the notification documents.
 */
export const deleteNotifications = async (req: Request, res: Response) => {
  const { id, role, notificationIds } = req.body;

  if (!id || !role || !notificationIds?.length) {
    return res.status(400).json({
      success: false,
      message: "id, role, and notificationIds are required",
    });
  }

  try {
    if (role === "user") {
      await UserModel.updateOne(
        { _id: id },
        { $pull: { notifications: { $in: notificationIds } } }
      );
    } else if (role === "provider") {
      await ServiceProviderRegModel.updateOne(
        { _id: id },
        { $pull: { notifications: { $in: notificationIds } } }
      );
    }

    await notificationModel.deleteMany({ _id: { $in: notificationIds } });

    return res.status(200).json({
      success: true,
      message: `${notificationIds.length} notification(s) deleted`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notifications",
      error,
    });
  }
};

export const GetAllPMSServices = async (req: Request, res: Response) => {
  try {
    const data = await ServiceModel.find({
      serviceType: "fund",
      activated: true,
    })
      .select("title returnsByTime authorData")
      .sort({ "returnsByTime.0": "desc" });

    return res.status(200).json({
      success: true,
      data,
      message: "Fetched Services",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get services",
      error,
    });
  }
};

export const viewPMSServiceDetails = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }
  const { id } = req.query;

  try {
    const data = await ServiceModel.findById(id);
    const data2 = await ServiceProviderRegModel.findById(id);

    console.log(data2?.privacyPolicy);

    return res.status(200).json({
      success: true,
      data,
      pp: data2?.privacyPolicy,
      message: "Fetched Service",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get service data",
      error,
    });
  }
};

export const viewPackageDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    const pkg = await PackageModel.findById(id)
      .populate("includedServices", "title")
      .lean();

    if (!pkg)
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });

    return res.json({
      success: true,
      data: pkg,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }
};

const isValidSubdomain = (sub: string) =>
  SUBDOMAIN_REGEX.test(sub) && !RESERVED_SUBDOMAINS.has(sub);

export const resolveSpBySubdomain = async (req: Request, res: Response) => {
  const sub = String(req.params.sub || "").toLowerCase().trim();
  if (!sub || !isValidSubdomain(sub)) {
    return res.status(404).json({ success: false });
  }
  const sp = await ServiceProviderRegModel.findOne(
    { customSubdomain: sub, customSubdomainStatus: "active" },
    { _id: 1, customSubdomainStatus: 1, approved: 1, verified: 1, RegName: 1, companyLogo: 1 }
  ).lean();
  if (!sp) return res.status(404).json({ success: false });
  return res.status(200).json({ success: true, data: sp });
};

/**
 * Lightweight SP-by-id lookup for the public view pages. Returns just the
 * subdomain bits so the client can build absolute share/PDF/profile URLs
 * without inflating the product detail responses.
 */
export const spSubdomainById = async (req: Request, res: Response) => {
  const id = String(req.params.id || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ success: false });
  }
  const sp = await ServiceProviderRegModel.findById(id, {
    _id: 1,
    customSubdomain: 1,
    customSubdomainStatus: 1,
  }).lean();
  if (!sp) return res.status(404).json({ success: false });
  return res.status(200).json({ success: true, data: sp });
};

export const checkSubdomainAvailable = async (req: Request, res: Response) => {
  const sub = String(req.query.sub || "").toLowerCase().trim();
  if (!sub) {
    return res.status(400).json({ success: false, available: false, reason: "missing" });
  }
  if (!isValidSubdomain(sub)) {
    return res
      .status(200)
      .json({ success: true, available: false, reason: "invalid_or_reserved" });
  }
  const exists = await ServiceProviderRegModel.exists({ customSubdomain: sub });
  return res.status(200).json({ success: true, available: !exists });
};
