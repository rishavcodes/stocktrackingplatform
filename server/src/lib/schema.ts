import mongoose, { type Document, model, Schema, Types } from "mongoose";

// Types for the schema
export interface IScript {
	slNo: number;
	exchangeType: string;
	segmentType: string;
	scriptName: {
		exchange: string;
		token: string;
		name: string;
	};
	cmp: number;
	buyRate: number;
	quantity: number;
	weightage: number;
	value: number;
	target?: number;
	lastUpdated: Date;
}

export interface IAuthorData {
	id: string;
	name: string;
	email: string;
	isVerified?: boolean;
	authorImage?: string;
	type: string;
	aboutAuthor?: string;
}

export interface IClosedPosition {
	scriptName: {
		exchange: string;
		token: string;
		name: string;
	};
	cmp: number;
	segmentType: string;
	exchangeType: string;
	weightage: number;
	quantity: number;
	buyRate: number;
	value: number;
	investedValue: number;
	profitLoss: number;
	profitLossPercentage: number;
	closedAt: Date;
	remarks: string;
}

export interface IPortfolioPerformanceEntry {
	month: string; // "YYYY-MM"
	value: number;
	returns?: number;
	profitLoss?: number;
}

export interface IPortfolio extends Document {
	authorData: IAuthorData;
	portfolioName: string;
	theme: string;
	methodology: string;
	benchmarkIndex: string;
	investmentHorizon: number; // in months
	reviewFrequency: number; // in months
	minInvestmentAmount: number;
	feeValidity: string; // legacy back-compat mirror of the cheapest plan, e.g. "12 months"
	pricingPlans: { validity: number; price: number }[]; // validity in days
	riskLevel: number;
	fees: number; // legacy back-compat mirror of the cheapest plan's price
	launchDate: Date;
	rationale: string;
	disclosure: string;
	scripts: IScript[];
	closedPositions: IClosedPosition[];
	Commercials: {
		yearlyCharge: number;
		deductionPerSale: number;
		startDate: Date;
		endDate: Date;
		approvedByAdmin: boolean;
	};
	riskMetrics: {
		standardDeviation?: string;
		sharpeRatio?: string;
		maximumDrawdown?: string;
	};
	createdAt: Date;
	updatedAt: Date;
	rebalanceCount: number;
	lastFactsheetSentAt?: Date; // last time the 15-day factsheet was emailed to subscribers
	performanceHistory: IPortfolioPerformanceEntry[];
	tncFileURL: string;
	bannerURL?: string;
	subscribedBy: string[];
	telegramChannelId?: string;
	shareWithMarketplaces: string[];
}

// Schema definition
const ScriptSchema = new Schema<IScript>({
	slNo: { type: Number, required: true },
	exchangeType: { type: String, required: true },
	segmentType: { type: String, required: true },
	scriptName: {
		exchange: { type: String, required: true },
		token: { type: String, required: true },
		name: { type: String, required: true },
	},
	cmp: { type: Number, required: true },
	buyRate: { type: Number, required: true },
	quantity: { type: Number, required: true },
	weightage: { type: Number, required: true },
	value: { type: Number, required: true },
	target: { type: Number, required: false },
	lastUpdated: { type: Date, default: Date.now },
});

const ClosedPositionSchema = new Schema<IClosedPosition>({
	scriptName: {
		exchange: { type: String, required: true },
		token: { type: String, required: true },
		name: { type: String, required: true },
	},
	cmp: { type: Number, required: true },
	segmentType: { type: String, required: true },
	exchangeType: { type: String, required: true },
	weightage: { type: Number, required: true },
	quantity: { type: Number, required: true },
	buyRate: { type: Number, required: true },
	value: { type: Number, required: true },
	investedValue: { type: Number, required: true },
	profitLoss: { type: Number, required: true },
	profitLossPercentage: { type: Number, required: true },
	closedAt: { type: Date, default: Date.now },
	remarks: { type: String, required: false },
});

export const AuthorDataSchema = new Schema({
	id: { type: String, required: true },
	name: { type: String, required: true },
	email: { type: String, required: true },
});

const PortfolioSchema = new Schema<IPortfolio>(
	{
		authorData: AuthorDataSchema,
		portfolioName: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		theme: {
			type: String,
			required: true,
			trim: true,
		},
		methodology: {
			type: String,
			required: true,
			trim: true,
		},
		benchmarkIndex: {
			type: String,
			required: true,
			trim: true,
		},
		investmentHorizon: {
			type: Number,
			required: true,
			min: 1,
		},
		reviewFrequency: {
			type: Number,
			required: true,
			min: 1,
		},
		minInvestmentAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		launchDate: {
			type: Date,
			default: Date.now,
		},
		feeValidity: {
			type: String,
			required: false,
		},
		fees: {
			type: Number,
			required: false,
			min: 0,
		},
		pricingPlans: [
			{
				price: { type: Number, required: true, min: 0 },
				validity: { type: Number, required: true, min: 1, max: 365 }, // days
			},
		],
		rationale: {
			type: String,
			required: true,
		},
		disclosure: {
			type: String,
			required: true,
		},
		riskLevel: {
			type: Number,
			required: true,
			min: 1,
		},
		tncFileURL: { type: String, required: true },
		bannerURL: { type: String, required: true },

		Commercials: {
			yearlyCharge: { type: Number },
			deductionPerSale: { type: Number },
			startDate: { type: Date },
			endDate: { type: Date },
			approvedByAdmin: { type: Boolean, default: false },
		},
		riskMetrics: {
			standardDeviation: { type: String, trim: true, required: false },
			sharpeRatio: { type: String, trim: true, required: false },
			maximumDrawdown: { type: String, trim: true, required: false },
		},
		scripts: [ScriptSchema],
		closedPositions: { type: [ClosedPositionSchema], required: false },
		rebalanceCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		lastFactsheetSentAt: { type: Date, required: false },

		performanceHistory: [
			{
				month: { type: String, required: true }, // "YYYY-MM"
				value: { type: Number, required: true },
				returns: { type: Number },
				profitLoss: { type: Number },
			},
		],
		subscribedBy: [{ type: String }],
		telegramChannelId: { type: String },
		shareWithMarketplaces: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
		],
	},
	{
		timestamps: true,
	},
);

// Create and export the model
export const Portfolio = model<IPortfolio>("Portfolio", PortfolioSchema);
