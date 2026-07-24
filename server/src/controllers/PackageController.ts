// controllers/package.controller.ts
import { Request, Response } from "express";
import { PackageModel } from "../models/PackageModel";
import { extractTelegramChannels } from "../utils/extractTelegramChannels";
import { validatePackagePayload } from "../validators/packageValidator";
import { ServiceModel } from "../models/PostModels";

export const createPackage = async (req: Request, res: Response) => {
    if (!req.body) {
      return res
        .status(400)
        .json({ success: false, message: "No Data provided" });
    }

  try {

    const parsed = JSON.parse(req.body.data);

    const {
      title,
      description,
      includedServices,
      pricingPlans,
      shareWithMarketplaces,
      authorData,
    } = parsed;

    const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };

    const bannerFile = files?.bannerURL?.[0];
    const tncFile = files?.tncFile?.[0];

    if (!bannerFile || !tncFile) {
      return res.status(400).json({
        success: false,
        message: "Banner & TnC file required",
      });
    }

    // validation
    await validatePackagePayload(includedServices, authorData.id, pricingPlans);

    // Extract telegram channels
    const telegramChannels = await extractTelegramChannels(includedServices);

    // Save package
    const newPackage = new PackageModel({
      authorData,
      title,
      description,
      includedServices,
      pricingPlans,
      bannerURL: bannerFile.location,
      tncFileURL: tncFile.location,
      shareWithMarketplaces,
      approvalStatus: true,
    });

    await newPackage.save();

    return res.status(200).json({
      success: true,
      message: "Package created successfully",
    //   id: newPackage._id,
    //   telegramChannels, // optional: for frontend preview
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: typeof error === "string" ? error : "Failed to create package",
    });
  }
};

export const getMyPackages = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    }

    const packages = await PackageModel.find({
      "authorData.id": id,
    })
      .populate("includedServices", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
    });
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Package id is required",
      });
    }

    const deleted = await PackageModel.findOneAndDelete({
      _id: id,
      "authorData.id": req.user.id, // from auth middleware
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete package",
    });
  }
};


export const getPackageDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    const userId = (req as any).user.id; // from JWT middleware

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Package id is required",
      });
    }

    const pkg = await PackageModel.findById(id)
      .populate("includedServices", "title")
      .lean();

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // 🔐 ownership check
    if (pkg?.authorData?.id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    return res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch package",
    });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const parsed = JSON.parse(req.body.data);

    const {
      id,
      title,
      description,
      includedServices,
      pricingPlans,
      shareWithMarketplaces,
    } = parsed;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Package id required",
      });
    }

    const pkg = await PackageModel.findById(id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    // 🔐 ownership check
    if (pkg?.authorData?.id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    /* ---------- FILES ---------- */
    const files = req.files as {
      [fieldname: string]: Express.MulterS3.File[];
    };

    if (files?.bannerURL?.[0]) {
      pkg.bannerURL = files.bannerURL[0].location;
    }

    if (files?.tncFile?.[0]) {
      pkg.tncFileURL = files.tncFile[0].location;
    }

    /* ---------- UPDATE FIELDS ---------- */
    pkg.title = title ?? pkg.title;
    pkg.description = description ?? pkg.description;
    pkg.includedServices = includedServices ?? pkg.includedServices;
    pkg.pricingPlans = pricingPlans ?? pkg.pricingPlans;
    pkg.shareWithMarketplaces =
      shareWithMarketplaces ?? pkg.shareWithMarketplaces;

    await pkg.save();

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update package",
    });
  }
};