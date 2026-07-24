import { Request, Response } from "express";
import {
  ArticleModel,
  EventModel,
  ServiceModel,
  VideoModel,
} from "../models/PostModels";
import { Portfolio } from "../lib/schema";
import { ServiceProviderRegModel } from "../models/AuthModels";
import { tryCatch } from "bullmq";
import { PortfolioHistory } from "../models/ScoreCardModel";

// ----------------- ARTICLES -----------------
export const GetMarketwatchArticles = async (req: Request, res: Response) => {
  try {
    const data = await ArticleModel.find({});

    return res.status(200).json({
      success: true,
      message: "Articles fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch articles",
      error,
    });
  }
};

// ----------------- VIDEOS -----------------
export const GetMarketwatchVideos = async (req: Request, res: Response) => {
  try {
    const data = await VideoModel.find({});

    return res.status(200).json({
      success: true,
      message: "Videos fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error,
    });
  }
};

export const GetMarketPortfolios = async (req: Request, res: Response) => {
  try {
    const data = await Portfolio.find({});

    return res.status(200).json({
      success: true,
      message: "Videos fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error,
    });
  }
};


export const GetMarketwatchServices = async (req: Request, res: Response) => {
  try {
    const data = await ServiceModel.find({});

    return res.status(200).json({
      success: true,
      message: "Podcasts fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch podcasts",
      error,
    });
  }
};

// ----------------- EVENTS -----------------
export const GetMarketwatchEvents = async (req: Request, res: Response) => {
  try {
    const data = await EventModel.find({});

    return res.status(200).json({
      success: true,
      message: "Events fetched",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error,
    });
  }
};




export const GetallSP = async (req: Request, res: Response) => {
  try {
    // Step 1: Get all service providers (name + regNumber + _id)
    const serviceProviders = await ServiceProviderRegModel.find(
      {},
      { name: 1, regNumber: 1, _id: 1,profileUrl:1 }
    );

    // Step 2: Prepare aggregated result array
    const result = await Promise.all(
      serviceProviders.map(async (sp) => {
        const spId = sp._id.toString();

        // Step 3: Count each type of content for this provider
        const [videoCount, articleCount, eventCount,portfolioCount ,serviceCount,] =
          await Promise.all([
            VideoModel.countDocuments({ "authorData.id": spId }),
            ArticleModel.countDocuments({ "authorData.id": spId }),
            EventModel.countDocuments({ "authorData.id": spId }),
            Portfolio.countDocuments({ "authorData.id": spId }),
            ServiceModel.countDocuments({ "authorData.id": spId }),
            PortfolioHistory.countDocuments({"authordata.id":spId})
          ]);

        // Step 4: Return formatted info
        return {
          id: spId,
          profileUrl:sp.profileUrl,
          serviceProvider: sp.name,
          regNumber: sp.regNumber,
          numberOfVideos: videoCount,
          numberOfArticles: articleCount,
          numberOfEvents: eventCount,
          numberOfPortfolios: portfolioCount,
          numberOfServices: serviceCount,
          numberOfRecommendations:portfolioCount,
          
        };
      })
    );

    // Step 5: Send final response
    return res.status(200).json({
      success: true,
      message: "Service providers and content stats fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Problem in fetching service provider details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service providers details",
      error,
    });
  }
};

 