import { Request, Response } from "express";
import {
  AdminModel,
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_REGEX,
  ServiceProviderRegModel,
  UserModel,
} from "../models/AuthModels";
import {
  ArticleModel,
  CouponModel,
  EventModel,
  EventRegistrationModel,
  // LeadsModel,
  PodcastModel,
  ServiceModel,
  VideoModel,
} from "../models/PostModels";
import { notificationModel } from "../models/NotificationModel";
import { notifyWalletChange } from "../helpers/Notify";
import jwt from "jsonwebtoken";
import { sendNotification } from "../helpers/sendNotification";
import { deleteObject } from "../helpers/providerRegFileHelper";
import {
  GSTTableModel,
  LeadModel,
  OrderModel,
  TradeboxPlansModel,
  WalletTransactionModel,
  WithdrawalModel,
} from "../models/TransactionModels";
import { Portfolio } from "../lib/schema";
import { mailQueue } from "../queues/MailQueues";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { startOfDay, endOfDay, parse } from "date-fns";
import GetFilesFromS3 from "../helpers/GetFilesFromS3";
import { uploadBufferToS3 } from "../helpers/uploadDocument";
import mammoth from "mammoth";
import puppeteer from "puppeteer";
import { ScoreCardModel, PortfolioHistory } from "../models/ScoreCardModel";
// import { createChannel, addBotAsAdmin } from "../config/telegram";
import { id_ID } from "@faker-js/faker";
import { InvoiceQueueTradeboxPlans } from "../queues/InvoiceQueues";
import { generateServiceInvoicePDF } from "../utils/generateInvoicePDF";
import saveInvoiceToS3 from "../helpers/saveInvoiceToS3";
import { generateInvoiceNumber } from "../helpers/generateInvoiceNumber";
import { parseInvoiceNumberFromUrl } from "../helpers/parseInvoiceNumberFromUrl";
import { message } from "telegram/client";
import { tryCatch } from "bullmq";
import mongoose from "mongoose";
import { MarketplaceModel } from "../models/MarketplaceModel";
import { Types } from "mongoose";
import shortid from "shortid";
import { z } from "zod";
import { RazorpayKeyModel } from "../models/IntegrationModels";
import { PackageModel } from "../models/PackageModel";
import { addVercelDomain, removeVercelDomain } from "../helpers/vercelDomains";
import { LoginActivityModel } from "../models/LoginActivity";

// GET /api/admin/contentstatsbytype — content/sales table grouped by SP
// "bucket" (RA-Individual / RA-Non Individual / Sub Profile / RIA / Broker /
// PMS / AIF). RIA has no schema field today so its bucket is intentionally
// empty; the frontend renders it as a row of zeros until that distinction
// is added on the SP record.
export const getContentStatsByType = async (req: Request, res: Response) => {
  try {
    // 1) Fetch all verified SPs and bucket each one in JS. We hit the DB
    //    once and group locally rather than running 7 parallel queries.
    const sps = await ServiceProviderRegModel.find({
      role: "provider",
      verified: true,
    })
      .select("_id type category addedby")
      .lean();

    type BucketKey =
      | "RA - Individual"
      | "RA - Non Individual"
      | "Sub Profile"
      | "RIA"
      | "Broker"
      | "PMS"
      | "AIF";
    const BUCKETS: BucketKey[] = [
      "RA - Individual",
      "RA - Non Individual",
      "Sub Profile",
      "RIA",
      "Broker",
      "PMS",
      "AIF",
    ];
    const bucketize = (sp: any): BucketKey | null => {
      // Sub Profile takes precedence — the `addedby.isSubProfile` flag (or
      // type="sub profile") marks SPs created by another SP rather than
      // self-registered. They shouldn't double-count in the RA buckets.
      if (sp.type === "sub profile" || sp.addedby?.isSubProfile === true) {
        return "Sub Profile";
      }
      if (sp.category === "Research Analyst") {
        return sp.type === "Individual"
          ? "RA - Individual"
          : "RA - Non Individual";
      }
      if (sp.category === "Broker") return "Broker";
      if (sp.category === "PMS") return "PMS";
      if (sp.category === "AIF") return "AIF";
      return null;
    };

    const idsByBucket: Record<BucketKey, string[]> = {
      "RA - Individual": [],
      "RA - Non Individual": [],
      "Sub Profile": [],
      RIA: [],
      Broker: [],
      PMS: [],
      AIF: [],
    };
    for (const sp of sps) {
      const b = bucketize(sp);
      if (b) idsByBucket[b].push(String(sp._id));
    }

    // Collect ALL SP ids so each downstream aggregation can run once and
    // we map back to buckets in JS — much cheaper than 7×N queries.
    const allSpIds = ([] as string[]).concat(...Object.values(idsByBucket));
    const bucketOf = new Map<string, BucketKey>();
    for (const b of BUCKETS) {
      for (const id of idsByBucket[b]) bucketOf.set(id, b);
    }

    // 2) Per-SP aggregations across the relevant collections.
    const [
      orderAgg, // sales count + revenue + unique subscribers, by soldBy.id
      recoAgg, // recommendation count by authorData.id
      articleAgg, // article count by authorData.id
      serviceAgg, // services count by authorData.id
      packageAgg, // packages count by authorData.id
      portfolioAgg, // portfolios count by authorData.id
    ] = await Promise.all([
      OrderModel.aggregate([
        { $match: { "soldBy.id": { $in: allSpIds }, paymentStatus: "verified" } },
        {
          $group: {
            _id: "$soldBy.id",
            sales: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$total", 0] } },
            subscribers: { $addToSet: "$orderdBy.id" },
          },
        },
      ]),
      ScoreCardModel.aggregate([
        { $match: { "authorData.id": { $in: allSpIds } } },
        { $group: { _id: "$authorData.id", count: { $sum: 1 } } },
      ]),
      ArticleModel.aggregate([
        { $match: { "authorData.id": { $in: allSpIds } } },
        { $group: { _id: "$authorData.id", count: { $sum: 1 } } },
      ]),
      ServiceModel.aggregate([
        { $match: { "authorData.id": { $in: allSpIds } } },
        { $group: { _id: "$authorData.id", count: { $sum: 1 } } },
      ]),
      PackageModel.aggregate([
        { $match: { "authorData.id": { $in: allSpIds } } },
        { $group: { _id: "$authorData.id", count: { $sum: 1 } } },
      ]),
      Portfolio.aggregate([
        { $match: { "authorData.id": { $in: allSpIds } } },
        { $group: { _id: "$authorData.id", count: { $sum: 1 } } },
      ]),
    ]);

    // 3) Fold per-SP rows into per-bucket totals.
    const emptyRow = () => ({
      registered: 0,
      subscribers: new Set<string>(),
      sales: 0,
      revenue: 0,
      recommendations: 0,
      articles: 0,
      plans: 0,
      packages: 0,
      portfolios: 0,
    });
    const tally: Record<BucketKey, ReturnType<typeof emptyRow>> = {
      "RA - Individual": emptyRow(),
      "RA - Non Individual": emptyRow(),
      "Sub Profile": emptyRow(),
      RIA: emptyRow(),
      Broker: emptyRow(),
      PMS: emptyRow(),
      AIF: emptyRow(),
    };

    for (const b of BUCKETS) tally[b].registered = idsByBucket[b].length;

    const addToBucket = (
      spId: string,
      mutate: (row: ReturnType<typeof emptyRow>) => void
    ) => {
      const b = bucketOf.get(spId);
      if (!b) return;
      mutate(tally[b]);
    };

    for (const r of orderAgg as any[]) {
      addToBucket(String(r._id), (row) => {
        row.sales += r.sales || 0;
        row.revenue += r.revenue || 0;
        for (const subId of r.subscribers || []) {
          if (subId) row.subscribers.add(String(subId));
        }
      });
    }
    for (const r of recoAgg as any[]) {
      addToBucket(String(r._id), (row) => (row.recommendations += r.count || 0));
    }
    for (const r of articleAgg as any[]) {
      addToBucket(String(r._id), (row) => (row.articles += r.count || 0));
    }
    for (const r of serviceAgg as any[]) {
      addToBucket(String(r._id), (row) => (row.plans += r.count || 0));
    }
    for (const r of packageAgg as any[]) {
      addToBucket(String(r._id), (row) => (row.packages += r.count || 0));
    }
    for (const r of portfolioAgg as any[]) {
      addToBucket(String(r._id), (row) => (row.portfolios += r.count || 0));
    }

    const data = BUCKETS.map((b) => ({
      bucket: b,
      registered: tally[b].registered,
      subscribers: tally[b].subscribers.size,
      sales: tally[b].sales,
      revenue: Math.round(tally[b].revenue),
      recommendations: tally[b].recommendations,
      articles: tally[b].articles,
      plans: tally[b].plans,
      packages: tally[b].packages,
      portfolios: tally[b].portfolios,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch content stats by type",
      error,
    });
  }
};

export const getALLServiceProviderStats = async (
  req: Request,
  res: Response
) => {
  try {
    const serviceProviders = await ServiceProviderRegModel.aggregate([
      {
        $match: { role: "provider", verified: true },
      },
      {
        $sort: {
          category: 1,
        },
      },
      {
        $group: {
          _id: "$category",
          totalDocuments: { $sum: 1 },
          totalFollowerCount: {
            $sum: {
              $cond: [
                { $eq: [{ $type: "$stats.Followers" }, "array"] },
                { $size: "$stats.Followers" },
                0,
              ],
            },
          },
          totalArticles: { $sum: "$stats.contentStats.articles" },
          totalVideos: { $sum: "$stats.contentStats.videos" },
          totalEvents: { $sum: "$stats.contentStats.events" },
          totalServices: { $sum: "$stats.contentStats.services" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Fetch",
      error: error,
    });
  }
};


const VALID_TYPES = ["Individual", "Non Individual", "sub profile"];
const VALID_CATEGORIES = ["Research Analyst", "Broker"];

export const updateServiceProviderMeta = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, type, category } = req.body;

    if (!id || !type || !category) {
      return res.status(400).json({
        success: false,
        message: "ID, type and category are required",
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type",
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    const updatedProvider = await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      {
        type,
        category,
        role: "provider", // force role
      },
      { new: true }
    );

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider updated successfully",
      data: updatedProvider,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};


export const getALLServiceProviders = async (req: Request, res: Response) => {
  const { verified } = req.query;

  if (!verified) {
    return res.status(500).json({
      success: false,
      message: "No Verified Status provided",
    });
  }

  try {
    const isVerified: boolean = verified === "true" ? true : false;

    // Pull SPs with the extra fields the admin table now displays. wallet and
    // subscriptionDetails live on the SP doc itself; revenue has to be
    // computed from OrderModel separately.
    const sps = await ServiceProviderRegModel.find({
      role: { $ne: "admin" },
      verified: isVerified,
    })
      .select(
        "_id category type RegName email regNumber verified number city state certificate createdAt wallet subscriptionDetails"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Single aggregation that produces BOTH revenue (sum of order totals)
    // and total sales (count of verified orders) per SP. One round-trip,
    // both numbers — much cheaper than running two aggregations.
    const spIds = sps.map((sp) => String(sp._id));
    const salesRows = await OrderModel.aggregate([
      {
        $match: {
          "soldBy.id": { $in: spIds },
          paymentStatus: "verified",
        },
      },
      {
        $group: {
          _id: "$soldBy.id",
          revenue: { $sum: { $ifNull: ["$total", 0] } },
          totalSales: { $sum: 1 },
        },
      },
    ]);
    const salesBySp = new Map<string, { revenue: number; totalSales: number }>();
    for (const row of salesRows) {
      salesBySp.set(String(row._id), {
        revenue: Number(row.revenue) || 0,
        totalSales: Number(row.totalSales) || 0,
      });
    }

    // Project into the exact shape the admin table consumes — flat,
    // predictable, no need for the frontend to dig through nested docs it
    // doesn't otherwise care about.
    const serviceProviders = sps.map((sp: any) => ({
      _id: sp._id,
      RegName: sp.RegName,
      email: sp.email,
      regNumber: sp.regNumber,
      category: sp.category,
      type: sp.type,
      verified: sp.verified,
      number: sp.number,
      city: sp.city,
      state: sp.state,
      certificate: sp.certificate,
      createdAt: sp.createdAt,
      wallet: { amount: sp.wallet?.amount ?? 0 },
      subscriptionActive: !!sp.subscriptionDetails?.subscriptionActive,
      revenue: salesBySp.get(String(sp._id))?.revenue ?? 0,
      totalSales: salesBySp.get(String(sp._id))?.totalSales ?? 0,
    }));

    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Fetch",
      error: error,
    });
  }
};

export const getOneServiceProviderData = async (
  req: Request,
  res: Response
) => {
  if (!req.query.id) {
    return res.status(400).json({
      success: false,
      message: "Failed to Fetch no id provided",
    });
  }

  try {
    const serviceProviderData = await ServiceProviderRegModel.findById(
      req.query.id
    ).select("-password");

    if (!serviceProviderData) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    // ── Marketplace membership (RA in any broker's activeRaIds) + ownership (broker who runs marketplaces) ──
    const spId = serviceProviderData._id;
    const marketplaceDocs = await MarketplaceModel.find({
      $or: [{ activeRaIds: spId }, { createdByBrokerId: spId }],
      status: "active",
    }).select("name slug createdByBrokerId activeRaIds");

    const marketplaces = marketplaceDocs.map((mp: any) => ({
      _id: String(mp._id),
      name: mp.name,
      slug: mp.slug,
      role:
        String(mp.createdByBrokerId) === String(spId) ? "broker" : "member",
    }));

    if (
      serviceProviderData.subscriptionDetails &&
      serviceProviderData.subscriptionDetails.subscriptionActive === true &&
      serviceProviderData.subscriptionDetails.currentSubscription
    ) {
      // Find the current subscription plan details
      const subscriptionDetails = await TradeboxPlansModel.findById(
        serviceProviderData.subscriptionDetails.currentSubscription
      );

      if (subscriptionDetails) {
        // Return the service provider data with subscription details
        return res.status(200).json({
          success: true,
          serviceProviderData: {
            ...serviceProviderData.toObject(),
            currentSubscriptionDetails: subscriptionDetails,
            marketplaces,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      serviceProviderData: {
        ...serviceProviderData.toObject(),
        marketplaces,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to Fetch",
      error: error,
    });
  }
};

// export const getContactLeads = async (req: Request, res: Response) => {
//   try {
//     const leads = await LeadsModel.find({}).sort({
//       createdAt: -1,
//     });

//     const formattedLeads = leads.map((lead: any) => {
//       return {
//         name: lead.sentBy?.name,
//         email: lead.sentBy?.email,
//         number: lead.sentBy?.number,
//         planName: lead.planName,
//         contactedTo: lead.sendTo?.name,
//         createdAt: new Date(lead.createdAt)
//           .toLocaleString("en-IN")
//           .split(",")[0],
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Fetched contact leads",
//       data: formattedLeads,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to Fetch",
//       error: error,
//     });
//   }
// };

export const getCustomersTable = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    // Aggregate Leads, Event registrations, and per-product Orders per userId
    // so we don't issue N+1 queries while building each row.
    const userIds = users.map((u) => String(u._id));

    // Subscription detail rows (one per Order or EventRegistration) drive the
    // denormalized table view. Lean + select to keep payload small.
    const [subscriptionOrders, subscriptionEvents] = await Promise.all([
      OrderModel.find({
        "orderdBy.id": { $in: userIds },
        type: { $in: ["service", "portfolio"] },
      })
        .select("orderdBy.id serviceName soldBy.name type isExpired createdAt")
        .lean(),
      EventRegistrationModel.find({ userId: { $in: userIds } })
        .populate("eventId", "title authorData")
        .lean(),
    ]);
    const subscriptionsByUser = new Map<string, any[]>();
    for (const o of subscriptionOrders as any[]) {
      const uid = String(o.orderdBy?.id);
      if (!uid) continue;
      const arr = subscriptionsByUser.get(uid) || [];
      arr.push({
        type: o.type === "portfolio" ? "Model Portfolio" : "Plan",
        raName: o.soldBy?.name || "—",
        serviceName: o.serviceName || "—",
        status: o.isExpired ? "Inactive" : "Active",
        subscribedAt: o.createdAt,
      });
      subscriptionsByUser.set(uid, arr);
    }
    for (const r of subscriptionEvents as any[]) {
      const uid = String(r.userId);
      if (!uid) continue;
      const arr = subscriptionsByUser.get(uid) || [];
      arr.push({
        type: "Event",
        raName: r.eventId?.authorData?.name || "—",
        serviceName: r.eventId?.title || "—",
        status: "Registered",
        subscribedAt: r.createdAt,
      });
      subscriptionsByUser.set(uid, arr);
    }

    const [leadAgg, eventAgg, orderTypeAgg] = await Promise.all([
      LeadModel.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      EventRegistrationModel.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      // Order.type is "service" | "portfolio" | "package" | "event"
      // (set in PaymentController). We use it to split the mixed
      // ServicesAndOrders.services bucket into plans vs portfolios,
      // and also tally active vs expired via Order.isExpired.
      OrderModel.aggregate([
        {
          $match: {
            "orderdBy.id": { $in: userIds },
            type: { $in: ["service", "portfolio", "package"] },
          },
        },
        {
          $group: {
            _id: { user: "$orderdBy.id", type: "$type" },
            count: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ["$isExpired", false] }, 1, 0] },
            },
            inactive: {
              $sum: { $cond: [{ $eq: ["$isExpired", true] }, 1, 0] },
            },
          },
        },
      ]),
    ]);
    const leadsByUser = new Map<string, number>(
      leadAgg.map((x: any) => [String(x._id), x.count])
    );
    const eventsByUser = new Map<string, number>(
      eventAgg.map((x: any) => [String(x._id), x.count])
    );
    const plansByUser = new Map<string, number>();
    const portfoliosByUser = new Map<string, number>();
    const packagesByUser = new Map<string, number>();
    const activeSubsByUser = new Map<string, number>();
    const inactiveSubsByUser = new Map<string, number>();
    for (const row of orderTypeAgg as any[]) {
      const uid = String(row._id.user);
      if (row._id.type === "service") plansByUser.set(uid, row.count);
      else if (row._id.type === "portfolio") portfoliosByUser.set(uid, row.count);
      else if (row._id.type === "package") packagesByUser.set(uid, row.count);
      activeSubsByUser.set(uid, (activeSubsByUser.get(uid) || 0) + row.active);
      inactiveSubsByUser.set(
        uid,
        (inactiveSubsByUser.get(uid) || 0) + row.inactive
      );
    }

    const data = users.map((user) => {
      const uid = String(user._id);
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        number: user.number || "-",
        telegram: user.telegram || "-",
        gender: user.gender || "-",
        dob: user.dob || "-",
        pannumber: user.pannumber || "-",
        following: user.stats?.Following?.length || 0,
        servicesAvailed: user.ServicesAndOrders?.services.length || 0,
        orders: user.ServicesAndOrders?.orders.length || 0,
        enrolledCourses: user.enrolledCourses?.length || 0,
        leadsCount: leadsByUser.get(uid) || 0,
        eventsEnrolled: eventsByUser.get(uid) || 0,
        plansCount: plansByUser.get(uid) || 0,
        portfoliosCount: portfoliosByUser.get(uid) || 0,
        packagesCount: packagesByUser.get(uid) || 0,
        activeSubscriptions: activeSubsByUser.get(uid) || 0,
        inactiveSubscriptions: inactiveSubsByUser.get(uid) || 0,
        // Brokers the user has linked (e.g. "bigul, aliceblue"); empty string if none.
        broker: (user.linkedBrokers || [])
          .map((b: any) => b.brokerType)
          .filter(Boolean)
          .join(", "),
        // Denormalized subscription rows for the per-subscription table view.
        subscriptions: subscriptionsByUser.get(uid) || [],
        // Raw ISO — frontend formats for display (formatDate) AND parses for the
        // signup-trend chart. Localizing here (e.g. "17/5/2026") breaks both
        // because new Date(...) can't parse en-IN format.
        createdAt: user.createdAt,
      };
    });

    return res
      .status(200)
      .json({ success: true, message: "Fetched services", data: data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

// GET /api/admin/login-activity — paginated, reverse-chron feed of successful
// logins (admin "Recent Login Activity"). Runs under the global
// verifyUserRATokenMiddleware mounted on /api/admin, so it is admin-only.
export const getLoginActivityFeed = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { subjectType, search } = req.query as {
      subjectType?: string;
      search?: string;
    };

    const filter: Record<string, any> = {};
    if (subjectType && ["user", "provider", "admin"].includes(subjectType)) {
      filter.subjectType = subjectType;
    }
    if (search && search.trim()) {
      const rx = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ name: rx }, { email: rx }, { number: rx }, { ipAddress: rx }];
    }

    const [data, total] = await Promise.all([
      LoginActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoginActivityModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch login activity",
      error,
    });
  }
};

export const fetchCustomerDetails = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no id provided",
    });
  }
  try {
    const { id } = req.query;

    const user = await UserModel.findById(id).select(
      "ServicesAndOrders.services"
    );

    const services = await ServiceModel.find({
      _id: { $in: user?.ServicesAndOrders?.services },
    }).select("title authorData.name");

    const data = services.map((service) => {
      return { title: service.title, author: service.authorData?.name };
    });

    return res.status(200).json({
      success: true,
      message: "Fetched",
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

export const getRegisteredUsers = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const registrations = await EventRegistrationModel.find({ eventId: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: "There is an error" });
  }
};

export const getTradeboxWalletListTradeboxPlans = async (
  req: Request,
  res: Response
) => {
  try {
    const plans = await TradeboxPlansModel.find({})
      .sort({ createdAt: -1 })
      .populate("serviceId", "title");

    return res.status(200).json({
      success: true,
      message: "List fetched",
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getProviderWalletTransactionList = async (
  req: Request,
  res: Response
) => {
  try {
    const transactions = await WalletTransactionModel.find({}).sort({
      createdAt: -1,
    });

    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const provider = await ServiceProviderRegModel.findById(
          transaction.serviceProviderId
        );
      
        return {
          ...transaction.toObject(),
          providerName: provider?.RegName || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "List fetched",
      data: enrichedTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const getServiceProviderPlans = async (req: Request, res: Response) => {
  try {
    // Get all orders
    const orders = await OrderModel.find().sort({ createdAt: -1 });

    // Extract all unique service provider IDs
    const uniqueSPIds = [...new Set(orders.map((order) => order?.soldBy?.id))];

    // Fetch their GST details
    const serviceProviders = await ServiceProviderRegModel.find({
      _id: { $in: uniqueSPIds },
    });

    // Build map: serviceProviderId -> gst string or undefined
    const spGstMap: Record<string, string | undefined> = {};
    serviceProviders.forEach((sp) => {
      spGstMap[sp._id.toString()] = sp.gst;
    });

    const enrichedOrders = orders.map((order) => {
      const spId: any = order?.soldBy?.id;
      const hasGst = !!spGstMap[spId];

      let subtotal = order.subtotal;
      let gst = order.gst;
      let total = order.total;

      // If order already has all three, use them directly
      const hasNewFormat =
        subtotal !== undefined && gst !== undefined && total !== undefined;

      if (!hasNewFormat && order.amount !== undefined && hasGst) {
        subtotal = parseFloat((order.amount / 1.18).toFixed(2));
        gst = parseFloat((order.amount - subtotal).toFixed(2));
        total = order.amount;
      }

      return {
        ...order.toObject(),
        subtotal,
        gst,
        total,
        gstRegistered: hasGst,
      };
    });

    return res.status(200).json({
      success: true,
      data: enrichedOrders,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

export const getTotalAmountWallet = async (req: Request, res: Response) => {
  try {
    const advanceRAWallet = await ServiceProviderRegModel.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$wallet.amount" },
        },
      },
    ]);

    const totalAmountTradeboxPlans = await TradeboxPlansModel.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalAmountSPPlans = await OrderModel.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalGSTTradeboxPlans = await TradeboxPlansModel.aggregate([
      {
        $group: {
          _id: null,
          GST: {
            $sum: {
              $round: [
                { $divide: [{ $multiply: ["$amount", 0.18] }, 1.18] },
                2,
              ],
            },
          },
        },
      },
    ]);

    const totalclaimedGSTTradeboxPlans = await GSTTableModel.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountTradebox" },
        },
      },
    ]);

    // const totalGSTSPPlans = await OrderModel.aggregate([
    //   {
    //     $group: {
    //       _id: null,
    //       GST: {
    //         $sum: {
    //           $round: [
    //             { $divide: [{ $multiply: ["$amount", 0.18] }, 1.18] },
    //             2,
    //           ],
    //         },
    //       },
    //     },
    //   },
    // ]);

    // const totalclaimedGSTSPPlans = await GSTTableModel.aggregate([
    //   {
    //     $group: {
    //       _id: null,
    //       totalAmount: { $sum: "$amountSP" },
    //     },
    //   },
    // ]);

    // const totalWithdrawals = await WithdrawalModel.aggregate([
    //   { $match: { processedStatus: "processed" } },
    //   {
    //     $group: {
    //       _id: null,
    //       totalAmount: { $sum: "$amount" },
    //     },
    //   },
    // ]);

    const totalAdvanceAmount =
      advanceRAWallet.length > 0 ? advanceRAWallet[0].totalAmount : 0;

    const totalAmountSPPlansValue =
      totalAmountSPPlans.length > 0 ? totalAmountSPPlans[0].totalAmount : 0;
    const totalAmountTradeboxPlansValue =
      totalAmountTradeboxPlans.length > 0
        ? totalAmountTradeboxPlans[0].totalAmount
        : 0;

    // const totalWithdrawalsValue =
    //   totalWithdrawals.length > 0 ? totalWithdrawals[0].totalAmount : 0;

    // const totalGSTSPPlansValue =
    //   totalGSTSPPlans.length > 0 ? totalGSTSPPlans[0].GST : 0;

    const totalGSTTradeboxPlansValue =
      totalGSTTradeboxPlans.length > 0 ? totalGSTTradeboxPlans[0].GST : 0;

    // const totalclaimedGSTSPPlansValue =
    //   totalclaimedGSTSPPlans.length > 0
    //     ? totalclaimedGSTSPPlans[0].totalAmount
    //     : 0;

    const totalclaimedGSTTradeboxPlansValue =
      totalclaimedGSTTradeboxPlans.length > 0
        ? totalclaimedGSTTradeboxPlans[0].totalAmount
        : 0;

    return res.status(200).json({
      success: true,
      message: "List fetched",
      data: {
        totalAdvanceAmount: totalAdvanceAmount.toFixed(2),
        // totalAmount: (
        //   totalAmountSPPlansValue +
        //   totalAmountTradeboxPlansValue -
        //   totalWithdrawalsValue
        // ).toFixed(2),
        totalAmountTradeboxPlans: totalAmountTradeboxPlansValue.toFixed(2),
        // totalAmountSPPlans: (
        //   totalAmountSPPlansValue - totalWithdrawalsValue
        // ).toFixed(2),

        // totalGSTSPPlans: (
        //   totalGSTSPPlansValue - totalclaimedGSTSPPlansValue
        // ).toFixed(2),
        totalGSTTradeboxPlans: (
          totalGSTTradeboxPlansValue - totalclaimedGSTTradeboxPlansValue
        ).toFixed(2),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const calculateGST = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch no details provided",
    });
  }

  try {
    const parsedStartDate = parse(
      startDate as string,
      "yyyy-MM-dd",
      new Date()
    );

    const parsedEndDate = parse(endDate as string, "yyyy-MM-dd", new Date());

    const totalGST = await TradeboxPlansModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay(parsedStartDate),
            $lte: endOfDay(parsedEndDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalGST: {
            $sum: {
              $round: [
                { $multiply: [{ $divide: ["$amount", 1.18] }, 0.18] },
                2,
              ],
            },
          },
        },
      },
    ]);

    const totalclaimedGSTTradeboxPlans = await GSTTableModel.aggregate([
      {
        $match: {
          $and: [
            {
              from: {
                $gte: startOfDay(parsedStartDate).toISOString(),
              },
            },
            {
              to: {
                $lte: endOfDay(parsedEndDate).toISOString(),
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountTradebox" },
        },
      },
    ]);

    const totalSPGST = await OrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay(parsedStartDate),
            $lte: endOfDay(parsedEndDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalGST: {
            $sum: {
              $round: [
                { $multiply: [{ $divide: ["$amount", 1.18] }, 0.18] },
                2,
              ],
            },
          },
        },
      },
    ]);

    const totalclaimedGSTSPPlans = await GSTTableModel.aggregate([
      {
        $match: {
          $and: [
            {
              from: {
                $gte: startOfDay(parsedStartDate).toISOString(),
              },
            },
            {
              to: {
                $lte: endOfDay(parsedEndDate).toISOString(),
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountSP" },
        },
      },
    ]);

    const totalGSTValue = totalGST.length > 0 ? totalGST[0].totalGST : 0;
    const totalSPGSTValue = totalSPGST.length > 0 ? totalSPGST[0].totalGST : 0;

    const totalclaimedGSTSPPlansValue =
      totalclaimedGSTSPPlans.length > 0
        ? totalclaimedGSTSPPlans[0].totalAmount
        : 0;

    const totalclaimedGSTTradeboxPlansValue =
      totalclaimedGSTTradeboxPlans.length > 0
        ? totalclaimedGSTTradeboxPlans[0].totalAmount
        : 0;

    return res.status(200).json({
      success: true,
      message: "GST fetched",
      data: {
        totalGST: (totalGSTValue - totalclaimedGSTTradeboxPlansValue).toFixed(
          2
        ),
        totalSPGST: (totalSPGSTValue - totalclaimedGSTSPPlansValue).toFixed(2),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const claimGST = async (req: Request, res: Response) => {
  const { amountSP, amountTradebox, from, to } = req.body;

  if (!from || !to) {
    return res.status(500).json({
      success: false,
      message: "Failed to claim no details provided",
    });
  }

  try {
    const newClaim = new GSTTableModel({
      amountSP,
      amountTradebox,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    });

    await newClaim.save();

    return res.status(200).json({
      success: true,
      message: "GST claimed",
      data: "",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to claim",
      error: error,
    });
  }
};

export const GSTDataTable = async (req: Request, res: Response) => {
  try {
    const GSTData = await GSTTableModel.find({}).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "GST data fetched",
      data: GSTData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const approveServiceProvider = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify no id provided",
    });
  }

  try {
    const { id } = req.body;

    const currDateFull = new Date().toLocaleString("en-IN");
    const currDay = new Date().getDate().toLocaleString("en-IN");
    const currentMonth = new Date().toLocaleDateString("en-IN", {
      month: "long",
    });

    const provider = await ServiceProviderRegModel.findById(id);

    const newNotification = new notificationModel({
      message:
        "Congratulations on successfully registering with us. Step into your dashboard and unlock a world of opportunity to showcase your services and connect with our community. Best wishes, Trade Box Fintech Solutions.",

      sendTo: [
        {
          id: provider?._id,
          name: provider?.RegName,
        },
      ],
      sentBy: {
        id: "admin",
        name: "admin",
      },
      type: "admin",
    });

    await newNotification.save();

    const Sp = await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      {
        $set: {
          verified: true,
          approved: true,
          approvalDate: currDateFull,
          subscriptionDetails: {
            plan: "Basic",
            validity: 1,
            price: 0,
            gst: 0,
            total: 0,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            status: "active",
          },
        },
        $addToSet: { notifications: newNotification._id },
      },
      { new: true }
    );

    if (Sp?.category === "PMS" || Sp?.category === "AIF") {
      const file = await GetFilesFromS3(
        "SLA/CONFIDENTIALITY AGREEMENT format.docx"
      );

      const content = await file?.transformToByteArray();

      const zip = new PizZip(content!);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render({
        currDay: currDay,
        currentMonth: currentMonth,
        RegName: Sp?.RegName,
        regNumber: Sp?.regNumber,
        address: `${Sp?.address1} + ${Sp?.address2}`,
        email: Sp?.email,
        category: Sp?.category,
      });

      const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      // Define the file key for S3
      const fileName = `SLA Agreement ${Sp.category}.docx`;
      const fileKey = `ServiceProviderCertificates/${Sp.RegName}-(${Sp.email})/${fileName}`;

      // Upload the generated document to S3
      await uploadBufferToS3(
        fileKey,
        buf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      const docfile = await GetFilesFromS3(fileKey);

      // Convert the DOCX buffer to HTML
      const docBuffer = await docfile?.transformToByteArray();
      if (!docBuffer) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve the document buffer from S3",
        });
      }
      // Convert Uint8Array to Buffer
      const buffer = Buffer.from(docBuffer);
      const { value: html } = await mammoth.convertToHtml({
        buffer,
      });

      // Add padding to the HTML content
      const paddedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      padding: 25px; /* Adjust the padding as needed */
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
`;

      // Generate PDF from HTML using Puppeteer
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(paddedHtml);
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "50px", // Adjust the top margin
          right: "20px", // Adjust the right margin
          bottom: "50px", // Adjust the bottom margin
          left: "20px", // Adjust the left margin
        },
      });
      await browser.close();

      const base64String = pdfBuffer.toString("base64");

      const mailOptions = {
        from: process.env.EMAIL,
        to: Sp.email,
        subject: `Hello, ${Sp.RegName}`,
        html: `</p> Hello, ${Sp.RegName} congratulations your account has been approved as a ${Sp.category}, kindly sign the required Service-Level Agreement. You can send the Signed softcopy of the SLA to the respective email id (info@tradeboxlive.com) <br /> <br /> Best regards,<br /> <br /> Trade Box Fintech Solutions `,
        attachments: [
          {
            filename: `SLA Agreement ${Sp.category}.pdf`,
            content: base64String,
            encoding: "base64",
            contentType: "application/pdf",
          },
        ],
      };

      await mailQueue.add(
        Sp.email,
        { mailOptions },
        { removeOnComplete: true, removeOnFail: true }
      );

      // Upload the generated PDF to S3
      const pdfFileName = `SLA Agreement ${Sp.category}.pdf`;
      const pdfFileKey = `ServiceProviderCertificates/${Sp.RegName}-(${Sp.email})/${pdfFileName}`;

      await uploadBufferToS3(pdfFileKey, pdfBuffer, "application/pdf");
    }

    if (Sp?.category === "Research Analyst") {
      const file = await GetFilesFromS3("SLA/SLA Agreement for RA.docx");

      const content = await file?.transformToByteArray();

      const zip = new PizZip(content!);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render({
        currDay: currDay,
        currentMonth: currentMonth,
        RegName: Sp?.RegName,
        regNumber: Sp?.regNumber,
        address: `${Sp?.address1} + ${Sp?.address2}`,
        email: Sp?.email,
        category: Sp?.category,
      });

      const buf = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      // Define the file key for S3
      const fileName = `SLA Agreement ${Sp.category}.docx`;
      const fileKey = `ServiceProviderCertificates/${Sp.RegName}-(${Sp.email})/${fileName}`;

      // Upload the generated document to S3
      await uploadBufferToS3(
        fileKey,
        buf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      const docfile = await GetFilesFromS3(fileKey);

      // Convert the DOCX buffer to HTML
      const docBuffer = await docfile?.transformToByteArray();
      if (!docBuffer) {
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve the document buffer from S3",
        });
      }
      // Convert Uint8Array to Buffer
      const buffer = Buffer.from(docBuffer);
      const { value: html } = await mammoth.convertToHtml({
        buffer,
      });

      // Add padding to the HTML content
      const paddedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      padding: 25px; /* Adjust the padding as needed */
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
`;

      // Generate PDF from HTML using Puppeteer
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(paddedHtml);
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "50px", // Adjust the top margin
          right: "20px", // Adjust the right margin
          bottom: "50px", // Adjust the bottom margin
          left: "20px", // Adjust the left margin
        },
      });
      await browser.close();

      const base64String = pdfBuffer.toString("base64");

      const mailOptions = {
        from: process.env.EMAIL,
        to: Sp.email,
        subject: `Hello, ${Sp.RegName}`,
        html: `</p> Hello, ${Sp.RegName} congratulations your account has been approved as a ${Sp.category}, kindly sign the required Service-Level Agreement. You can send the Signed softcopy of the SLA to the respective email id (info@tradeboxlive.com) <br /> <br /> Best regards,<br /> <br /> Trade Box Fintech Solutions `,
        attachments: [
          {
            filename: `SLA Agreement ${Sp.category}.pdf`,
            content: base64String,
            encoding: "base64",
            contentType: "application/pdf",
          },
        ],
      };

      await mailQueue.add(
        Sp.email,
        { mailOptions },
        { removeOnComplete: true, removeOnFail: true }
      );

      // Upload the generated PDF to S3
      const pdfFileName = `SLA Agreement ${Sp.category}.pdf`;
      const pdfFileKey = `ServiceProviderCertificates/${Sp.RegName}-(${Sp.email})/${pdfFileName}`;

      await uploadBufferToS3(pdfFileKey, pdfBuffer, "application/pdf");
    }
    return res
      .status(200)
      .json({ success: true, message: "Service Provider Approved" });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify",
      error: error,
    });
  }
};

export const verifyServiceProvider = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify no id provided",
    });
  }

  try {
    const { id } = req.body;

    await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      {
        $set: {
          verified: true,
          approved: true,
        },
      },
      { new: true }
    );

    await ArticleModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": true } },
      { new: true }
    );

    await VideoModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": true } },
      { new: true }
    );

    await PodcastModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": true } },
      { new: true }
    );

    await EventModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": true } },
      { new: true }
    );

    await ServiceModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": true } },
      { new: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Service Provider verified" });
  } catch (error) {
    // console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify",
      error: error,
    });
  }
};

export const rejectServiceProvider = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  if (!req.body.email) {
    return res.status(500).json({
      success: false,
      message: "no email provided",
    });
  }

  const { id, email, name, reason } = req.body;

  try {
    await ServiceProviderRegModel.findByIdAndDelete(id);
    await ArticleModel.deleteMany({ "authorData.id": id });
    await VideoModel.deleteMany({ "authorData.id": id });
    await PodcastModel.deleteMany({ "authorData.id": id });
    await EventModel.deleteMany({ "authorData.id": id });
    await ServiceModel.deleteMany({ "authorData.id": id });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Hello ${name},`,
      html: `<p>We noticed a discrepancy during your registration. Kindly review your information and ensure all details are accurate. Feel free to rectify and reapply for a seamless experience.</p> <br /> <p> ${reason} </p> <br /> <br /> Best regards,    <br /> <br /> Trade Box Fintech Solutions `,
    };

    await mailQueue.add(
      email,
      { mailOptions },
      { removeOnComplete: true, removeOnFail: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Service Provider disapproved" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const DeleteServiceProvider = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const sp = await ServiceProviderRegModel.findByIdAndDelete(id);

    if (sp.value?.profileUrl?.includes("ServiceProviderCertificates")) {
      const decodedURL = decodeURIComponent(sp.value?.profileUrl);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderCertificates")
      );

      await deleteObject(key);
    }

    const articles = await ArticleModel.find({ "authorData.id": id });

    articles.map(async (article) => {
      if (article.articlePDF.includes("ServiceProviderPosts")) {
        const decodedURL = decodeURIComponent(article.articlePDF);
        const key = decodedURL.substring(
          decodedURL.indexOf("ServiceProviderPosts")
        );

        await deleteObject(key);
      }

      if (article.image.includes("ServiceProviderPosts")) {
        const decodedURL = decodeURIComponent(article.image);
        const key = decodedURL.substring(
          decodedURL.indexOf("ServiceProviderPosts")
        );

        await deleteObject(key);
      }
    });

    await ArticleModel.deleteMany({ "authorData.id": id });

    const videos = await VideoModel.find({ "authorData.id": id });

    videos.map(async (video) => {
      if (video.image.includes("ServiceProviderPosts")) {
        const decodedURL = decodeURIComponent(video.image);
        const key = decodedURL.substring(
          decodedURL.indexOf("ServiceProviderPosts")
        );

        await deleteObject(key);
      }
    });

    await VideoModel.deleteMany({ "authorData.id": id });

    const podcasts = await PodcastModel.find({ "authorData.id": id });

    podcasts.map(async (podcast) => {
      if (podcast.image.includes("ServiceProviderPosts")) {
        const decodedURL = decodeURIComponent(podcast.image);
        const key = decodedURL.substring(
          decodedURL.indexOf("ServiceProviderPosts")
        );

        await deleteObject(key);
      }
    });

    await PodcastModel.deleteMany({ "authorData.id": id });

    const events = await EventModel.find({ "authorData.id": id });

    events.map(async (event) => {
      if (event.image?.includes("ServiceProviderPosts")) {
        const decodedURL = decodeURIComponent(event.image);
        const key = decodedURL.substring(
          decodedURL.indexOf("ServiceProviderPosts")
        );

        await deleteObject(key);
      }
    });

    await EventModel.deleteMany({ "authorData.id": id });
    await ServiceModel.deleteMany({ "authorData.id": id });

    return res
      .status(200)
      .json({ success: true, message: "Service Provider deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const DeleteCustomer = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  try {
    const { id } = req.body;

    const user = await UserModel.findById(id);

    const SPsFollowing = await ServiceProviderRegModel.find({
      "stats.Followers": { $in: user?.stats?.Following },
    }).select("stats.Followers");

    const SPsSubscribed = await ServiceModel.find({
      _id: { $in: user?.ServicesAndOrders?.services },
    });

    for (const service of SPsSubscribed) {
      await ServiceModel.findByIdAndUpdate(service._id, {
        $pull: { subscribedBy: id },
      });
    }

    for (const sp of SPsFollowing) {
      await ServiceProviderRegModel.findByIdAndUpdate(sp._id, {
        $pull: { "stats.Followers": id },
      });
    }

    await UserModel.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removeServiceProvider = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      {
        $set: {
          verified: false,
        },
      },
      { new: true }
    );

    await ArticleModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": false } },
      { new: true }
    );

    await VideoModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": false } },
      { new: true }
    );

    await PodcastModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": false } },
      { new: true }
    );

    await EventModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": false } },
      { new: true }
    );

    await ServiceModel.updateMany(
      { "authorData.id": id },
      { $set: { "authorData.isVerified": false } },
      { new: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Service Provider removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removeArticle = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const article = await ArticleModel.findById(id);
    const authroId = article?.authorData?.id;
    await ServiceProviderRegModel.findByIdAndUpdate(
      authroId,
      { $inc: { "stats.contentStats.articles": -1 } },
      { new: true }
    );

    const response = await ArticleModel.findByIdAndDelete(id);

    if (response === null) {
      return res.status(500).json({
        success: false,
        message: "Failed",
      });
    }

    if (response.value?.articlePDF.includes("ServiceProviderPosts")) {
      const decodedURL = decodeURIComponent(response.value?.articlePDF);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderPosts")
      );

      await deleteObject(key);
    }

    if (response.value?.image.includes("ServiceProviderPosts")) {
      const decodedURL = decodeURIComponent(response.value?.image);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderPosts")
      );

      await deleteObject(key);
    }

    return res.status(200).json({ success: true, message: "Article removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removeEvent = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const event = await EventModel.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // // console.log("Event to delete:", event);

    if (!event.authorData || !event.authorData.id) {
      return res.status(500).json({
        success: false,
        message: "Author data missing in event",
      });
    }

    const authorId = event.authorData.id;

    // Log the authorId to ensure it is being retrieved correctly
    // // console.log("Author ID:", authorId);

    if (!authorId) {
      return res.status(500).json({
        success: false,
        message: "Author data missing in response",
      });
    }

    const updatedServiceProvider =
      await ServiceProviderRegModel.findByIdAndUpdate(
        authorId,
        { $inc: { "stats.contentStats.events": -1 } },
        { new: true }
      );

    if (!updatedServiceProvider) {
      return res.status(500).json({
        success: false,
        message: "Failed to update event count",
      });
    }

    // Delete the event
    const response = await EventModel.findByIdAndDelete(id);

    if (!response) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete event",
      });
    }

    // Log the response after deletion
    // // console.log("Deleted event response:", response);

    if (response.value?.image?.includes("ServiceProviderPosts")) {
      const decodedURL = decodeURIComponent(response.value?.image);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderPosts")
      );

      await deleteObject(key);
    }

    return res.status(200).json({ success: true, message: "Event removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removePodcast = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const podcast = await PodcastModel.findById(id);
    if (!podcast) {
      return res.status(404).json({
        success: false,
        message: "Podcast not found",
      });
    }
    const authorId = podcast?.authorData?.id;
    await ServiceProviderRegModel.findByIdAndUpdate(
      authorId,
      { $inc: { "stats.contentStats.podcasts": -1 } },
      { new: true }
    );
    const response = await PodcastModel.findByIdAndDelete(id);

    if (response === null) {
      return res.status(500).json({
        success: false,
        message: "Failed",
      });
    }

    if (response.value?.image.includes("ServiceProviderPosts")) {
      const decodedURL = decodeURIComponent(response.value?.image);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderPosts")
      );

      await deleteObject(key);
    }

    return res.status(200).json({ success: true, message: "Podcast removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removeVideo = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const video = await VideoModel.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }
    const authorId = video?.authorData?.id;
    await ServiceProviderRegModel.findByIdAndUpdate(
      authorId,
      { $inc: { "stats.contentStats.videos": -1 } },
      { new: true }
    );
    const response = await VideoModel.findByIdAndDelete(id);

    if (response.value?.image.includes("ServiceProviderPosts")) {
      const decodedURL = decodeURIComponent(response.value?.image);
      const key = decodedURL.substring(
        decodedURL.indexOf("ServiceProviderPosts")
      );

      await deleteObject(key);
    }

    return res.status(200).json({ success: true, message: "Video removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const removeService = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    const service = await ServiceModel.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }
    const authorId = service?.authorData?.id;
    await ServiceProviderRegModel.findByIdAndUpdate(
      authorId,
      { $inc: { "stats.contentStats.services": -1 } },
      { new: true }
    );
    await ServiceModel.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Service removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const sendNotifications = async (req: Request, res: Response) => {
  const {
    message,
    sendTo,
    sentToName,
    recipientIds,
    recipientRole,
    ctaLabel,
    postLink,
  } = req.body || {};

  if (!message) {
    return res.status(400).json({
      success: false,
      message: "message is required",
    });
  }

  // Backward compat: older callers pass `sendTo: [{id, name}, ...]` and
  // expected the old broken behaviour (orphan doc). New callers should
  // pass `recipientIds: string[]` and `recipientRole: "user" | "provider"`
  // so the broadcast actually reaches recipients' inboxes.
  const ids: string[] = Array.isArray(recipientIds)
    ? recipientIds.map(String).filter(Boolean)
    : Array.isArray(sendTo)
      ? sendTo
          .map((entry: any) => (entry && entry.id ? String(entry.id) : ""))
          .filter(Boolean)
      : [];

  const role: "user" | "provider" =
    recipientRole === "provider" ? "provider" : "user";

  try {
    await sendNotification({
      recipientIds: ids,
      recipientRole: role,
      message,
      type: "announcement",
      category: "admin",
      sentBy: { id: "admin", name: "Tradebox" },
      ctaLabel: typeof ctaLabel === "string" ? ctaLabel : undefined,
      postLink: typeof postLink === "string" ? postLink : undefined,
      sendToLabel: typeof sentToName === "string" ? sentToName : undefined,
    });

    return res
      .status(200)
      .json({ success: true, message: "Notification sent" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send notifications",
      error,
    });
  }
};

export const getAllNotificationsForAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const formattedNotis = await notificationModel.aggregate([
      {
        $project: {
          _id: 1,
          message: 1,
          postLink: 1,
          type: 1,
          sentBy: {
            id: "$sentBy.id",
            name: { $ifNull: ["$sentBy.name", "Unknown"] },
          },
          sendTo: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Notification fetched",
      notifications: formattedNotis,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error,
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  const { id } = req.body;

  try {
    await notificationModel.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ success: true, message: "Notification removed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error,
    });
  }
};

export const fetchWithdrawalRequests = async (req: Request, res: Response) => {
  if (!req.query.type) {
    return res.status(500).json({
      success: false,
      message: "No type provided",
    });
  }

  try {
    let data;

    data = await WithdrawalModel.find({ processedStatus: req.query.type }).sort(
      {
        createdAt: -1,
      }
    );

    return res
      .status(200)
      .json({ success: true, message: "Requests fetched", data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
      error,
    });
  }
};

export const approveWithdrawal = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve",
    });
  }

  try {
    const { id } = req.body;

    await WithdrawalModel.findByIdAndUpdate(id, {
      $set: { processedStatus: "approved" },
    });

    return res
      .status(200)
      .json({ success: true, message: "Withdrawal Approved" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve",
      error,
    });
  }
};

export const rejectWithdrawal = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject",
    });
  }

  try {
    const { id } = req.body;

    await WithdrawalModel.findByIdAndUpdate(id, {
      $set: { processedStatus: "rejected" },
    });

    return res
      .status(200)
      .json({ success: true, message: "Withdrawal Rejected" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject",
      error,
    });
  }
};

export const processWithdrawal = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(500).json({
      success: false,
      message: "Failed to process",
    });
  }
  const expectedKeys = ["id", "referenceNo"];
  try {
    const parsedBody = req.body;
    const allElementsPresent = expectedKeys.every((key) =>
      parsedBody.hasOwnProperty(key)
    );
    if (!allElementsPresent)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    const { id, referenceNo, notes } = req.body;

    const withdrawal = await WithdrawalModel.findByIdAndUpdate(id, {
      $set: { processedStatus: "processed", referenceNo, notes },
    });

    const negativeAmount = withdrawal?.amount! * -1;
    await ServiceProviderRegModel.findByIdAndUpdate(withdrawal?.spId, {
      $inc: { "wallet.amount": negativeAmount },
    });

    return res
      .status(200)
      .json({ success: true, message: "Withdrawal Processed" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process",
      error,
    });
  }
};

// Admin-only: rebuild the invoice PDF for a service-purchase order using the
// current OrderModel/ServiceProvider/User docs. The original invoice number
// is preserved (from order.invoiceNumber, falling back to parsing the old
// S3 link, falling back to a fresh number) so accounting stays clean.
// Optional `edits` lets the admin correct a whitelisted set of financial
// fields on the order before regeneration — used when the source data was
// wrong (e.g. coupon not captured at lead stage).
export const regenerateServiceInvoice = async (
  req: Request,
  res: Response,
) => {
  const { orderId, edits } = req.body ?? {};

  if (!orderId || typeof orderId !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "orderId is required" });
  }

  try {
    let order = await OrderModel.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    let editsApplied = false;
    if (edits && typeof edits === "object") {
      const patch: Record<string, any> = {};

      const numericField = (key: "subtotal" | "gst" | "total" | "discountAmount") => {
        if (edits[key] === undefined) return null;
        const v = Number(edits[key]);
        if (!Number.isFinite(v) || v < 0) {
          return `${key} must be a non-negative number`;
        }
        patch[key] = v;
        return null;
      };

      for (const key of ["subtotal", "gst", "total", "discountAmount"] as const) {
        const err = numericField(key);
        if (err) {
          return res.status(400).json({ success: false, message: err });
        }
      }

      // If subtotal+gst supplied without an explicit total, derive it.
      if (
        patch.subtotal !== undefined &&
        patch.gst !== undefined &&
        patch.total === undefined
      ) {
        patch.total = patch.subtotal + patch.gst;
      }

      if (edits.coupon === null) {
        patch.coupon = null;
      } else if (edits.coupon && typeof edits.coupon === "object") {
        const c = edits.coupon;
        const coupon: Record<string, any> = {};
        if (c.id !== undefined) coupon.id = String(c.id);
        if (c.code !== undefined) coupon.code = String(c.code);
        if (c.type !== undefined) coupon.type = String(c.type);
        if (c.value !== undefined) {
          const v = Number(c.value);
          if (!Number.isFinite(v) || v < 0) {
            return res.status(400).json({
              success: false,
              message: "coupon.value must be a non-negative number",
            });
          }
          coupon.value = v;
        }
        patch.coupon = coupon;
      }

      if (Object.keys(patch).length > 0) {
        const updated = await OrderModel.findByIdAndUpdate(
          orderId,
          { $set: patch },
          { new: true },
        );
        if (updated) order = updated;
        editsApplied = true;
      }
    }

    const serviceProvider = await ServiceProviderRegModel.findById(
      order.soldBy?.id,
    );
    if (!serviceProvider) {
      return res
        .status(404)
        .json({ success: false, message: "Service provider not found" });
    }

    const buyer = await UserModel.findById(order.orderdBy?.id);
    if (!buyer) {
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found" });
    }

    let invoiceNumber: string | null =
      order.invoiceNumber || parseInvoiceNumberFromUrl(order.invoiceLink);
    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber();
      console.warn(
        `[regenerate-invoice] no prior invoice number on order=${orderId}; generated fresh number=${invoiceNumber}`,
      );
    }

    const buyerName = order.orderdBy?.name || (buyer as any).name || "";
    const spAddress = [
      (serviceProvider as any).address1,
      (serviceProvider as any).address2,
      serviceProvider.city,
      serviceProvider.state,
    ]
      .filter(Boolean)
      .join(", ");

    const pdfBuffer = await generateServiceInvoicePDF({
      invoiceNumber,
      issueDate: new Date(order.createdAt as any),
      // Buyer
      buyerName,
      buyerEmail: order.orderdBy?.email || (buyer as any).email || "",
      buyerPhone: (buyer as any).number?.toString() || "",
      buyerPan: (buyer as any).pannumber || "",
      // Service Provider
      serviceProviderName: order.soldBy?.name || "",
      serviceProviderEmail: serviceProvider.email || "",
      serviceProviderPhone: (serviceProvider as any).number?.toString() || "",
      serviceProviderAddress: spAddress,
      serviceProviderGST: serviceProvider.gst || "",
      serviceProviderHSN: (serviceProvider as any).hsnCode || "",
      serviceProviderRegNumber: (serviceProvider as any).regNumber,
      serviceProviderWebsite: (serviceProvider as any).website,
      serviceProviderState: serviceProvider.state,
      // Service
      serviceName: order.serviceName || "",
      validity: order.validity || "",
      serviceStartDate: order.startDate
        ? new Date(order.startDate as any)
        : new Date(order.createdAt as any),
      serviceEndDate: order.endDate
        ? new Date(order.endDate as any)
        : new Date(order.createdAt as any),
      // Financial — taken from current DB state
      subtotal: order.subtotal || 0,
      gst: order.gst || 0,
      total: order.total || 0,
      discountAmount: order.discountAmount ?? 0,
      couponCode: (order.coupon as any)?.code ?? undefined,
    } as any);

    const fileLocation = await saveInvoiceToS3(
      pdfBuffer.toString("base64"),
      "serviceproviderplans",
      buyerName,
      `Invoice_${invoiceNumber}.pdf`,
    );

    await OrderModel.findByIdAndUpdate(orderId, {
      $set: { invoiceLink: fileLocation, invoiceNumber },
    });

    const actor =
      (req as any).user?._id?.toString() ||
      (req as any).user?.id?.toString() ||
      "unknown";
    console.log(
      `[regenerate-invoice] order=${orderId} admin=${actor} editsApplied=${editsApplied} invoiceNumber=${invoiceNumber}`,
    );

    return res.status(200).json({
      success: true,
      message: "Invoice regenerated",
      invoiceLink: fileLocation,
      invoiceNumber,
      editsApplied,
    });
  } catch (error) {
    console.error("[regenerate-invoice] failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to regenerate invoice",
      error,
    });
  }
};

export const ApproveEvent = async (req: Request, res: Response) => {
  const { id } = req.body;

  try {
    const event = await EventModel.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    event.approvalStatus = true;
    await event.save();

    const notification = new notificationModel({
      message: `${event.authorData?.name} Posted new event`,
      sendTo: [{ name: `${event.authorData?.name}` }],
      sentBy: { id: event.authorData?.id, name: event.authorData?.name },
    });
    await notification.save();

    const followers = await ServiceProviderRegModel.findById(
      event.authorData?.id
    );
    const followersArray = followers?.stats?.Followers;
    await UserModel.updateMany(
      { _id: { $in: followersArray } },
      { $addToSet: { notifications: notification._id } }
    );

    return res.status(200).json({ success: true, message: "Event approved" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve event",
      error: error,
    });
  }
};

export const ApproveService = async (req: Request, res: Response) => {
  const { id } = req.body;
  let session: mongoose.ClientSession | null = null;

  try {
    const service = await ServiceModel.findById(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }

    // Step 1: Do Telegram operations FIRST (before starting any database transaction)
    const channelName = service?.title;
    const channelDescription = `Channel for ${service?.title} by ${service?.authorData?.name}`;

    let channelId: number;

    try {
      console.log("Creating Telegram channel:");
      console.log("Bot added as admin to channel:");
    } catch (error) {
      console.error("Telegram operations failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to complete approval process",
        error: {
          code: 500,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Telegram operation failed",
        },
      });
    }

    // Step 2: Start database transaction ONLY after Telegram operations succeed
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update database within transaction
      service.approvalStatus = true;
      await service.save({ session });

      const notification = new notificationModel({
        message: `${service.authorData?.name} Posted new event`,
        sendTo: [{ name: `${service.authorData?.name}` }],
        sentBy: { id: service.authorData?.id, name: service.authorData?.name },
      });
      await notification.save({ session });

      const followers = await ServiceProviderRegModel.findById(
        service.authorData?.id
      ).session(session);

      const followersArray = followers?.stats?.Followers;

      if (followersArray && followersArray.length > 0) {
        await UserModel.updateMany(
          { _id: { $in: followersArray } },
          { $addToSet: { notifications: notification._id } },
          { session }
        );
      }

      // Commit the transaction
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message:
          "Service approved, Telegram channel created, and bot added as admin",
      });
    } catch (dbError) {
      console.error("Database operations failed:", dbError);

      // Abort transaction if database operations fail
      if (session) {
        await session.abortTransaction();
      }

      return res.status(500).json({
        success: false,
        message: "Failed to complete approval process",
        error: {
          code: 500,
          errorMessage:
            dbError instanceof Error
              ? dbError.message
              : "Database operation failed",
        },
      });
    }
  } catch (error) {
    console.error("Failed to start process:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve Service",
      error: {
        code: 500,
        errorMessage: error instanceof Error ? error.message : "Process failed",
      },
    });
  } finally {
    // Always end the session if it exists
    if (session) {
      await session.endSession();
    }
  }
};

export const rejectEvent = async (req: Request, res: Response) => {
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  if (!req.body.email) {
    return res.status(500).json({
      success: false,
      message: "no email provided",
    });
  }

  const { id, email, name, reason } = req.body;

  try {
    await EventModel.findByIdAndDelete(id);

    await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      { $inc: { "stats.contentStats.events": -1 } },
      { new: true }
    );

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Event: ${name} Rejected,`,
      html: `<p>We noticed a discrepancy during posting the event. Kindly review your information and ensure all details are accurate. Feel free to rectify and repost the event.</p> <br /> <p> ${reason} </p> <br /> <br /> Best regards,    <br /> <br /> Trade Box Fintech Solutions `,
    };

    await mailQueue.add(
      email,
      { mailOptions },
      { removeOnComplete: true, removeOnFail: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Event disapproved" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const rejectService = async (req: Request, res: Response) => {
  const { id, email, name, reason } = req.body;
  if (!req.body.id) {
    return res.status(500).json({
      success: false,
      message: "no id provided",
    });
  }

  if (!req.body.email) {
    return res.status(500).json({
      success: false,
      message: "no email provided",
    });
  }

  try {
    await ServiceModel.findByIdAndDelete(id);

    await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      { $inc: { "stats.contentStats.services": -1 } },
      { new: true }
    );

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Service: ${name} Rejected,`,
      html: `<p>We noticed a discrepancy during posting the event. Kindly review your information and ensure all details are accurate. Feel free to rectify and repost the event.</p> <br /> <p> ${reason} </p> <br /> <br /> Best regards,    <br /> <br /> Trade Box Fintech Solutions `,
    };

    await mailQueue.add(
      email,
      { mailOptions },
      { removeOnComplete: true, removeOnFail: true }
    );

    return res
      .status(200)
      .json({ success: true, message: "Service disapproved" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed",
      error: error,
    });
  }
};

export const fetchAllScoreCard = async (req: Request, res: Response) => {
  try {
    const scorecards = await ScoreCardModel.find({});

    if (!scorecards || scorecards.length === 0) {
      return res.status(404).json({ message: "No scorecards found" });
    }

    return res.status(200).json({ success: true, data: scorecards });
  } catch (error) {
    console.error("Error fetching scorecards: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error });
  }
};

export const approveSubscription = async (req: Request, res: Response) => {
  const { purchaseId } = req.body;

  try {
    // Step 1: Find the TradeboxPlanModel using purchaseId
    const tradeboxPlan = await TradeboxPlansModel.findOne({ _id: purchaseId });

    if (!tradeboxPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // Step 2: Update TradeboxPlanModel status to active
    await TradeboxPlansModel.updateOne(
      { _id: purchaseId },
      { $set: { status: "active" } }
    );

    const serviceproviderId = tradeboxPlan?.orderdBy?.id;
    // Step 3: Find ServiceProviderRegModel using orderedBy.id
    const serviceProvider = await ServiceProviderRegModel.findOne({
      _id: serviceproviderId,
    });

    if (!serviceProvider) {
      return res.status(404).json({ message: "Service provider not found" });
    }

    // Step 4: Update the subscriptions status inside ServiceProviderRegModel
    await ServiceProviderRegModel.updateOne(
      { _id: serviceproviderId },
      { $set: { "subscriptionDetails.status": "active" } }
    );

    return res.status(200).json({ message: "Payment approved successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const activateSubscriptionFromAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const {
      id,
      plan,
      validity,
      freshOnboardingCharge,
      renewalCharge,
      customerLimit,
      oneTimesetupFee,
      percentageFreshOnboarding,
      percentageRenewal,
      fixedFreshOnboardingCharge,
      fixedRenewalCharge,
      fixedCommercialFee,
      pricingType,
      services,
    } = req.body;

    if (!id) return res.status(400).json({ message: "Service ID is required" });

    // Validate validity (subscription duration in months: 1-12)
    const validityMonths = Number(validity);
    if (!Number.isFinite(validityMonths) || validityMonths < 1 || validityMonths > 12) {
      return res.status(400).json({
        success: false,
        message: "Validity must be between 1 and 12 months",
      });
    }

    // Validate services parameter if present
    if (
      services !== undefined &&
      (typeof services !== "object" || services === null)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'services' parameter. Must be an object.",
      });
    }

    const serviceProvider = await ServiceProviderRegModel.findById(id);
    if (!serviceProvider) {
      return res.status(404).json({ message: "Service provider not found" });
    }

    // Validate input based on plan type
    if (plan === "Prepaid") {
      if (
        freshOnboardingCharge === undefined ||
        freshOnboardingCharge === null ||
        renewalCharge === undefined ||
        renewalCharge === null ||
        customerLimit === undefined ||
        customerLimit === null
      ) {
        return res
          .status(400)
          .json({ message: "Missing required fields for Prepaid plan" });
      }
    } else {
      // Postpaid validation
      if (oneTimesetupFee === undefined || oneTimesetupFee === null) {
        return res
          .status(400)
          .json({ message: "Setup fee is required for Postpaid plan" });
      }

      // Check if at least one pricing type exists (including 0)
      const hasPercentagePricing =
        percentageFreshOnboarding !== undefined ||
        percentageRenewal !== undefined;
      const hasFixedPricing =
        fixedFreshOnboardingCharge !== undefined ||
        fixedRenewalCharge !== undefined;

      if (!hasPercentagePricing && !hasFixedPricing) {
        return res
          .status(400)
          .json({ message: "Either percentage or fixed pricing is required" });
      }

      const isPriceTypePercentage =
        percentageFreshOnboarding || percentageRenewal;
      const isPriceTypeFixed = fixedFreshOnboardingCharge || fixedRenewalCharge;

      if (!isPriceTypePercentage && !isPriceTypeFixed) {
        return res
          .status(400)
          .json({ message: "Either percentage or fixed pricing is required" });
      }
    }

    // Update service flags if provided
    if (services && typeof services === "object") {
      if (!serviceProvider.services) {
        (serviceProvider as any).services = {
          recommendations: false,
          paymentGateway: false,
          onboarding: false,
          content: false,
          modelPortfolio: false,
          recurringPayment: false,
          integration: "razorpay",
        };
      }
      for (const [key, value] of Object.entries(services)) {
        if (key in serviceProvider.services) {
          (serviceProvider.services as any)[key] = value;
        }
      }
    }

    // Calculate subscription end date (validity is in months)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + validityMonths);

    let initialFee = 0;
    if (plan === "Postpaid") {
      initialFee = Number(oneTimesetupFee) || 0;
    } else if (plan === "Prepaid") {
      // For Prepaid plans: fresh onboarding charge × customer limit
      initialFee =
        (Number(freshOnboardingCharge) || 0) * (Number(customerLimit) || 1);
    }

    // Calculate GST
    const gst = initialFee * 0.18; // 18% GST
    const totalCharge = initialFee + gst;

    // Check if wallet balance is sufficient
    const walletBalance = serviceProvider.wallet.amount || 0;
    if (totalCharge > 0 && walletBalance < totalCharge) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance.",
        description:
          "Provider does not have sufficient amount for this purchase",
      });
    }

    // Deduct the amount from wallet if there's a charge
    if (totalCharge > 0) {
      serviceProvider.wallet.amount -= totalCharge;
    }

    let order = new TradeboxPlansModel({
      orderdBy: {
        name: serviceProvider.RegName,
        id: serviceProvider._id,
        email: serviceProvider.email,
      },
      plan,
      duration: validityMonths,
      startDate,
      endDate,
      status: "active",
      amount: initialFee,
      gst: gst,
      total: totalCharge,

      // Prepaid specific fields
      freshOnboardingCharge:
        plan === "Prepaid" ? Number(freshOnboardingCharge) : undefined,
      renewalCharge: plan === "Prepaid" ? Number(renewalCharge) : undefined,
      customerLimit: plan === "Prepaid" ? Number(customerLimit) : undefined,

      // Postpaid specific fields
      oneTimesetupFee:
        plan === "Postpaid" ? Number(oneTimesetupFee) : undefined,
      pricingType:
        pricingType || (percentageFreshOnboarding || percentageRenewal ? "Percentage" : "Fixed"),

      // Percentage pricing
      percentageFreshOnboarding: Number(percentageFreshOnboarding) || undefined,
      percentageRenewal: Number(percentageRenewal) || undefined,

      // Fixed pricing
      fixedFreshOnboardingCharge:
        Number(fixedFreshOnboardingCharge) || undefined,
      fixedRenewalCharge: Number(fixedRenewalCharge) || undefined,

      // Fixed commercial fee (common for both pricing types)
      fixedCommercialFee: Number(fixedCommercialFee) || undefined,

      billingCycle:
        plan === "Postpaid"
          ? {
              lastBillingDate: startDate,
              nextBillingDate: endDate,
            }
          : undefined,
    });

    await order.save();

    let WalletOrder = new WalletTransactionModel({
      orderdBy: {
        name: "NA",
        id: "NA",
        email: "NA",
      },
      serviceProviderId: serviceProvider._id,
      paymentId: "NA",
      orderId: "NA",
      amount: totalCharge,
      type: "subscription-charge",
    });

    await WalletOrder.save();

    serviceProvider.subscriptionDetails = {
      subscriptionActive: true,
      currentSubscription: order._id,
    };

    // Save changes to database
    await serviceProvider.save();

    await new notificationModel({
      message: `${order.plan} has been added to Research Analyst ${order.orderdBy?.name}`,
      sendTo: [{ id: "admin", name: "Tradebox Admin" }],
      sentBy: { id: "admin", name: "admin" },
      type: "membership",
    }).save();

    await new notificationModel({
      message: `Your ${order.plan} membership is now active!`,
      sendTo: [{ id: order.orderdBy?.id, name: order.orderdBy?.name }],
      sentBy: { id: "admin", name: "admin" },
      type: "membership",
    }).save();

    if (initialFee > 0) {
      await InvoiceQueueTradeboxPlans.add(
        order._id.toString(),
        {
          orderId: order._id,
          buyerId: order.orderdBy?.id,
          tradeBoxPlanName: plan,
          serviceId: "NA",
          RegName: serviceProvider.RegName,
          issueDate: order.createdAt,
          price: initialFee,
          gst: gst,
          total: totalCharge,
          paymentID: "NA",
          userType: "sp",
          validity: `${validityMonths} month${validityMonths > 1 ? "s" : ""}`,
          endDate: endDate,
          gstNum: serviceProvider.gst,
          regNum: serviceProvider.regNumber,
        },
        { removeOnComplete: true, removeOnFail: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      subscriptionDetails: serviceProvider.subscriptionDetails,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};




export const updateMembership = async (req: Request, res: Response) => {
  const {
    id,
    plan,
    validity,
    freshOnboardingCharge,
    renewalCharge,
    customerLimit,
    percentageFreshOnboarding,
    percentageRenewal,
    fixedFreshOnboardingCharge,
    fixedRenewalCharge,
    fixedCommercialFee,
    services,
    modelPortfolios,
    pricingType // <-- add this
  } = req.body;

  try {
    // Validate validity (subscription duration in months: 1-12)
    const validityMonths = Number(validity);
    if (!Number.isFinite(validityMonths) || validityMonths < 1 || validityMonths > 12) {
      return res.status(400).json({
        success: false,
        message: "Validity must be between 1 and 12 months",
      });
    }

    const provider = await ServiceProviderRegModel.findById(id);
    if (!provider) {
      return res.status(404).json({ message: "Service provider not found" });
    }

    const currentPlanId = provider?.subscriptionDetails?.currentSubscription;
    if (!currentPlanId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    const existingPlan = await TradeboxPlansModel.findById(currentPlanId);
    if (!existingPlan) {
      return res
        .status(404)
        .json({ message: "Current subscription plan not found" });
    }

    // Update subscription plan details (validity is in months)
    existingPlan.plan = plan || existingPlan.plan;
    existingPlan.duration = validityMonths;
    existingPlan.endDate = new Date(
      new Date().setMonth(new Date().getMonth() + validityMonths)
    );
    existingPlan.status = "active";

    existingPlan.pricingType = pricingType || existingPlan.pricingType;
    
    if (plan === "Prepaid") {
      existingPlan.freshOnboardingCharge = freshOnboardingCharge;
      existingPlan.renewalCharge = renewalCharge;
      existingPlan.customerLimit = customerLimit;
      existingPlan.fixedCommercialFee = fixedCommercialFee;
      
    } else {
      existingPlan.percentageFreshOnboarding = percentageFreshOnboarding;
      existingPlan.percentageRenewal = percentageRenewal;
      existingPlan.fixedFreshOnboardingCharge = fixedFreshOnboardingCharge;
      existingPlan.fixedRenewalCharge = fixedRenewalCharge;
      existingPlan.fixedCommercialFee = fixedCommercialFee;
     
    }

    await existingPlan.save();
            
    // ✅ Update services
    if (services && typeof services === "object") {
      if (!provider.services) {
        (provider as any).services = {
          recommendations: false,
          paymentGateway: false,
          onboarding: false,
          content: false,
          modelPortfolio: false,
          recurringPayment: false,
          integration: "razorpay",
        };
      }

      for (const [key, value] of Object.entries(services)) {
        if (key in provider.services) {
          (provider.services as any)[key] = value;
        }
      }
    }

    // ✅ Update modelPortfolios
    if (modelPortfolios && Array.isArray(modelPortfolios)) {
      provider.modelPortfolios = {
        limits: modelPortfolios[0]?.limits || 1,
        Portfolios: modelPortfolios[0]?.Portfolios || [],
      };
    }

    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      currentSubscription: existingPlan,
      provider, // return updated provider too
    });
  } catch (error) {
    console.error("Error updating membership:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




export const deactivateSubscriptionFromAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.body || !req.body.id) {
      return res.status(400).json({ message: "Service ID is required" });
    }

    const { id, reason } = req.body;

    const serviceProvider = await ServiceProviderRegModel.findById(id);
    if (!serviceProvider) {
      return res.status(404).json({ message: "Service provider not found" });
    }

    const currentSubscriptionId =
      serviceProvider.subscriptionDetails?.currentSubscription;

    if (!currentSubscriptionId) {
      return res
        .status(400)
        .json({ message: "No active subscription to deactivate" });
    }

    // Find current subscription plan
    const currentPlan = await TradeboxPlansModel.findById(currentSubscriptionId);
    if (!currentPlan) {
      return res
        .status(404)
        .json({ message: "Current subscription plan not found" });
    }

    // Mark subscription as inactive
    currentPlan.status = "inactive";
    await currentPlan.save();

    // Turn off all activated services for this provider (keep `integration`)
    if (serviceProvider.services) {
      serviceProvider.services.recommendations = false;
      serviceProvider.services.paymentGateway = false;
      serviceProvider.services.onboarding = false;
      serviceProvider.services.content = false;
      serviceProvider.services.modelPortfolio = false;
      serviceProvider.services.recurringPayment = false;
    }

    if (serviceProvider.subscriptionDetails) {
  serviceProvider.subscriptionDetails.subscriptionActive = false;
  serviceProvider.subscriptionDetails.currentSubscription = undefined; // instead of null
  await serviceProvider.save();
} else {
  // If it doesn't exist, initialize it
  serviceProvider.subscriptionDetails = {
    subscriptionActive: false,
    currentSubscription: undefined,
  };
  await serviceProvider.save();
}

    // Create notifications
    await new notificationModel({
      message: `${currentPlan.plan} has been deactivated for Research Analyst ${serviceProvider.RegName}`,
      sendTo: [{ id: "admin", name: "Tradebox Admin" }],
      sentBy: { id: "admin", name: "admin" },
      type: "membership",
    }).save();

    await new notificationModel({
      message: `Your ${currentPlan.plan} membership has been deactivated.${
        reason ? ` Reason: ${reason}` : ""
      }`,
      sendTo: [{ id: serviceProvider._id, name: serviceProvider.RegName }],
      sentBy: { id: "admin", name: "admin" },
      type: "membership",
    }).save();

    return res.status(200).json({
      success: true,
      message: "Subscription deactivated successfully",
      subscriptionDetails: serviceProvider.subscriptionDetails,
    });
  } catch (error) {
    console.error("Error deactivating subscription:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};



// export const updateMembership = async (req: Request, res: Response) => {
//   const {
//     id,
//     plan,
//     validity,
//     freshOnboardingCharge,
//     renewalCharge,
//     customerLimit,
//     percentageFreshOnboarding,
//     percentageRenewal,
//     fixedFreshOnboardingCharge,
//     fixedRenewalCharge,
//     fixedCommercialFee,
//     services,
//   } = req.body;

//   try {
//     // Step 1: Find the provider
//     const provider = await ServiceProviderRegModel.findById(id);
//     if (!provider) {
//       return res.status(404).json({ message: "Service provider not found" });
//     }

//     const currentPlanId = provider?.subscriptionDetails?.currentSubscription;

//     if (!currentPlanId) {
//       return res.status(400).json({ message: "No active subscription found" });
//     }

//     // Step 2: Find the current plan
//     const existingPlan = await TradeboxPlansModel.findById(currentPlanId);
//     if (!existingPlan) {
//       return res.status(404).json({ message: "Current subscription plan not found" });
//     }

//     // Step 3: Update fields
//     existingPlan.plan = plan || existingPlan.plan;
//     existingPlan.duration = validity || existingPlan.duration;
//     existingPlan.endDate = new Date(new Date().setMonth(new Date().getMonth() + (validity || existingPlan.duration)));
//     existingPlan.status = "active";

//     // Update plan-related charges
//     if (plan === "Prepaid") {
//       existingPlan.freshOnboardingCharge = freshOnboardingCharge;
//       existingPlan.renewalCharge = renewalCharge;
//       existingPlan.customerLimit = customerLimit;
//       existingPlan.pricingType = "Fixed";
//       // Reset percentage-based fields for Prepaid
//       existingPlan.percentageFreshOnboarding = undefined;
//       existingPlan.percentageRenewal = undefined;
//       existingPlan.fixedCommercialFee = undefined;
//     } else {
//       // For Postpaid plans
//       existingPlan.percentageFreshOnboarding = percentageFreshOnboarding;
//       existingPlan.percentageRenewal = percentageRenewal;
//       existingPlan.fixedFreshOnboardingCharge = fixedFreshOnboardingCharge;
//       existingPlan.fixedRenewalCharge = fixedRenewalCharge;
//       existingPlan.fixedCommercialFee = fixedCommercialFee; // Add this line
//       existingPlan.pricingType = percentageFreshOnboarding ? "Percentage" : "Fixed";
//       // Reset Prepaid-specific fields
//       existingPlan.freshOnboardingCharge = undefined;
//       existingPlan.renewalCharge = undefined;
//     }

//     await existingPlan.save();

//     // Step 4: Update provider services if needed
//     if (services) {
//       provider.services = { ...provider.services, ...services };
//       await provider.save();
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Subscription plan updated successfully",
//       currentSubscription: existingPlan,
//     });
//   } catch (error) {
//     console.error("Error updating membership:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };


export const rechargeWalletManually = async (req: Request, res: Response) => {
  try {
    const { providerId, amount, transactionId } = req.body;

    if (!providerId || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: providerId, amount, or transactionId",
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    if (parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid recharge amount",
      });
    }

    const existingTx = await WalletTransactionModel.findOne({
      paymentId: transactionId,
    });
    if (existingTx) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID already used",
      });
    }

    const serviceProvider = await ServiceProviderRegModel.findById(providerId);
    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service Provider not found",
      });
    }

    const walletTransaction = new WalletTransactionModel({
      serviceProviderId: providerId,
      orderdBy: {
        name: "NA",
        id: "NA",
        email: "NA",
      },
      paymentId: transactionId,
      orderId: transactionId,
      amount: Number(amount),
      type: "manual-topup",
    });

    await walletTransaction.save();

    if (!serviceProvider.wallet) {
      serviceProvider.wallet = {
        amount: 0,
        transactions: [],
      };
    }

    serviceProvider.wallet.amount += parsedAmount;
    serviceProvider.wallet.transactions.push(walletTransaction._id);

    await serviceProvider.save();

    await notifyWalletChange({
      spId: String(serviceProvider._id),
      spName: serviceProvider.RegName,
      amount: parsedAmount,
      direction: "credit",
      reason: "manual top-up by admin",
      newBalance: serviceProvider.wallet.amount,
    });

    return res.status(200).json({
      success: true,
      message: `Wallet recharged. New balance: ${serviceProvider.wallet.amount}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to manually recharge wallet",
      error,
    });
  }
};

export const deductWalletManually = async (req: Request, res: Response) => {
  try {
    const { providerId, amount, remarks } = req.body;

    if (!providerId || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: providerId and amount",
      });
    }

    const serviceProvider = await ServiceProviderRegModel.findById(providerId);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    if (serviceProvider.wallet.amount < amount) {
      return res.status(400).json({
        success: false,
        message: "Wallet does not have enough balance",
      });
    }

    // Create a new wallet transaction
    const walletTransaction = new WalletTransactionModel({
      serviceProviderId: providerId,
      orderdBy: {
        name: "NA",
        id: "NA",
        email: "NA",
      },
      paymentId: "NA",
      orderId: "NA",
      amount: amount,
      type: "deduction",
      remarks: remarks || "",
    });

    await walletTransaction.save();

    serviceProvider.wallet.amount -= amount;
    serviceProvider.wallet.transactions.push(walletTransaction._id);

    await serviceProvider.save();

    await notifyWalletChange({
      spId: String(serviceProvider._id),
      spName: serviceProvider.RegName,
      amount,
      direction: "debit",
      reason: remarks ? `manual deduction by admin (${remarks})` : "manual deduction by admin",
      newBalance: serviceProvider.wallet.amount,
    });

    return res.status(200).json({
      success: true,
      message: "Money deducted successfully",
    });
  } catch (error) {
    console.error("Error in deductWalletManually:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: (error as Error).message,
    });
  }
};

export const enableSPServices = async (req: Request, res: Response) => {
  const { id, services } = req.body;

  if (!id || typeof services !== "object") {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid parameters",
    });
  }

  try {
    await ServiceProviderRegModel.findByIdAndUpdate(id, {
      $set: Object.fromEntries(
        Object.entries(services).map(([key, val]) => [`services.${key}`, val])
      ),
    });

    return res.status(200).json({
      success: true,
      message: "Services updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error updating services",
      error: err,
    });
  }
};

export const setLmsCommercial = async (req: Request, res: Response) => {
  try {
    const { providerId, enabled, commissionPercentage } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }

    if (enabled && (commissionPercentage < 0 || commissionPercentage > 100)) {
      return res.status(400).json({
        message: "Commission percentage must be between 0 and 100",
      });
    }

    const provider = await ServiceProviderRegModel.findById(providerId);

    if (!provider) {
      return res.status(404).json({ message: "Service provider not found" });
    }

    provider.lmsCommercial = {
      enabled: Boolean(enabled),
      commissionPercentage: enabled ? Number(commissionPercentage) : 0,
      updatedAt: new Date(),
    };

    await provider.save();

    return res.status(200).json({
      success: true,
      message: "LMS commercial settings updated",
      lmsCommercial: provider.lmsCommercial,
    });
  } catch (error) {
    console.error("LMS commercial update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update LMS commercial",
    });
  }
};

export const createSubAdminController = async (req: Request, res: Response) => {
  try {
    const { name, email, number, permissions } = req.body;

    if (!name || !email || !number) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const existingEmail = await AdminModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const existingNumber = await AdminModel.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({
        message: "Phone number already exists",
      });
    }

    const existingName = await AdminModel.findOne({ name });
    if (existingName) {
      return res.status(400).json({
        message: "Name already exists",
      });
    }

    const subAdmin = await AdminModel.create({
      name,
      email,
      number,
      role: "sub_admin",
      permissions,
      createdBy: req.user.id,
    });

     const mailOptions = {
       from: process.env.EMAIL,
       to: email,
       subject: "You're invited as Sub Admin - TradeBox",
       html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to TradeBox 🎉</h2>

        <p>Hello <b>${name}</b>,</p>

        <p>
          You have been invited as a <b>Sub Admin</b> on TradeBox.
        </p>

        <h4>Login Credentials</h4>
        <p>Email: <b>${email}</b></p>
        <p>Number: <b>${number}</b></p>


        <div style="margin:20px 0;">
          <a href="https://tradeboxlive.com/auth/admin/signin"
             style="background:#28a745;color:#fff;
             padding:10px 20px;
             border-radius:6px;
             text-decoration:none;">
             Login Now
          </a>
        </div>

        <hr />

        <p style="font-size:13px;color:#777;">
          If you did not request this, ignore this mail.
        </p>

        <p>Thanks,<br/>TradeBox Team</p>
      </div>
      `,
     };

     await mailQueue.add(email, { mailOptions });


    return res.status(201).json({
      message: "Sub admin created",
      subAdmin
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getAllSubAdminsController = async (req: Request, res: Response) => {
  try {
    const subAdmins = await AdminModel.find({
      role: "sub_admin",
    })
      .sort({ createdAt: -1 });

    return res.json({
      data: subAdmins,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getSubAdminById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await AdminModel.findById(id).select("-password");

    if (!admin) {
      return res.status(404).json({
        message: "Sub admin not found",
      });
    }

    return res.json({ data: admin });
  } catch {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateSubAdminController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, number, permissions, isActive } = req.body;

    const admin = await AdminModel.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Sub admin not found",
      });
    }

    /* duplicate number check */
    if (number) {
      const exist = await AdminModel.findOne({
        number,
        _id: { $ne: id },
      });

      if (exist) {
        return res.status(400).json({
          message: "Number already used",
        });
      }
    }

    admin.name = name ?? admin.name;
    admin.number = number ?? admin.number;
    admin.permissions = permissions ?? admin.permissions;
    admin.isActive = isActive ?? admin.isActive;

    await admin.save();

    return res.json({
      message: "Sub admin updated",
      data: admin,
    });
  } catch {
    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const deleteSubAdminController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await AdminModel.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Sub admin not found",
      });
    }

    if (admin.role !== "sub_admin") {
      return res.status(400).json({
        message: "Only sub admins can be deleted",
      });
    }

    await AdminModel.findByIdAndDelete(id);

    return res.json({
      message: "Sub admin deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const slugify = (value: string): string => {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
};
const createMarketplaceBodySchema = z.object({
  name: z
    .string({
      required_error: "Marketplace name is required",
      invalid_type_error: "Marketplace name must be a string",
    })
    .trim()
    .min(3, "Marketplace name must be at least 3 characters long")
    .max(120, "Marketplace name cannot exceed 120 characters"),
  description: z
    .string({
      invalid_type_error: "Description must be a string",
    })
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  invitedRaIds: z
    .array(
      z
        .string({
          required_error: "RA id is required",
          invalid_type_error: "RA id must be a string",
        })
        .trim()
        .min(1, "RA id cannot be empty"),
    )
    .optional(),
});

const generateUniqueSlug = async (name: string): Promise<string> => {
	const baseSlug = slugify(name) || `marketplace-${shortid.generate()}`;
	let uniqueSlug = baseSlug;
	let suffix = 1;

	while (await MarketplaceModel.exists({ slug: uniqueSlug })) {
		uniqueSlug = `${baseSlug}-${suffix}`;
		suffix += 1;
	}

	return uniqueSlug;
};

export const createMarketplaceController = async (
  req: Request,
  res: Response,
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - User context missing",
    });
  }

  const actor = req.user as { role?: string; _id?: string; id?: string };

  if ((actor.role || "") !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only admin can create marketplaces",
    });
  }

  const parsedBody = createMarketplaceBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid input",
      errors: parsedBody.error.flatten(),
    });
  }

  const { name, description } = parsedBody.data;

  try {
    const brokerId = actor._id || actor.id;
    const invitedRaIdsRaw = (parsedBody.data.invitedRaIds ?? []).map((id) =>
      id.trim(),
    );
    const invalidIds = invitedRaIdsRaw.filter(
      (id) => !Types.ObjectId.isValid(id),
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid RA id format",
        invalidIds,
      });
    }
    const invitedRaIds = Array.from(
      new Set(invitedRaIdsRaw.filter((id) => id.length > 0)),
    );

    const broker = await AdminModel.findById(brokerId);

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker profile not found",
      });
    }

    const existingMarketplace = await MarketplaceModel.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    const brokerIdString = broker._id.toString();

    if (
      invitedRaIds.length > 0 &&
      invitedRaIds.some((id) => id === brokerIdString)
    ) {
      return res.status(400).json({
        success: false,
        message: "Broker cannot invite themselves",
      });
    }

    if (existingMarketplace) {
      return res.status(409).json({
        success: false,
        message: "Marketplace with this name already exists",
      });
    }

    let invitations: Array<{ raId: Types.ObjectId }> = [];

    if (invitedRaIds.length > 0) {
      const raProfiles = await ServiceProviderRegModel.find({
        _id: { $in: invitedRaIds },
      }).select("_id email name profileUrl");

      const foundRaIds = new Set(raProfiles.map((ra) => ra._id.toString()));
      const missingRaIds = invitedRaIds.filter((id) => !foundRaIds.has(id));

      if (missingRaIds.length > 0) {
        return res.status(404).json({
          success: false,
          message: "Some RA profiles were not found",
          missingRaIds,
        });
      }

      invitations = raProfiles.map((ra) => ({
        raId: ra._id,
      }));
    }

    const slug = await generateUniqueSlug(name);

    const marketplace = await MarketplaceModel.create({
      name,
      description,
      slug, 
      createdByBrokerId: broker._id,
      brokerSnapshot: {
        name: broker.name,
        email: broker.email,
        profileUrl: broker.profileUrl,
      },
      invitations,
    });

    return res.status(201).json({
      success: true,
      message: "Marketplace created successfully",
      data: marketplace,
    });
  } catch (error) {
    console.error("Failed to create marketplace:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create marketplace",
    });
  }
};


export const getAllMarketplacesForAdminController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    const adminId = req.user._id;

    // Pagination params - matching the format
    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit as string, 10) || 10)
    );
    const skip = (page - 1) * limit;

    // Search params
    const searchQuery = ((req.query.search as string) || "").trim();

    // Build query
    const query: any = {
      status: "active",
      createdByBrokerId: new Types.ObjectId(adminId),
    };

    // Add search filters
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { "brokerSnapshot.name": { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Get total count
    const totalCount = await MarketplaceModel.countDocuments(query);

    // Fetch marketplaces
    const marketplaces = await MarketplaceModel.find(query)
      .select(
        "name description slug brokerSnapshot activeRaIds createdAt updatedAt createdByBrokerId"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response to match the first controller's format
    const formattedMarketplaces = marketplaces.map((marketplace: any) => {
      // For admin, we need to check membership differently
      const userId = adminId.toString();
      const isDirectMember = marketplace.activeRaIds?.some((id: any) => 
        id?.toString() === userId
      ) || false;

      return {
        id: marketplace._id,
        name: marketplace.name,
        description: marketplace.description,
        slug: marketplace.slug,
        broker: {
          name: marketplace.brokerSnapshot?.name || "Unknown Broker",
          email: marketplace.brokerSnapshot?.email,
          profileUrl: marketplace.brokerSnapshot?.profileUrl,
        },
        activeRAsCount: (marketplace.activeRaIds || []).length,
        createdAt: marketplace.createdAt,
        updatedAt: marketplace.updatedAt,
        createdByBrokerId: marketplace.createdByBrokerId,
        // Membership info - admin specific
        isMember: isDirectMember, // Admin can also be a member
        membershipType: isDirectMember ? "direct" : "none",
        userType: "admin", // Added userType field
      };
    });

    // Pagination metadata - matching format
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      data: formattedMarketplaces,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Admin marketplace fetch failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplaces",
    });
  }
};




// Delete a marketplace (broker only)
export const deleteMarketplaceControlleradmin = async (
  req: Request,
  res: Response,
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - User context missing",
    });
  }

  const actor = req.user as { 
    category?: string;
    role?: string; 
    _id?: string; 
    id?: string;
  };
  const brokerId = actor._id || actor.id;
  const userrole = actor.role || "";

  if (userrole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only brokers can delete marketplaces",
    });
  }

  const { id } = req.params;

  // Validate marketplace ID
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid marketplace ID",
    });
  }

  try {
    const marketplace = await MarketplaceModel.findById(id);

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: "Marketplace not found",
      });
    }

    // Check if the broker is the creator of this marketplace
    if (marketplace.createdByBrokerId.toString() !== brokerId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete marketplaces you created",
      });
    }

    // Hard delete the marketplace
    await MarketplaceModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Marketplace deleted successfully",
      data: {
        marketplaceId: marketplace._id,
        marketplaceName: marketplace.name,
      },
    });
  } catch (error) {
    console.error("Failed to delete marketplace:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete marketplace",
    });
  }
};


//   req: Request,
//   res: Response,
// ) => {
//   const { marketplaceId } = req.params;
//   const typeParam = req.query.type as string | undefined;

//   // Validate marketplace ID
//   if (!Types.ObjectId.isValid(marketplaceId)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid marketplace ID",
//     });
//   }

//   // Pagination params
//   const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
//   const limit = Math.min(
//     100,
//     Math.max(1, Number.parseInt(req.query.limit as string, 10) || 10),
//   );
//   const skip = (page - 1) * limit;

//   try {
//     // If no type parameter, return marketplace details (original behavior)
//     if (!typeParam) {
//       const marketplace = await MarketplaceModel.findById(marketplaceId)
//         .populate({
//           path: "activeRaIds",
//           select: "name email RegName companyName profileUrl _id type addedby",
//         })
//         .populate({
//           path: "invitations.raId",
//           select: "name email RegName companyName profileUrl _id",
//         })
//         .lean();

//       if (!marketplace) {
//         return res.status(404).json({
//           success: false,
//           message: "Marketplace not found",
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         data: marketplace,
//       });
//     }

//     // Validate type parameter
//     const typeValidation = marketplaceTypeSchema.safeParse(typeParam);
//     if (!typeValidation.success) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid type parameter",
//         validTypes: [
//           "ra",
//           "recommendations",
//           "portfolio",
//           "services",
//           "articles",
//           "algo_strategies",
//           "lms",
//           "subscribers",
//           "events",
//         ],
//       });
//     }

//     const type = typeValidation.data;

//     // Fetch marketplace to get activeRaIds
//     const marketplace = await MarketplaceModel.findById(marketplaceId)
//       .select("activeRaIds name")
//       .lean();

//     if (!marketplace) {
//       return res.status(404).json({
//         success: false,
//         message: "Marketplace not found",
//       });
//     }

//     // Convert activeRaIds to string array for filtering
//     const activeRaIds = (marketplace as any).activeRaIds || [];
//     const activeRaIdStrings = activeRaIds.map((id: Types.ObjectId) =>
//       id.toString(),
//     );

//     // Handle different types
//     switch (type) {
//       case "ra": {
//         // Fetch active RAs details with pagination
//         const totalCount = activeRaIdStrings.length;
//         const paginatedRaIds = activeRaIdStrings.slice(skip, skip + limit);

//         const activeRAs = await ServiceProviderRegModel.find({
//           _id: { $in: paginatedRaIds },
//         })
//           .select(
//             "name email RegName companyName profileUrl companyLogo regNumber type category city state website description AboutMe verified approved stats socials addedby _id createdAt",
//           )
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);

//         return res.status(200).json({
//           success: true,
//           data: activeRAs,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }
        
      
//       case "recommendations": {
//         // Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
//         const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
        
//         const baseQuery: any = {
//           "authorData.id": { $in: allAuthorIds },
//           shareWithMarketplaces: new Types.ObjectId(marketplaceId),
//         };

//         const totalCount = await ScoreCardModel.countDocuments(baseQuery);
//         const recommendations = await ScoreCardModel.find(baseQuery)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);

//         return res.status(200).json({
//           success: true,
//           data: recommendations,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }

//       case "portfolio": {
//         // Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
//         const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
        
//         const baseQuery: any = {
//           "authorData.id": { $in: allAuthorIds },
//           shareWithMarketplaces: new Types.ObjectId(marketplaceId),
//         };

//         const totalCount = await Portfolio.countDocuments(baseQuery);
//         const portfolios = await Portfolio.find(baseQuery)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);
            

//         return res.status(200).json({
//           success: true,
//           data: portfolios,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }

//       case "services": {
//         // Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
//         const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
        
//         const baseQuery: any = {
//           "authorData.id": { $in: allAuthorIds },
//           shareWithMarketplaces: new Types.ObjectId(marketplaceId),
//           approvalStatus: true,
//         };

//         const totalCount = await ServiceModel.countDocuments(baseQuery);
//         const services = await ServiceModel.find(baseQuery)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);

//         return res.status(200).json({
//           success: true,
//           data: services,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }

//       case "articles": {
//         // Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
//         const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
        
//         const baseQuery: any = {
//           "authorData.id": { $in: allAuthorIds },
//           shareWithMarketplaces: new Types.ObjectId(marketplaceId),
//         };

//         const totalCount = await ArticleModel.countDocuments(baseQuery);
//         const articles = await ArticleModel.find(baseQuery)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);

//         return res.status(200).json({
//           success: true,
//           data: articles,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }

//       case "events": {
//         // Get all relevant RA IDs (including sub-profiles for Non-Individual RAs)
//         const allAuthorIds = await getAllRelevantRAIds(activeRaIdStrings);
        
//         const baseQuery: any = {
//           "authorData.id": { $in: allAuthorIds },
//           shareWithMarketplaces: new Types.ObjectId(marketplaceId),
//           approvalStatus: true,
//         };

//         const totalCount = await EventModel.countDocuments(baseQuery);
//         const events = await EventModel.find(baseQuery)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean();

//         const totalPages = Math.ceil(totalCount / limit);

//         return res.status(200).json({
//           success: true,
//           data: events,
//           pagination: {
//             currentPage: page,
//             totalPages,
//             totalCount,
//             limit,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1,
//           },
//         });
//       }

//       case "algo_strategies":
//       case "lms":
//       case "subscribers": {
//         return res.status(200).json({
//           success: true,
//           message: "Coming soon",
//         });
//       }

//       default: {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid type parameter",
//         });
//       }
//     }
//   } catch (error) {
//     console.error("Failed to fetch marketplace data:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch marketplace data",
//     });
//   }
// };

export const getProviderAnalyticsData = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: "No provider ID provided" });
  }

  try {
    const [services, scorecards, packages, events, articles] = await Promise.all([
      ServiceModel.find({ "authorData.id": id, activated: true })
        .select("title subscribedBy orders")
        .lean(),
      ScoreCardModel.find({ "authorData.id": id })
        .select("status result")
        .lean(),
      PackageModel.find({ "authorData.id": id, activated: true })
        .select("title stats pricingPlans")
        .lean(),
      EventModel.find({ "authorData.id": id })
        .select("title")
        .lean(),
      ArticleModel.find({ "authorData.id": id })
        .select("_id title")
        .lean(),
    ]);

    // Aggregate subscriber count across all services
    const totalServiceSubscribers = services.reduce(
      (sum, s) => sum + (s.subscribedBy?.length ?? 0),
      0
    );

    // Aggregate recommendation stats
    const openRecos = scorecards.filter((s) => s.status === "open").length;
    const closedRecos = scorecards.filter((s) => s.status === "closed").length;
    const totalRecos = scorecards.length;

    // Package purchase stats
    const totalPackagePurchases = packages.reduce(
      (sum, p) => sum + (p.stats?.purchases ?? 0),
      0
    );

    // Event registration stats via new model
    const eventIds = events.map((e) => e._id);
    const regCounts = await EventRegistrationModel.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const regCountMap = new Map(regCounts.map((r: any) => [r._id.toString(), r.count]));
    const totalEventRegistrations = regCounts.reduce((sum: number, r: any) => sum + r.count, 0);

    return res.status(200).json({
      success: true,
      services: {
        total: services.length,
        totalSubscribers: totalServiceSubscribers,
        list: services,
      },
      recommendations: {
        total: totalRecos,
        open: openRecos,
        closed: closedRecos,
      },
      packages: {
        total: packages.length,
        totalPurchases: totalPackagePurchases,
        list: packages,
      },
      events: {
        total: events.length,
        totalRegistrations: totalEventRegistrations,
        list: events.map((e) => ({
          _id: e._id,
          title: e.title,
          registrations: regCountMap.get(e._id.toString()) ?? 0,
        })),
      },
      articles: {
        total: articles.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch analytics data", error });
  }
};

export const getAdminContactLeads = async (req: Request, res: Response) => {
  try {
    const leads = await LeadModel.find({}).sort({ createdAt: -1 }).lean();

    // Collect unique user IDs, service IDs
    const userIds = [...new Set(leads.map((l) => l.userId))];
    const serviceIds = leads.filter((l) => l.type === "service").map((l) => l.serviceId);
    const portfolioIds = leads.filter((l) => l.type === "portfolio").map((l) => l.serviceId);

    // Fetch users, services, portfolios in parallel
    const [users, services, portfolios] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }, "name email number").lean(),
      ServiceModel.find({ _id: { $in: serviceIds } }, "title authorData").lean(),
      Portfolio.find({ _id: { $in: portfolioIds } }, "portfolioName authorData").lean(),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));
    const portfolioMap = new Map(portfolios.map((p) => [p._id.toString(), p]));

    const formatted = leads.map((l) => {
      const user = userMap.get(l.userId);
      let itemName = "";
      let providerName = "";
      let providerId = "";

      if (l.type === "service") {
        const s = serviceMap.get(l.serviceId);
        itemName = (s as any)?.title || "Deleted Service";
        providerName = (s as any)?.authorData?.name || "";
        providerId = (s as any)?.authorData?.id || "";
      } else if (l.type === "portfolio") {
        const p = portfolioMap.get(l.serviceId);
        itemName = (p as any)?.portfolioName || "Deleted Portfolio";
        providerName = (p as any)?.authorData?.name || "";
        providerId = (p as any)?.authorData?.id || "";
      }

      return {
        _id: l._id,
        type: l.type,
        status: l.status,
        serviceId: l.serviceId,
        serviceName: itemName,
        providerId,
        providerName,
        user: user
          ? { id: user._id, name: (user as any).name, email: (user as any).email, number: (user as any).number }
          : { id: l.userId, name: "Unknown User", email: "", number: "" },
        createdAt: l.createdAt,
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch leads", error });
  }
};

// POST /api/admin/notify-broadcast — admin-composed broadcast.
//
// Audience controls which collection(s) we look in:
//   - "all"        → every verified SP + every user
//   - "providers"  → verified SPs (all or specific ids via recipientIds)
//   - "customers"  → users         (all or specific ids via recipientIds)
//
// When recipientIds is provided we restrict to those ids within the
// audience's collection. "all" with recipientIds is not allowed because
// the caller should be explicit about which collection an id belongs to.
//
// Result: one notification doc whose sendTo list contains every recipient —
// keeps the All Notifications feed clean (one row per broadcast) rather
// than producing N rows.
export const broadcastAdminNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      audience,
      recipientIds,
      message,
      postLink,
      type,
    } = req.body as {
      audience?: "all" | "providers" | "customers";
      recipientIds?: string[];
      message?: string;
      postLink?: string;
      type?: string;
    };

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }
    if (!audience || !["all", "providers", "customers"].includes(audience)) {
      return res.status(400).json({
        success: false,
        message: "audience must be 'all', 'providers', or 'customers'",
      });
    }
    const ids = Array.isArray(recipientIds)
      ? recipientIds.filter((s) => typeof s === "string" && s.length > 0)
      : [];
    if (ids.length > 0 && audience === "all") {
      return res.status(400).json({
        success: false,
        message: "recipientIds requires audience 'providers' or 'customers'",
      });
    }

    // Resolve recipients per audience. Verified/active SPs only — unverified
    // ones shouldn't receive admin broadcasts. recipientIds, when present,
    // narrows the query to those specific documents inside the same
    // collection (and same verification gate for SPs).
    const [providers, users] = await Promise.all([
      audience !== "customers"
        ? ServiceProviderRegModel.find({
            verified: true,
            ...(ids.length > 0 && audience === "providers"
              ? { _id: { $in: ids } }
              : {}),
          })
            .select("_id RegName name")
            .lean()
        : Promise.resolve([] as any[]),
      audience !== "providers"
        ? UserModel.find({
            ...(ids.length > 0 && audience === "customers"
              ? { _id: { $in: ids } }
              : {}),
          })
            .select("_id name")
            .lean()
        : Promise.resolve([] as any[]),
    ]);

    const sendTo: { id: string; name: string }[] = [];
    for (const p of providers) {
      sendTo.push({
        id: String(p._id),
        name: (p as any).RegName || (p as any).name || "",
      });
    }
    for (const u of users) {
      sendTo.push({
        id: String(u._id),
        name: (u as any).name || "",
      });
    }

    if (sendTo.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No recipients found for audience" });
    }

    // Resolve sender from caller token — same decode trick used by
    // ImpersonationController, since outer middleware already verified it.
    const callerToken = req.headers.authorization?.split(" ")[1];
    const decoded = callerToken
      ? (jwt.decode(callerToken) as { id?: string } | null)
      : null;
    const adminId = decoded?.id || "admin";

    const noti = await new notificationModel({
      message: message.trim(),
      postLink: postLink?.trim() || undefined,
      sendTo,
      sentBy: { id: String(adminId), name: "Tradebox Admin" },
      type: type && type.trim() ? type.trim() : "broadcast",
    }).save();

    return res.status(200).json({
      success: true,
      message: `Notification sent to ${sendTo.length} recipient(s)`,
      recipientCount: sendTo.length,
      audience,
      notificationId: noti._id,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to broadcast notification", error });
  }
};

// DELETE /api/admin/contactleads/:id — hard-delete a lead from the admin
// table. Lead lifecycle in this codebase is short (auto-deleted on purchase
// in PaymentController), so admins occasionally need to prune stale rows.
export const deleteAdminContactLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Lead id is required" });
    }
    const deleted = await LeadModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }
    return res.status(200).json({ success: true, message: "Lead deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete lead", error });
  }
};

export const getProviderBillingData = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "No provider ID provided",
    });
  }

  try {
    const [walletTransactions, orders, razorpayKey] = await Promise.all([
      WalletTransactionModel.find({ serviceProviderId: id })
        .sort({ createdAt: -1 })
        .lean(),
      OrderModel.find({ "soldBy.id": id })
        .sort({ createdAt: -1 })
        .lean(),
      RazorpayKeyModel.findOne({ userId: id })
        .select("keyId name email createdAt")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      walletTransactions,
      orders,
      razorpayKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billing data",
      error,
    });
  }
};

export const getAllServicesForAdmin = async (req: Request, res: Response) => {
  try {
    const services = await ServiceModel.aggregate([
      {
        $addFields: {
          price: { $round: [{ $multiply: ["$price", 1] }, 2] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // Attach per-service leadsCount (LeadModel.serviceId) and totalSales
    // (sum of verified-order totals where subscribedToId = service._id).
    // Both aggregations are grouped + indexed by service id so the merge
    // back into the response is O(N).
    const serviceIds = services.map((s) => String(s._id));
    const [leadAgg, salesAgg] = await Promise.all([
      LeadModel.aggregate([
        { $match: { serviceId: { $in: serviceIds }, type: "service" } },
        { $group: { _id: "$serviceId", count: { $sum: 1 } } },
      ]),
      OrderModel.aggregate([
        {
          $match: {
            subscribedToId: { $in: serviceIds },
            type: "service",
            paymentStatus: "verified",
          },
        },
        { $group: { _id: "$subscribedToId", total: { $sum: "$total" } } },
      ]),
    ]);
    const leadsBy = new Map<string, number>(
      leadAgg.map((x: any) => [String(x._id), x.count])
    );
    const salesBy = new Map<string, number>(
      salesAgg.map((x: any) => [String(x._id), x.total])
    );

    const data = services.map((s) => ({
      ...s,
      leadsCount: leadsBy.get(String(s._id)) || 0,
      totalSales: salesBy.get(String(s._id)) || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Services fetched",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error,
    });
  }
};

export const getServiceDetailsForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const service = await ServiceModel.findById(id).lean();
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const subscriberIds: string[] = (service as any).subscribedBy ?? [];
    const trialUserIds: string[] = (service as any).trailAvailedBy ?? [];

    const [subscribers, trialUsers, orders, recommendationCount, recentRecommendations, leads, coupons, marketplaces] =
      await Promise.all([
        subscriberIds.length > 0
          ? UserModel.find({ _id: { $in: subscriberIds } })
              .select("name email phone createdAt")
              .lean()
          : Promise.resolve([]),

        trialUserIds.length > 0
          ? UserModel.find({ _id: { $in: trialUserIds } })
              .select("name email createdAt")
              .lean()
          : Promise.resolve([]),

        OrderModel.find({ subscribedToId: id })
          .sort({ createdAt: -1 })
          .lean(),

        ScoreCardModel.countDocuments({ shareWithPlans: id }),

        ScoreCardModel.find({ shareWithPlans: id })
          .sort({ createdAt: -1 })
          .limit(10)
          .select(
            "scriptname exchange entryType entryPrice target stoploss status result pnl pnlpercentage holdingPeriod createdAt"
          )
          .lean(),

        LeadModel.find({ serviceId: id }).lean(),

        CouponModel.find({ serviceIds: id })
          .select("code description discountType discount startDate expiryDate usageLimit usedCount perCustomerLimit couponType")
          .lean(),

        (service as any).shareWithMarketplaces?.length > 0
          ? MarketplaceModel.find({
              _id: { $in: (service as any).shareWithMarketplaces },
            })
              .select("name")
              .lean()
          : Promise.resolve([]),
      ]);

    const leadStatusCounts: Record<string, number> = {};
    leads.forEach((l: any) => {
      const st = l.status ?? "unknown";
      leadStatusCounts[st] = (leadStatusCounts[st] || 0) + 1;
    });

    const leadUserIds = [...new Set(leads.map((l: any) => l.userId).filter(Boolean))];
    const leadUsers = leadUserIds.length > 0
      ? await UserModel.find({ _id: { $in: leadUserIds } }).select("name phone").lean()
      : [];
    const leadUserMap: Record<string, { name: string; phone?: string }> = {};
    leadUsers.forEach((u: any) => {
      leadUserMap[u._id.toString()] = { name: u.name, phone: u.phone };
    });
    const enrichedLeads = leads
      .filter((l: any) => l.status !== "payment_success")
      .map((l: any) => ({
        ...l,
        userName: leadUserMap[l.userId]?.name ?? "Unknown",
        userPhone: leadUserMap[l.userId]?.phone ?? "",
      }));

    return res.status(200).json({
      success: true,
      service,
      subscribers,
      trialUsers,
      orders,
      recommendationCount,
      recentRecommendations,
      leads: { total: leads.length, byStatus: leadStatusCounts, list: enrichedLeads },
      coupons,
      marketplaces,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service details",
      error,
    });
  }
};

export const getAllPortfoliosForAdmin = async (req: Request, res: Response) => {
  try {
    const data = await Portfolio.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      message: "Portfolios fetched",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch portfolios",
      error,
    });
  }
};

export const getPortfolioDetailsForAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const portfolio = await Portfolio.findById(id).lean();
    if (!portfolio) {
      return res
        .status(404)
        .json({ success: false, message: "Portfolio not found" });
    }

    const subscriberIds: string[] = (portfolio as any).subscribedBy ?? [];

    const [
      subscribers,
      orders,
      leads,
      coupons,
      marketplaces,
      serviceProvider,
      dailyHistory,
    ] = await Promise.all([
      subscriberIds.length > 0
        ? UserModel.find({ _id: { $in: subscriberIds } })
            .select("name email phone createdAt")
            .lean()
        : Promise.resolve([]),

      OrderModel.find({ subscribedToId: id }).sort({ createdAt: -1 }).lean(),

      LeadModel.find({ serviceId: id }).lean(),

      CouponModel.find({ serviceIds: id })
        .select(
          "code description discountType discount startDate expiryDate usageLimit usedCount perCustomerLimit couponType"
        )
        .lean(),

      (portfolio as any).shareWithMarketplaces?.length > 0
        ? MarketplaceModel.find({
            _id: { $in: (portfolio as any).shareWithMarketplaces },
          })
            .select("name")
            .lean()
        : Promise.resolve([]),

      ServiceProviderRegModel.findById((portfolio as any).authorData?.id)
        .select(
          "name number email profileUrl address1 address2 city state regNumber description disclaimer"
        )
        .lean(),

      PortfolioHistory.find({ portfolioId: id }).sort({ date: 1 }).lean(),
    ]);

    const leadStatusCounts: Record<string, number> = {};
    leads.forEach((l: any) => {
      const st = l.status ?? "unknown";
      leadStatusCounts[st] = (leadStatusCounts[st] || 0) + 1;
    });

    const leadUserIds = [
      ...new Set(leads.map((l: any) => l.userId).filter(Boolean)),
    ];
    const leadUsers =
      leadUserIds.length > 0
        ? await UserModel.find({ _id: { $in: leadUserIds } })
            .select("name phone")
            .lean()
        : [];
    const leadUserMap: Record<string, { name: string; phone?: string }> = {};
    leadUsers.forEach((u: any) => {
      leadUserMap[u._id.toString()] = { name: u.name, phone: u.phone };
    });
    const enrichedLeads = leads
      .filter((l: any) => l.status !== "payment_success")
      .map((l: any) => ({
        ...l,
        userName: leadUserMap[l.userId]?.name ?? "Unknown",
        userPhone: leadUserMap[l.userId]?.phone ?? "",
      }));

    return res.status(200).json({
      success: true,
      portfolio,
      subscribers,
      orders,
      leads: {
        total: leads.length,
        byStatus: leadStatusCounts,
        list: enrichedLeads,
      },
      coupons,
      marketplaces,
      serviceProvider,
      dailyHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio details",
      error,
    });
  }
};

export const getAllPackagesForAdmin = async (req: Request, res: Response) => {
  try {
    const data = await PackageModel.find({})
      .populate("includedServices", "title")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, message: "Packages fetched", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch packages", error });
  }
};

export const getPackageDetailsForAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const pkg = await PackageModel.findById(id)
      .populate(
        "includedServices",
        "title segment serviceType subscribedBy price bannerURL"
      )
      .lean();
    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    const [orders, coupons, marketplaces, serviceProvider] =
      await Promise.all([
        OrderModel.find({ subscribedToId: id }).sort({ createdAt: -1 }).lean(),

        CouponModel.find({ packageIds: id })
          .select(
            "code description discountType discount startDate expiryDate usageLimit usedCount perCustomerLimit couponType"
          )
          .lean(),

        (pkg as any).shareWithMarketplaces?.length > 0
          ? MarketplaceModel.find({
              _id: { $in: (pkg as any).shareWithMarketplaces },
            })
              .select("name")
              .lean()
          : Promise.resolve([]),

        ServiceProviderRegModel.findById((pkg as any).authorData?.id)
          .select(
            "name number email profileUrl address1 address2 city state regNumber description disclaimer"
          )
          .lean(),
      ]);

    return res.status(200).json({
      success: true,
      package: pkg,
      orders,
      coupons,
      marketplaces,
      serviceProvider,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch package details",
      error,
    });
  }
};

export const getAllMarketplacesGlobal = async (req: Request, res: Response) => {
  try {
    const data = await MarketplaceModel.find({})
      .select(
        "name description slug brokerSnapshot activeRaIds revokedRaIds invitations status createdAt updatedAt createdByBrokerId"
      )
      .sort({ createdAt: -1 })
      .lean();
    return res
      .status(200)
      .json({ success: true, message: "Marketplaces fetched", data });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch marketplaces", error });
  }
};

export const getMarketplaceDetailsForAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const marketplace = await MarketplaceModel.findById(id).lean();
    if (!marketplace) {
      return res
        .status(404)
        .json({ success: false, message: "Marketplace not found" });
    }

    const mp = marketplace as any;

    const [services, packages, portfolios, events, articles, activeRAs, creator] =
      await Promise.all([
        ServiceModel.find({ shareWithMarketplaces: id })
          .select(
            "title segment serviceType subscribedBy price authorData bannerURL createdAt"
          )
          .lean(),

        PackageModel.find({ shareWithMarketplaces: id })
          .select("title description pricing stats authorData createdAt")
          .lean(),

        Portfolio.find({ shareWithMarketplaces: id })
          .select(
            "portfolioName theme riskLevel subscribedBy authorData minimumInvestment createdAt"
          )
          .lean(),

        EventModel.find({ shareWithMarketplaces: id })
          .select(
            "title eventDate eventMode authorData NoOfRegistration createdAt"
          )
          .lean(),

        ArticleModel.find({ shareWithMarketplaces: id })
          .select("title description authorData createdAt")
          .lean(),

        mp.activeRaIds?.length > 0
          ? ServiceProviderRegModel.find({ _id: { $in: mp.activeRaIds } })
              .select("name email number profileUrl")
              .lean()
          : Promise.resolve([]),

        (async () => {
          const sp = await ServiceProviderRegModel.findById(
            mp.createdByBrokerId
          )
            .select("name email number profileUrl")
            .lean();
          if (sp) return sp;
          const admin = await AdminModel.findById(mp.createdByBrokerId)
            .select("name email")
            .lean();
          return admin;
        })(),
      ]);

    return res.status(200).json({
      success: true,
      marketplace,
      services,
      packages,
      portfolios,
      events,
      articles,
      activeRAs,
      creator,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace details",
      error,
    });
  }
};

const VALID_SUBDOMAIN_STATUSES = ["pending", "active", "disabled"] as const;
const APEX_DOMAIN = "tradeboxlive.com";

export const setProviderCustomSubdomain = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, subdomain, status } = req.body as {
      id?: string;
      subdomain?: string | null;
      status?: (typeof VALID_SUBDOMAIN_STATUSES)[number];
    };

    if (!id || !mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid provider id required" });
    }

    const prev = await ServiceProviderRegModel.findById(id).select(
      "customSubdomain customSubdomainStatus"
    );
    if (!prev) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    const update: Record<string, unknown> = {};

    if (subdomain === null || subdomain === "") {
      update.customSubdomain = null;
      update.customSubdomainStatus = "pending";
    } else if (typeof subdomain === "string") {
      const sub = subdomain.toLowerCase().trim();
      if (!SUBDOMAIN_REGEX.test(sub) || RESERVED_SUBDOMAINS.has(sub)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or reserved subdomain" });
      }
      const clash = await ServiceProviderRegModel.findOne({
        customSubdomain: sub,
        _id: { $ne: id },
      }).select("_id");
      if (clash) {
        return res
          .status(409)
          .json({ success: false, message: "Subdomain already taken" });
      }
      update.customSubdomain = sub;
    }

    if (status) {
      if (!VALID_SUBDOMAIN_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid status" });
      }
      update.customSubdomainStatus = status;
    }

    if (Object.keys(update).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    }

    const sp = await ServiceProviderRegModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select("_id customSubdomain customSubdomainStatus");

    if (!sp) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    // Sync Vercel domain registration with the new state. Best-effort:
    // DB is the source of truth; surface failures as warnings so admin
    // can retry rather than rolling back the save.
    const warnings: string[] = [];
    const prevSub = prev.customSubdomain || null;
    const prevActive = prev.customSubdomainStatus === "active" && !!prevSub;
    const nextSub = sp.customSubdomain || null;
    const nextActive = sp.customSubdomainStatus === "active" && !!nextSub;
    const subChanged = prevSub !== nextSub;

    if (prevActive && (subChanged || !nextActive) && prevSub) {
      const r = await removeVercelDomain(`${prevSub}.${APEX_DOMAIN}`);
      if (!r.ok) warnings.push(`Vercel remove (${prevSub}): ${r.message}`);
    }

    if (nextActive && (subChanged || !prevActive) && nextSub) {
      const r = await addVercelDomain(`${nextSub}.${APEX_DOMAIN}`);
      if (!r.ok) warnings.push(`Vercel add (${nextSub}): ${r.message}`);
    }

    return res.status(200).json({
      success: true,
      data: sp,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Subdomain already taken" });
    }
    console.error("setProviderCustomSubdomain", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update subdomain" });
  }
};
