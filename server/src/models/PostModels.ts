import mongoose from "mongoose";

export const AuthorDataSchema = new mongoose.Schema({
	id: { type: String, required: true },
	name: { type: String, required: true },
	email: { type: String, required: true },
	isVerified: { type: Boolean, default: true },
	authorImage: { type: String },
	type: { type: String, required: true },
	aboutAuthor: { type: String },
});

export const couponSchema = new mongoose.Schema(
  {
    authorData: AuthorDataSchema,

    code: { type: String, required: true, unique: true },
    description: { type: String, default: "" },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discount: { type: Number, required: true },

    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },

    usageLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    perCustomerLimit: { type: Number, default: 1 },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    // Legacy "whole plan / whole package" targeting. Kept so older coupons
    // (which only stored these arrays) continue to validate at checkout.
    // New coupons populate the *Validities arrays below instead.
    serviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "services",
      },
    ],
    packageIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        // PackageModel is registered as "Packages" (plural). Using the wrong
        // ref name makes populate() silently return raw ObjectIds.
        ref: "Packages",
      },
    ],

    // Validity-level targeting. Each row says "this coupon applies to this
    // (plan, validity-in-days) tier". To target multiple tiers of the same
    // plan, add multiple rows.
    serviceValidities: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "services",
          required: true,
        },
        validity: { type: Number, required: true },
        _id: false,
      },
    ],
    packageValidities: [
      {
        packageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Packages",
          required: true,
        },
        validity: { type: Number, required: true },
        _id: false,
      },
    ],

    couponType: {
      type: String,
      enum: ["event", "plans", "packages"],
      default: "plans",
    },
  },
  { timestamps: true }
);


const ArticleSchema = new mongoose.Schema(
	{
		authorData: AuthorDataSchema,
		title: { type: String, required: true },
		category: [{ type: String, required: true }],
		content: { type: String },
		Countlike: { type: Number },
		image: { type: String, default: "" },
		schedule: { type: String, required: true },
		articlePDF: { type: String, default: "" },
		articleLink: { type: String },
		language: { type: String, default: "english" },
		shareWith: [{ type: String, default: ["none"] }],
		shareWithPlans: [{ type: String }],
		shareWithMarketplaces: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
		],
	},
	{ timestamps: true },
);

const VideoSchema = new mongoose.Schema(
	{
		authorData: AuthorDataSchema,
		title: { type: String, required: true },
		category: [{ type: String, required: true }],
		description: { type: String, required: true },
		disclaimer: { type: String, required: true },
		videoID: { type: String },
		image: { type: String, default: "" },
		schedule: { type: String, required: true },
		link: { type: String, required: true },
		videoStats: { likes: { type: Number }, views: { type: Number } },
		language: { type: String, default: "english" },
	},
	{ timestamps: true },
);

const PodcastSchema = new mongoose.Schema(
	{
		authorData: AuthorDataSchema,
		title: { type: String, required: true },
		category: [{ type: String, required: true }],
		image: { type: String, required: true },
		schedule: { type: String, required: true },
		link: { type: String, required: true },
		description: { type: String, required: true },
		disclaimer: { type: String, required: true },
		language: { type: String, default: "english" },
		videoID: { type: String },
	},
	{ timestamps: true },
);

const EventSchema = new mongoose.Schema(
	{
		authorData: AuthorDataSchema,
		title: { type: String, required: true },
		category: [{ type: String, required: true }],
		schedule: { type: Date, required: true },
		link: { type: String },
		location: { type: String },
		image: { type: String },
		description: { type: String, required: true },
		// Disclaimer is optional — providers can publish events without one.
		disclaimer: { type: String },
		eventEmail: { type: String, required: true },
		eventType: { type: String, required: true },
		language: { type: String, default: "english" },
		// DEPRECATED: use EventRegistrationModel instead. Kept for backward compat during migration.
		registeredUsers: [
			{
				userId: { type: String },
				registrationDate: { type: Date, default: Date.now },
				eventMode: { type: String, enum: ["online", "offline"] },
			},
		], 
		NoOfRegistration: { type: Number, default: 0 },
		reminderSent: { type: [Number], default: [] },
		eventCostType: { type: String, required: true },
		price: { type: Number, required: true },
		approvalStatus: { type: Boolean, default: true },
		targetAudience: {
			type: String,
			enum: ["user", "provider"],
			required: true,
		},
		shareWithMarketplaces: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
		],
	},
	{ timestamps: true },
);

const PricingPlanSchema = new mongoose.Schema({
	validity: { type: Number, required: true },
	price: { type: Number, required: true },
	/** Per-tier: one-time vs renewable (defaults for legacy docs without this field) */
	purchaseType: {
		type: String,
		enum: ["ONE_TIME", "RENEWABLE"],
		default: "RENEWABLE",
	},
});

const FAQSchema = new mongoose.Schema({
	question: {
		type: String,
	},
	answer: {
		type: String,
	},
});

const ServiceSchema = new mongoose.Schema(
  {
    authorData: AuthorDataSchema,
    title: { type: String, required: true },
    description: { type: String, required: true },
    tncFileURL: { type: String, required: true },
    serviceType: { type: String, enum: ["normal", "fund"], required: true },
    segment: {
      type: String,
      required: true,
    },
    validity: { type: Number },
    price: { type: Number },
    pricingPlans: [PricingPlanSchema],
    faqs: [FAQSchema],
    activated: { type: Boolean, default: true },
    AUM: { type: Number },
    NoOfClients: { type: Number },
    inceptionDate: { type: String },
    Fundmanager: { type: String },
    returnsByTime: [{ type: Number }],
    AsOn: { type: String },
    isFreeTrial: { type: Boolean },
    freeTrailDays: { type: Number },
    trailAvailedBy: [{ type: String }],
    subscribedBy: [{ type: String }],
    orders: [{ type: String }],
    Documents: [{ name: { type: String }, link: { type: String } }],
    keyFeatures: [{ type: String }],
    bonusFeatures: [{ type: String }],
    approvalStatus: { type: Boolean, default: false },
    telegramChannelId: { type: String },
    telegramChannelAccessHash: {
      type: String, // Since access hash is usually a large number, store it as a string
    },
    bannerURL: { type: String },
    shareWithMarketplaces: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
    ],
    purchaseType: {
      type: String,
      enum: ["ONE_TIME", "RENEWABLE"],
      default: "RENEWABLE",
    },
    /** Per-plan toggle: whether SP wants to enable UPI Auto-Pay recurring payment for this plan */
    allowRecurringPayment: { type: Boolean, default: false },
    /** Provider commitment: e.g. 5 calls per DAY / WEEK / MONTH */
    callsQuota: { type: Number, min: 0, default: null },
    callsPeriod: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const EventRegistrationSchema = new mongoose.Schema(
	{
		eventId: { type: mongoose.Schema.Types.ObjectId, ref: "events", required: true },
		userId: { type: String, required: true },
		userName: { type: String },
		userEmail: { type: String },
		eventMode: { type: String, enum: ["online", "offline"], required: true },
	},
	{ timestamps: true },
);

EventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventRegistrationSchema.index({ userId: 1 });
EventRegistrationSchema.index({ eventId: 1, createdAt: -1 });

export const ArticleModel = mongoose.model("Articles", ArticleSchema);
export const VideoModel = mongoose.model("videos", VideoSchema);
export const PodcastModel = mongoose.model("podcasts", PodcastSchema);
export const EventModel = mongoose.model("events", EventSchema);
export const EventRegistrationModel = mongoose.model("eventregistrations", EventRegistrationSchema);
export const ServiceModel = mongoose.model("services", ServiceSchema);
export const CouponModel = mongoose.model("Coupons", couponSchema);
