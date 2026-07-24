import { Request, Response } from "express";
import {
  Portfolio,
  IScript,
  IPortfolio,
  IClosedPosition,
} from "../../lib/schema";
import { ServiceProviderRegModel } from "../../models/AuthModels";
import { PortfolioHistory } from "../../models/ScoreCardModel";
import { OrderModel } from "../../models/TransactionModels";
import { getCachedPriceBulk } from "../../services/PriceCache";
import { buildRebalanceHistory } from "../../lib/portfolioRebalance";

interface QueryParams {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

interface ProcessedScript extends IScript {
  currentCMP: number | null;
  initialValue: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

interface PortfolioPerformance {
  totalInitialValue: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

// Helper function to round numbers to 2 decimal places
const roundToTwo = (num: number): number => parseFloat(num?.toFixed(2));

export const getAllPortfoliosController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
    } = req.query as QueryParams;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Validate pagination parameters
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        message: "Invalid page number",
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        message: "Invalid limit number. Must be between 1 and 100",
      });
    }

    // Calculate skip value for pagination
    const skip = (pageNumber - 1) * limitNumber;

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { portfolioName: { $regex: search, $options: "i" } },
            { theme: { $regex: search, $options: "i" } },
            { methodology: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Build sort object
    const sortObject: { [key: string]: 1 | -1 } = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Execute query with pagination and sorting
    const [portfolios, totalCount] = await Promise.all([
      Portfolio.find(searchQuery)
        .sort(sortObject)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Portfolio.countDocuments(searchQuery),
    ]);

    // Derive active subscribers per portfolio from OrderModel — Portfolio.subscribedBy
    // is maintained by ~8 payment paths and not all of them fire consistently,
    // so unioning with non-expired portfolio orders is the source of truth.
    const portfolioIds = portfolios.map((p) => String(p._id));
    const subscriberAgg = await OrderModel.aggregate([
      {
        $match: {
          subscribedToId: { $in: portfolioIds },
          type: "portfolio",
          isExpired: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$subscribedToId",
          subs: { $addToSet: "$orderdBy.id" },
        },
      },
    ]);
    const subscriberMap = new Map<string, string[]>(
      subscriberAgg.map((row) => [String(row._id), (row.subs || []).map(String)])
    );

    // Computes the same `performance` block the factsheet (getPortfolioById)
    // returns, so the user-facing list shows identical numbers to the detail
    // page. Pure stored-field math — no Redis lookup — keeps the list cheap.
    //
    // Formula match:
    //   open scripts:      initial = sum(buyRate * qty), current = sum(value)
    //   closed positions:  initial = sum(investedValue), PL = sum((cmp-buyRate)*qty)
    //   total %            = open% + closed%   (additive, matches factsheet)
    const enrichedPortfolios = portfolios.map((portfolio) => {
      const derived = subscriberMap.get(String(portfolio._id)) || [];
      const mergedSubscribers = Array.from(
        new Set([
          ...((portfolio.subscribedBy || []) as string[]).map(String),
          ...derived,
        ])
      );

      const scripts = (portfolio.scripts || []) as IScript[];
      const openInitial = scripts.reduce(
        (sum, s) => sum + (s.buyRate || 0) * (s.quantity || 0),
        0,
      );
      const openCurrent = scripts.reduce(
        (sum, s) => sum + (s.value || 0),
        0,
      );
      const openProfitLoss = openCurrent - openInitial;
      const openPct =
        openInitial !== 0 ? (openProfitLoss / openInitial) * 100 : 0;

      const closed = (portfolio.closedPositions || []) as IClosedPosition[];
      const closedInitial = closed.reduce(
        (sum, p) => sum + (p?.investedValue || 0),
        0,
      );
      const closedProfitLoss = closed.reduce(
        (sum, p) =>
          sum +
          (p.cmp || 0) * (p.quantity || 0) -
          (p.buyRate || 0) * (p.quantity || 0),
        0,
      );
      const closedPct =
        closedInitial !== 0 ? (closedProfitLoss / closedInitial) * 100 : 0;

      return {
        ...portfolio,
        subscribedBy: mergedSubscribers,
        bannerImageURL: (portfolio as any).bannerURL,
        performance: {
          totalInitialValue: openInitial,
          totalCurrentValue: openCurrent,
          totalProfitLoss: openProfitLoss + closedProfitLoss,
          totalProfitLossPercentage: openPct + closedPct,
        },
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return res.status(200).json({
      message: "Portfolios retrieved successfully",
      data: {
        portfolios: enrichedPortfolios,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNumber,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getPortfolioByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: "Portfolio id is required",
      });
    }

    // Fetch portfolio
    const portfolio = await Portfolio.findById(id).lean();
    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found",
      });
    }

    const serviceProvider = await ServiceProviderRegModel.findById(
      portfolio.authorData.id
    );

    if (!serviceProvider) {
      return res.status(404).json({
        message: "ServiceProvider not found",
      });
    }

    let sername = serviceProvider.number;
    let seraddress = [
      serviceProvider.address1,
      serviceProvider.address2,
      serviceProvider.city,
      serviceProvider.state,
    ] 
      .filter(Boolean)
      .join(", ");

    // Batch-fetch all script prices from Redis cache
    const tokenList = (portfolio.scripts as IScript[]).map((script) => ({
      exchange: script.scriptName.exchange,
      token: script.scriptName.token,
    }));
    const priceMap = await getCachedPriceBulk(tokenList);

    // Process each script — all displayed values derive from the stored daily
    // snapshot (script.cmp, script.value), refreshed by updatePortfolioPricesCron
    // at 17:00 server time. We expose currentCMP from Redis informationally but
    // do NOT mix it into displayed totals, so CMP / PnL / value stay consistent.
    const processedScripts = (portfolio.scripts as IScript[]).map((script) => {
      const currentCMP = priceMap.has(script.scriptName.token)
        ? priceMap.get(script.scriptName.token)
        : null;

      const storedCMP = script.cmp || 0;
      const quantity = script.quantity || 0;
      const buyRate = script.buyRate || 0;

      const initialValue = buyRate * quantity;
      const currentValue = storedCMP * quantity;
      const profitLoss = (storedCMP - buyRate) * quantity;
      const profitLossPercentage =
        initialValue !== 0 ? (profitLoss / initialValue) * 100 : 0;

      return {
        ...script,
        cmp: script.cmp,
        buyRate: script.buyRate,
        quantity: script.quantity,
        weightage: script.weightage,
        value: script.value,
        currentCMP,
        initialValue,
        currentValue,
        profitLoss,
        profitLossPercentage,
      } as ProcessedScript;
    });

    // Calculate portfolio performance (NO ROUNDING)
    const totalInitialValue = processedScripts.reduce(
      (sum: number, script: ProcessedScript) => sum + script?.initialValue,
      0
    );
    const totalCurrentValue = processedScripts.reduce(
      (sum: number, script: ProcessedScript) => sum + script?.value,
      0
    );

    const totalCLosedPositionsInitialValue = 
      portfolio.closedPositions?.reduce(
        (sum: number, position: IClosedPosition) =>
          sum + position?.investedValue,
        0
      ) || 0;

    const totalCLosedPositionsCurrentValue = 
      portfolio.closedPositions?.reduce(
        (sum: number, position: IClosedPosition) => sum + position?.value,
        0
      ) || 0;

    const totalScriptsProfitLoss = totalCurrentValue - totalInitialValue;
    const totalScriptsProfitLossPercentage =
      totalInitialValue !== 0
        ? (totalScriptsProfitLoss / totalInitialValue) * 100
        : 0;

    const totalClosedPositionsProfitLoss =
      portfolio.closedPositions?.reduce(
        (sum: number, position: IClosedPosition) =>
          sum +
          (position.cmp || 0) * (position.quantity || 0) -
          (position.buyRate || 0) * (position.quantity || 0),
        0
      ) || 0;
    const totalClosedPositionsProfitLossPercentage =
      totalCLosedPositionsInitialValue !== 0
        ? (totalClosedPositionsProfitLoss / totalCLosedPositionsInitialValue) * 100
        : 0;

    // Get last 12 months of performanceHistory
    const performanceHistoryLast12Months = (portfolio.performanceHistory || [])
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Fetch daily P&L history
    const dailyHistory = await PortfolioHistory.find({ portfolioId: id })
      .sort({ date: 1 })
      .lean();

    // Reconstruct previous rebalances from recorded update events (newest first)
    const rebalanceHistory = await buildRebalanceHistory(id as string);

    // Prepare response (NO ROUNDING)
    const response = {
      ...portfolio,
      sername,
      seraddress,
      sebiRegNo: serviceProvider.regNumber ?? null,
      minInvestmentAmount: portfolio.minInvestmentAmount, // Remove roundToTwo
      scripts: processedScripts,
      closedPositions: portfolio.closedPositions,
      rebalanceHistory,
      performance: { 
        totalInitialValue,
        totalCurrentValue,
        totalProfitLoss:
          totalScriptsProfitLoss + totalClosedPositionsProfitLoss,
        totalProfitLossPercentage:
          totalScriptsProfitLossPercentage +
          totalClosedPositionsProfitLossPercentage,
      } as PortfolioPerformance,
      performanceHistoryLast12Months,
      dailyHistory,
      tncFileURL: portfolio.tncFileURL,
      bannerImageURL: portfolio.bannerURL,
      serviceProviderData: {
        profileImage: serviceProvider.profileUrl,
        number: serviceProvider.number,
        address1: serviceProvider.address1,
        address2: serviceProvider.address2,
        city: serviceProvider.city,
        state: serviceProvider.state,
        description: serviceProvider.description,
        regNumber: serviceProvider.regNumber,
        disclaimer: serviceProvider.disclaimer,
      }
    };

    return res.status(200).json({
      message: "Portfolio retrieved successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching portfolio by id:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


export const getPortfoliosByAuthorIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { authorId } = req.query;

    if (!authorId) {
      return res.status(400).json({
        message: "Author ID is required",
      });
    }

    const portfolios = await Portfolio.find({
      "authorData.id": authorId,
    }).lean();

    if (!portfolios || portfolios.length === 0) {
      // An empty portfolio list is a valid state, not an error. Return 200 with
      // an empty array so the client renders its "create your first portfolio"
      // empty state instead of "Failed to fetch portfolios". A sub-profile owns
      // no portfolios of its own, so it always lands here — the 404 was turning
      // that normal case into an error screen.
      return res.status(200).json({
        message: "No portfolios found for this author",
        data: [],
      });
    }

    // Derive active subscribers per portfolio from OrderModel — Portfolio.subscribedBy
    // is maintained by ~8 payment paths and not all of them fire consistently,
    // so counting unique non-expired orders is the source of truth.
    const portfolioIds = portfolios.map((p) => String(p._id));
    const subscriberAgg = await OrderModel.aggregate([
      {
        $match: {
          subscribedToId: { $in: portfolioIds },
          type: "portfolio",
          isExpired: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$subscribedToId",
          subs: { $addToSet: "$orderdBy.id" },
        },
      },
    ]);
    const subscriberCountMap = new Map<string, string[]>(
      subscriberAgg.map((row) => [String(row._id), (row.subs || []).map(String)])
    );

    const processedPortfolios = await Promise.all(
      portfolios.map(async (portfolio) => {
        // Batch-fetch all script prices from Redis cache
        const tokenList = (portfolio.scripts as IScript[]).map((script) => ({
          exchange: script.scriptName.exchange,
          token: script.scriptName.token,
        }));
        const priceMap = await getCachedPriceBulk(tokenList);

        const processedScripts = (portfolio.scripts as IScript[]).map(
          (script) => {
            const currentCMP = priceMap.has(script.scriptName.token)
              ? roundToTwo(priceMap.get(script.scriptName.token)!)
              : null;
            const initialCMP = roundToTwo(script.cmp || 0);
            const quantity = script.quantity || 0;

            const initialValue = roundToTwo(initialCMP * quantity);
            const currentValue = currentCMP
              ? roundToTwo(currentCMP * quantity)
              : 0;
            const profitLoss = roundToTwo(currentValue - initialValue);
            const profitLossPercentage =
              initialValue !== 0
                ? roundToTwo((profitLoss / initialValue) * 100)
                : 0;

            return {
              ...script,
              cmp: roundToTwo(script.cmp),
              buyRate: roundToTwo(script.buyRate),
              quantity: roundToTwo(script.quantity),
              weightage: roundToTwo(script.weightage),
              value: roundToTwo(script.value),
              currentCMP,
              initialValue,
              currentValue,
              profitLoss,
              profitLossPercentage,
            };
          }
        );

        const totalInitialValue = roundToTwo(
          processedScripts.reduce((sum, s) => sum + s.initialValue, 0)
        );

        const totalCurrentValue = roundToTwo(
          processedScripts.reduce((sum, s) => sum + s.currentValue, 0)
        );

        const totalCLosedPositionsInitialValue = roundToTwo(
          portfolio.closedPositions?.reduce(
            (sum: number, position: IClosedPosition) =>
              sum + position?.investedValue,
            0
          ) || 0
        );

        const totalCLosedPositionsCurrentValue = roundToTwo(
          portfolio.closedPositions?.reduce(
            (sum: number, position: IClosedPosition) => sum + position?.value,
            0
          ) || 0
        );

    const totalScriptsProfitLoss = roundToTwo(
      processedScripts.reduce(
        (sum: number, script: ProcessedScript) => sum + script.profitLoss,
        0
      )
    );

        const totalScriptsProfitLossPercentage =
          totalInitialValue !== 0
            ? roundToTwo((totalScriptsProfitLoss / totalInitialValue) * 100)
            : 0;

        const totalClosedPositionsProfitLoss = roundToTwo(
          portfolio.closedPositions?.reduce(
            (sum: number, position: IClosedPosition) =>
              sum +
              (position.cmp || 0) * (position.quantity || 0) -
              (position.buyRate || 0) * (position.quantity || 0),
            0
          ) || 0
        );

        const totalClosedPositionsProfitLossPercentage =
          totalCLosedPositionsInitialValue !== 0
            ? roundToTwo(
                (totalClosedPositionsProfitLoss /
                  totalCLosedPositionsInitialValue) *
                  100
              )
            : 0;

        const performanceHistoryLast12Months = (
          portfolio.performanceHistory || []
        )
          .slice()
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12);

        const derivedSubscribers =
          subscriberCountMap.get(String(portfolio._id)) || [];

        // Union with the stored subscribedBy so we never *under*count if orders
        // were ever cleared but the stored array still has entries.
        const mergedSubscribers = Array.from(
          new Set([
            ...((portfolio.subscribedBy || []) as string[]).map(String),
            ...derivedSubscribers,
          ])
        );

        return {
          ...portfolio,
          subscribedBy: mergedSubscribers,
          minInvestmentAmount: roundToTwo(portfolio.minInvestmentAmount),
          scripts: processedScripts,
          closedPositions: portfolio.closedPositions,
          performance: {
            totalInitialValue,
            totalCurrentValue,
            totalProfitLoss:
              totalScriptsProfitLoss + totalClosedPositionsProfitLoss,
            totalProfitLossPercentage:
              totalScriptsProfitLossPercentage +
              totalClosedPositionsProfitLossPercentage,
          },
          performanceHistoryLast12Months,
        };
      })
    );

    return res.status(200).json({
      message: "Portfolios retrieved successfully",
      data: processedPortfolios,
    });
  } catch (error) {
    console.error("Error fetching portfolios by authorId:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};