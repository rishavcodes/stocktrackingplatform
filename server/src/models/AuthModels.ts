import mongoose, { model, Schema } from "mongoose";
import { RazorpayKeyModel } from "./IntegrationModels";

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "bigul",
  "marketplace",
  "dashboard",
  "static",
  "cdn",
  "assets",
  "mail",
  "ftp",
  "tradebox",
  "tradeboxlive",
]);

export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

const ServicesAndOrders = new mongoose.Schema({
  services: [{ type: String }],
  orders: [{ type: String }],
});

const ServiceProviderContentStats = new mongoose.Schema(
  {
    articles: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    podcasts: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    services: { type: Number, default: 0 },
  },
  { _id: false }
);

// Events Stats Schema
const ServiceProviderEventStats = new mongoose.Schema(
  {
    upcomingEvents: { type: Number, default: 0 },
    pastEvents: { type: Number, default: 0 },
  },
  { _id: false }
);

// Services Stats Schema
const ServiceProviderServiceStats = new mongoose.Schema(
  {
    totalPlans: { type: Number, default: 0 },
    totalSubscribers: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
  },
  { _id: false }
);

// Recommendations Stats Schema
const ServiceProviderRecommendationStats = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    open: { type: Number, default: 0 },
    close: { type: Number, default: 0 },
    returnRatio: { type: Number, default: 0 },
    returnPercentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const ServiceProviderCourseStats = new mongoose.Schema(
  {
    totalCourses: { type: Number, default: 0 },
    publishedCourses: { type: Number, default: 0 },
    draftCourses: { type: Number, default: 0 },

    totalEnrollments: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { _id: false }
);

const ServiceProviderModelPortfolioStats = new mongoose.Schema(
  {
    totalPortfolios: { type: Number, default: 0 },
    activePortfolios: { type: Number, default: 0 },
    closedPortfolios: { type: Number, default: 0 },

    totalSubscribers: { type: Number, default: 0 },

    avgReturnPercentage: { type: Number, default: 0 },
    avgRiskLevel: { type: Number, default: 0 },
  },
  { _id: false }
);


const ServiceProviderStatsModel = new mongoose.Schema(
  {
    Followers: [{ type: String }],
    Following: [{ type: String, ref: "serviceproviders" }],
    Subscribers: [{ type: String }],

    contentStats: ServiceProviderContentStats,
    eventStats: ServiceProviderEventStats,
    serviceStats: ServiceProviderServiceStats,
    recommendationStats: ServiceProviderRecommendationStats,

    modelPortfolioStates: ServiceProviderModelPortfolioStats,
    courseStates: ServiceProviderCourseStats,
  },
  { _id: false }
);


const socialsSchema = new mongoose.Schema(
  {
    instagram: { type: String },
    twitter: { type: String },
    youtube: { type: String },
    linkedin: { type: String },
    facebook: { type: String },
  },
  { _id: false }
);

// Permissions block on a sub profile — only honoured when subProfileRole === "user".
// Master sub profile creation flow ticks these checkboxes; sidebar + middleware +
// API guards all read them through resolvePermissions() so a single source decides
// what a user-role sub can see / do.
const subProfilePermissionsSchema = new mongoose.Schema(
  {
    profile:        { type: Boolean, default: false },
    wallet:         { type: Boolean, default: false },
    recommendation: { type: Boolean, default: false },
    services:       { type: Boolean, default: false },
    portfolios:     { type: Boolean, default: false },
    articles:       { type: Boolean, default: false },
    events:         { type: Boolean, default: false },
    leads:          { type: Boolean, default: false },
    marketplace:    { type: Boolean, default: false },
    billing:        { type: Boolean, default: false },
  },
  { _id: false }
);

const addedBySchema = new mongoose.Schema(
  {
    isSubProfile: { type: Boolean, default: false },
    id: { type: String, default: "" },
    companyName: { type: String, default: "" },
    // NEW — distinguishes the two seat types created by a Non Individual master.
    // Existing sub profile docs (created before this feature) have no value here;
    // resolvePermissions() treats `undefined` as legacy / full access for back-compat.
    subProfileRole: { type: String, enum: ["admin", "user"], default: undefined },
    permissions: { type: subProfilePermissionsSchema, default: undefined },
  },
  { _id: false }
);

const AadhaarSchema = new mongoose.Schema({
  client_id: { type: String, required: true },
  full_name: { type: String, required: true },
  aadhaar_number: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String, enum: ["M", "F", "O"], required: true },
  address: {
    country: { type: String, required: true },
    dist: { type: String, required: true },
    state: { type: String, required: true },
    po: { type: String },
    loc: { type: String },
    vtc: { type: String },
    subdist: { type: String },
    street: { type: String },
    house: { type: String },
    landmark: { type: String },
  },
  face_status: { type: Boolean, required: true },
  face_score: { type: Number },
  zip: { type: String },
  profile_image: { type: String },
});

const WalletSchema = new mongoose.Schema({
  amount: { type: Number, default: 0 }, // Total balance
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }], // List of transaction IDs
});

const SubscriptionSchema = new mongoose.Schema({
  subscriptionActive: { type: Boolean },
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TradeboxPlans", // Replace with the actual model name if different
  },
});

const servicesSchema = new mongoose.Schema({
  recommendations: { type: Boolean, default: false },
  paymentGateway: { type: Boolean, default: false },
  onboarding: { type: Boolean, default: false },
  content: { type: Boolean, default: false },
  modelPortfolio: { type: Boolean, default: false },
  recurringPayment: { type: Boolean, default: false },
  integration: {
    type: String,
    enum: ["razorpay", "cashfree"],
    default: "razorpay",
  },
});

const whatsappSchema = new mongoose.Schema({
  businessId: { type: String },
  phoneNumberId: { type: String },
  wabaId: { type: String },
  isConnected: { type: Boolean, default: false },
  onboardedAt: { type: Date, default: Date.now },
});

const ServiceProviderRegSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Individual", "Non Individual", "sub profile"],
    },
    category: {
      type: String,
      enum: ["Research Analyst", "Broker", "PMS", "AIF"],
    },
    RegName: { type: String },
    companyName: { type: String },
    name: { type: String },
    telegram: { type: String },
    email: { type: String, required: true },
    password: { type: String },
    number: { type: Number, required: true },
    DOB: { type: Date },
    address1: { type: String },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    disclaimer: { type: String },
    gst: { type: String },
    hsnCode: { type: String },
    website: { type: String },
    refundPolicy: { type: String },
    privacyPolicy: { type: String },
    investorCharter: { type: String },
    description: { type: String },
    certificate: { type: String },
    CompanyCertificate: { type: String },
    regNumber: { type: String, required: true },
    role: { type: String, enum: ["provider"], default: "provider" },
    verified: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    approvalDate: { type: String },
    stats: ServiceProviderStatsModel,
    addedby: addedBySchema,
    profileUrl: { type: String },
    companyLogo: { type: String },
    customSubdomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: (v: string) =>
          !v ||
          (SUBDOMAIN_REGEX.test(v) && !RESERVED_SUBDOMAINS.has(v)),
        message: "Invalid subdomain",
      },
    },
    customSubdomainStatus: {
      type: String,
      enum: ["pending", "active", "disabled"],
      default: "pending",
    },
    aadhar: { type: String },
    PAN: { type: String },
    AboutMe: { type: String, default: "" },
    accessToken: { type: String },
    socials: socialsSchema,
    notifications: [{ type: String }],
    ServicesAndOrders: ServicesAndOrders,
    wallet: { type: WalletSchema, default: () => ({}) },
    Documents: [{ name: { type: String }, link: { type: String } }],
    paymentDetails: { type: String, ref: "paymentdetails" },
    emailSettings: { type: Schema.Types.ObjectId, ref: "EmailSettings" },
    subscriptionDetails: { type: SubscriptionSchema },
    complianceOfficerName: { type: String },
    complianceOfficerEmail: { type: String },
    complianceOfficerNumber: { type: String },
    modelPortfolios: {
      limits: { type: Number, default: 50 },
      Portfolios: { type: Array, default: [] },
    },
    signature: { type: String },
    razorpayKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RazorpayKeys",
    },
    cashfreeKey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CashfreeKeys",
    },
    services: {
      type: servicesSchema,
      default: () => ({}), // ensures default all `false`
    },
    lmsCommercial: {
      enabled: {
        type: Boolean,
        default: false,
      },
      commissionPercentage: {
        type: Number,
        default: 0, // % cut per course sale
        min: 0,
        max: 100,
      },
      updatedAt: {
        type: Date,
      },
    },
    metadata: {
      whatsapp: whatsappSchema,
    },
    // See UserSchema.lastSeenAt — kept here for symmetry / future SP presence.
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

const EmailSettingsSchema = new mongoose.Schema(
  {
    whitelabelEmail: {
      type: String,
      required: true,
    },
    whitelabelPassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UserOTPSchema = new mongoose.Schema({
  email: { type: String },
  number: { type: Number },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
  key: { type: String },
  createdAt: { type: Date, required: true },
  expiredAt: { type: Date, expires: 600 },
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    number: { type: Number, required: true },
    telegram: { type: String },
    // password: { type: String, required: true },
    role: { type: String, default: "user" },
    profileUrl: { type: String },
    stats: ServiceProviderStatsModel,
    notifications: [{ type: String }],
    ServicesAndOrders: ServicesAndOrders,
    telegramUserId: { type: String },
    dob: { type: String },
    pannumber: { type: String },
    gender: { type: String },
    aadhaarLast4: { type: String },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    linkedBrokers: [
      {
        brokerType: { type: String, enum: ["bigul", "aliceblue"] },
        clientCode: { type: String },
        linkedAt: { type: Date, default: Date.now },
      },
    ],
    // Updated (throttled) by the auth middleware on each authenticated request.
    // Powers the "currently logged in" indicator on the service-provider
    // dashboards (online = lastSeenAt within ONLINE_WINDOW_MS).
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String },
    role: {
      type: String,
      enum: ["super_admin", "admin", "sub_admin"],
      default: "admin",
    },
    profileUrl: { type: String },
    backendToken: [{ type: String }],
    notifications: [{ type: String }],
    number: { type: Number, required: true },
    permissions: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // See UserSchema.lastSeenAt — kept here for symmetry / future admin presence.
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

export const userOTPModel = mongoose.model("OTPs", UserOTPSchema);

export const ServiceProviderRegModel = mongoose.model(
  "serviceproviders",
  ServiceProviderRegSchema
);

export const UserModel = mongoose.model("Users", UserSchema);

export const AdminModel = mongoose.model("Admins", AdminSchema);

export const EmailSettingModel = mongoose.model(
  "EmailSetting",
  EmailSettingsSchema
);
