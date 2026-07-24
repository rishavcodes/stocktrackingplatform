import type { Request, Response } from "express";
import { z } from "zod";
import { type IScript, Portfolio } from "../../lib/schema";
import { ServiceProviderRegModel } from "../../models/AuthModels";
import { daysToFeeValidityLabel } from "../../lib/portfolioPricing";
import { sendNotification } from "../../helpers/sendNotification";

type AssetData = {
	slNo: number;
	exchangeType: string;
	segmentType: string;
	scriptName: {
		exchange: string;
		token: string;
		name: string;
	};
	cmp: number | null;
	qty: number | null;
	weightage: number | null;
	value: number | null;
	target: number | null;
};

type AuthorData = {
	id: string;
	name: string;
	email: string;
};

type PortfolioData = {
	authorData: AuthorData;
	portfolioName: string;
	theme: string;
	methodology: string;
	rationale: string;
	disclosure: string;
	benchmarkIndex: string;
	investmentHorizon: number;
	reviewFrequency: number;
	minInvestmentAmount: number;
	assets: AssetData[];
	pricingPlans: { validity: number; price: number }[];
	feeValidity?: string;
	fees?: number;
	riskLevel: number;
	tncFileURL: string;
	bannerURL?: string; // ✅ Add bannerURL as optional
	riskMetrics?: {
		standardDeviation?: string;
		sharpeRatio?: string;
		maximumDrawdown?: string;
	};
	shareWithMarketplaces?: string[];
};

const assetSchema = z.object({
	slNo: z.number(),
	exchangeType: z.string().min(1, "Exchange is required"),
	segmentType: z.string().min(1, "Segment is required"),
	scriptName: z.object({
		exchange: z.string().min(1, "Exchange is required"),
		token: z.string().min(1, "Token is required"),
		name: z.string().min(1, "Name is required"),
	}),
	cmp: z.number().nullable(),
	qty: z.number().nullable(),
	weightage: z.number().nullable(),
	value: z.number().nullable(),
	target: z.number().nullable(),
});

const createPortfolioSchema = z
	.object({
		authorData: z.object({
			id: z.string().min(1),
			name: z.string().min(1),
			email: z.string().email(),
		}),
		portfolioName: z
			.string()
			.min(2, "Portfolio name must be at least 2 characters"),
		theme: z.string().min(2, "Theme must be at least 2 characters"),
		methodology: z
			.string()
			.min(10, "Methodology must be at least 10 characters"),
		rationale: z.string().min(10, "Rationale must be at least 10 characters"),
		disclosure: z.string().min(10, "Disclosure must be at least 10 characters"),
		benchmarkIndex: z.string().min(1, "Benchmark index is required"),
		tncFileURL: z.string().min(1, "TnC file URL is required"),
		bannerURL: z.string().optional(), // ✅ Add bannerURL validation (optional)
		investmentHorizon: z
			.number()
			.min(1, "Investment horizon must be at least 1 month"),
		reviewFrequency: z
			.number()
			.min(1, "Review frequency must be at least 1 month"),
		minInvestmentAmount: z
			.number()
			.min(0, "Minimum investment amount must be positive"),
		assets: z.array(assetSchema).min(1, "At least one asset is required"),
		pricingPlans: z
			.array(
				z.object({
					validity: z
						.number()
						.int("Validity must be a whole number of days")
						.min(1, "Validity must be at least 1 day")
						.max(365, "Validity cannot exceed 365 days"),
					price: z.number().min(0, "Price must be positive"),
				}),
			)
			.min(1, "At least one pricing plan is required"),
		riskLevel: z.number().min(1, "Risk level must be at least 1%"),
		riskMetrics: z
			.object({
				standardDeviation: z.string().optional(),
				sharpeRatio: z.string().optional(),
				maximumDrawdown: z.string().optional(),
			})
			.optional(),
		shareWithMarketplaces: z.array(z.string()).optional(),
	})
	.superRefine((data: PortfolioData, ctx: z.RefinementCtx) => {
		// Validate total value of assets is less than minInvestmentAmount
		const totalAssetValue = data.assets.reduce(
			(sum: number, asset: AssetData) => sum + (asset.value || 0),
			0,
		);

		if (totalAssetValue > data.minInvestmentAmount) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Total asset value (${totalAssetValue}) must be less than minimum investment amount (${data.minInvestmentAmount})`,
				path: ["assets"],
			});
		}

		// Validate each asset's value doesn't exceed minInvestmentAmount
		data.assets.forEach((asset: AssetData, index: number) => {
			if (asset.value && asset.value > data.minInvestmentAmount) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Individual asset value cannot exceed minimum investment amount`,
					path: ["assets", index, "value"],
				});
			}
		});
	});

export const createPortfolioController = async (
	req: Request,
	res: Response,
) => {
	try {
		// Get the uploaded files URLs from S3
		const files = req.files as { [fieldname: string]: Express.MulterS3.File[] };

		// Get TnC file URL
		const tncFileURL = files?.tncFile?.[0]?.location || null;

		if (!tncFileURL) {
			return res.status(400).json({
				message: "TnC file is required",
			});
		}

		// Get banner image URL if uploaded
		const bannerURL = files?.bannerImage?.[0]?.location || null;

		// Parse the JSON data from the correct location
		let requestData;
		if (req.body.data) {
			requestData =
				typeof req.body.data === "string"
					? JSON.parse(req.body.data)
					: req.body.data;
		} else {
			requestData = req.body;
		}

		// Add the file URLs to the data
		const dataWithFiles = {
			...requestData,
			tncFileURL: tncFileURL,
			bannerURL: bannerURL, // ✅ Add banner URL
		};

		// ✅ Validate request body
		const validatedData = createPortfolioSchema.parse(dataWithFiles);
console.log("VALIDATED DATA", validatedData);

		// Derive the legacy `fees`/`feeValidity` mirrors from the cheapest plan so
		// every existing read site keeps working with zero changes.
		const cheapestPlan = validatedData.pricingPlans.reduce(
			(min, p) => (p.price < min.price ? p : min),
			validatedData.pricingPlans[0],
		);

		// ✅ Create portfolio
		const portfolio = new Portfolio({
			authorData: validatedData.authorData,
			portfolioName: validatedData.portfolioName,
			theme: validatedData.theme,
			Commercials: {
				yearlyCharge: 0,
				deductionPerSale: 0,
				startDate: new Date(),
				endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
				approvedByAdmin: false,
			},
			methodology: validatedData.methodology,
			rationale: validatedData.rationale,
			disclosure: validatedData.disclosure,
			benchmarkIndex: validatedData.benchmarkIndex,
			investmentHorizon: validatedData.investmentHorizon,
			reviewFrequency: validatedData.reviewFrequency,
			minInvestmentAmount: validatedData.minInvestmentAmount,
			pricingPlans: validatedData.pricingPlans,
			feeValidity: daysToFeeValidityLabel(cheapestPlan.validity),
			fees: cheapestPlan.price,
			riskLevel: validatedData.riskLevel,
			riskMetrics: validatedData.riskMetrics,
			tncFileURL: validatedData.tncFileURL,
			bannerURL: validatedData.bannerURL, // ✅ Add banner URL to portfolio
			scripts: validatedData.assets.map(
				(asset: AssetData): IScript => ({
					slNo: asset.slNo,
					exchangeType: asset.exchangeType,
					segmentType: asset.segmentType,
					scriptName: asset.scriptName,
					cmp: asset.cmp || 0,
					buyRate: asset.cmp || 0,
					quantity: asset.qty || 0,
					weightage: asset.weightage || 0,
					value: asset.value || 0,
					target: asset.target || 0,
					lastUpdated: new Date(),
				}),
			),
			shareWithMarketplaces: validatedData.shareWithMarketplaces || [],
		});

		await portfolio.save();

		// Notify the creating SP (confirmation in their top bell modal). A brand-new
		// portfolio has no subscribers yet, so the recipient is the author only.
		// sendNotification swallows its own errors; the extra .catch is belt-and-
		// suspenders so a notification failure can never fail portfolio creation.
		await sendNotification({
			recipientIds: [validatedData.authorData.id],
			recipientRole: "provider",
			message: `Your portfolio "${portfolio.portfolioName}" has been created successfully`,
			type: "portfolio-update",
			category: "sp",
			sentBy: {
				id: validatedData.authorData.id,
				name: validatedData.authorData.name,
			},
			postLink: "/dashboard/serviceprovider/portfolio/myportfolios",
			ctaLabel: "View My Portfolios",
		}).catch((e) =>
			console.error("[portfolio create notification] failed:", e),
		);

		return res.status(201).json({
			message: "Portfolio created successfully",
			data: portfolio,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				message: "Validation error",
				errors: error.errors,
			});
		}

		if (
			error instanceof Error &&
			error.message.includes("duplicate key error")
		) {
			return res.status(400).json({ message: "Portfolio name already exists" });
		}

		console.error("Error creating portfolio:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
};
