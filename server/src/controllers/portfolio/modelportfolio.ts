import { tryCatch } from "bullmq";
import { Portfolio } from "../../lib/schema";
import { Response, Request } from "express";
import { ServiceProviderRegModel } from "../../models/AuthModels";
import { WalletTransactionModel } from "../../models/TransactionModels";

export const modelPortfolionotApproved = async (
  req: Request,
  res: Response
) => {
  try {
    const portfolios = await Portfolio.find({
      "Commercials.approvedByAdmin": false,
    });
    return res.status(200).json({
      message: "Portfolios fetched which is not approved by Admin",
      data: portfolios,
      success: true,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error in the model portfolio not approved",
      error: error.message,
      success: false,
    });
  }
};

export const modelPortfolioApprovedList = async (
  req: Request,
  res: Response
) => {
  try {
    const portfolios = await Portfolio.find({
      "Commercials.approvedByAdmin": true,
    });
    return res.status(200).json({
      message: "Portfolios fetched which are approved by Admin",
      data: portfolios,
      success: true,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Error in fetching portfolios approved",
      error: error.message,
      success: false,
    });
  }
};

export const modelPortfolioApproved = async (req: Request, res: Response) => {
  const { id, yearlyCharge, deductionPerSale, startDate, endDate } = req.body;

  if (!id) {
    return res.status(400).json({
      message: "Portfolio id is required",
      success: false,
    });
  }

  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    // ✅ Update portfolio nested Commercials fields
    const portfolio = await Portfolio.findByIdAndUpdate(
      id,
      {
        "Commercials.yearlyCharge": yearlyCharge,
        "Commercials.deductionPerSale": deductionPerSale,
        "Commercials.startDate": startDate,
        "Commercials.endDate": endDate,
        "Commercials.approvedByAdmin": true,
      },
      { new: true }
    );

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
        success: false,
      });
    }

    // ✅ Fetch provider
    const providerId = portfolio.authorData?.id;
    if (!providerId) {
      return res.status(400).json({
        message: "Portfolio authorData is missing provider ID",
        success: false,
      });
    }

    const provider = await ServiceProviderRegModel.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        message: "Provider not found",
        success: false,
      });
    }

    // ✅ Deduct yearly charge with 18% tax
    const deductionAmount = Number(yearlyCharge) * 1.18;
    provider.wallet.amount = provider.wallet.amount || 0;

    if (provider.wallet.amount < deductionAmount) {
      return res.status(400).json({
        message: "Insufficient balance in wallet",
        success: false,
      });
    }

    provider.wallet.amount -= deductionAmount;

    // ✅ Ensure modelPortfolios and decrease limits safely
    if (!provider.modelPortfolios) {
      return res.status(400).json({
        message: "Provider modelPortfolios data not found",
        success: false,
      });
    }
    provider.modelPortfolios.limits = Math.max(
      (provider.modelPortfolios.limits || 0) - 1,
      0
    );

    await provider.save();

    // ✅ Record wallet transaction
    const walletTransaction = new WalletTransactionModel({
      serviceProviderId: providerId,
      orderdBy: {
        name: "NA",
        id: "NA",
        email: "NA",
      },
      paymentId: "NA",
      orderId: "NA",
      amount: deductionAmount || 0,
      type: "model-portfolio-charge",
    });

    await walletTransaction.save();

    return res.status(200).json({
      message: "Portfolio approved successfully",
      success: true,
      data: portfolio,
      providerWalletBalance: provider.wallet.amount,
      walletTransaction: walletTransaction,
      yearlyCharge: yearlyCharge,
      deductionAmount: deductionAmount,
    });
  } catch (error: any) {
    console.error("Error approving portfolio:", error);
    return res.status(500).json({
      message: "Error approving portfolio",
      error: error.message,
      success: false,
    });
  }
};
