import NextAuth from "next-auth";

export type userType = {
  _id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  number: number;
  role: string;
  telegram?: string;
  profileUrl?: string;

  dob?: string;
  gender?: string;
  pannumber?: string;
  aadhaarLast4?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  telegramUserId?: string;

  enrolledCourses?: string[];

  createdAt: string;
  updatedAt: string;
};



export interface eventType {
  _id: string;
  authorData: {
    id: string;
    name: string;
    type: string;
    authorImage: string;
  };
  couponCode?: {
    code: string;
    discount: number;
    validUntil: string;
  };
  title: string;
  category: string[];
  schedule: string;
  link?: string;
  location?: string;
  image: string;
  description: string;
  disclaimer: string;
  eventEmail: string;
  eventType: string;
  language: string;
  registeredUsers: string[];
  NoOfRegistration?: number;
  eventCostType: string;
  price: number;
  approvalStatus: boolean;
  targetAudience: "user" | "provider";
  createdAt: string;
  updatedAt: string;
  type: string;
}
export interface serviceType {
  _id: string;
  authorData: {
    id: string;
    name: string;
    authorImage: string;
    type: string;
  };
  title: string;
  description: string;
  tncFileURL: string;
  serviceType: "normal" | "fund";
  segment: string;
  validity: number;
  price: number;
  pricingPlans: PricingPlan[];
  faqs: FAQ[];
  couponCode: CouponCode;
  activated: boolean;
  AUM: number;
  NoOfClients: number;
  inceptionDate: string;
  Fundmanager: string;
  returnsByTime: number[];
  AsOn: string;
  isFreeTrial: boolean;
  freeTrailDays: number;
  trailAvailedBy: string[];
  subscribedBy: string[];
  orders: string[];
  Documents: Document[];
  keyFeatures: string[];
  bonusFeatures: string[];
  approvalStatus: boolean;
  telegramChannelId: string;
  telegramChannelAccessHash: string;
  bannerURL: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingPlan {
  _id: string;
  name: string;
  price: number;
  validity: number;
  features: string[];
}

interface FAQ {
  _id: string;
  question: string;
  answer: string;
}

interface CouponCode {
  code: string;
  discount: number;
  validUntil: string;
}

interface Document {
  name: string;
  link: string;
}
interface AddedBy {
  isSubProfile: boolean;
  id: string;
  companyName: string;
}

export type BrokerSessionPayload = {
  brokerType: string;
  clientCode: string;
  accessToken: string;
  expiresAt: number;
};

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    brokerSession?: BrokerSessionPayload | null;
    isImpersonation?: boolean;
    impersonatedBy?: string;
    user: {
      id: string;
      role: string;
      type: "user" | "provider" | "admin";
      backendToken?: string;
      pannumber?: string;
      addedby?: AddedBy;
      customSubdomain?: string | null;
      customSubdomainStatus?: "pending" | "active" | "disabled" | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    _id: string;
    role: string;
    type: "user" | "provider" | "admin";
    backendToken: string;
    addedby?: AddedBy;
    customSubdomain?: string | null;
    customSubdomainStatus?: "pending" | "active" | "disabled" | null;
    isImpersonation?: boolean;
    impersonatedBy?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    brokerSession?: BrokerSessionPayload | null;
    id?: string;
    role?: string;
    type?: "user" | "provider" | "admin";
    pannumber?: string;
    addedby?: AddedBy;
    customSubdomain?: string | null;
    customSubdomainStatus?: "pending" | "active" | "disabled" | null;
    isImpersonation?: boolean;
    impersonatedBy?: string;
  }
}

type aadhaar = {
  client_id: string;
  full_name: string;
  aadhaar_number: string;
  dob: Date;
  gender: "M" | "F" | "O";
  address: {
    country: string;
    dist: string;
    state: string;
    po?: string; // Optional
    loc?: string; // Optional
    vtc?: string; // Optional
    subdist?: string; // Optional
    street?: string; // Optional
    house?: string; // Optional
    landmark?: string; // Optional
  };
  face_status: boolean;
  face_score?: number; // Optional
  zip?: string; // Optional
  profile_image?: string; // Optional
}

export interface portfolioType {
  _id: string;
  authorData: {
    id: string;
    name: string;
    authorImage: string;
    type: string;
  };
  portfolioName: string;
  theme: string;
  methodology: string;
  benchmarkIndex: string;
  investmentHorizon: number;
  reviewFrequency: number;
  minInvestmentAmount: number;
  launchDate: string;
  feeValidity: string;
  fees: number;
  rationale: string;
  disclosure: string;
  riskLevel: number;
  tncFileURL: string;
  bannerURL: string;
  Commercials?: {
    yearlyCharge?: number;
    deductionPerSale?: number;
    startDate?: Date;
    endDate?: Date;
    approvedByAdmin?: boolean;
  };
  riskMetrics?: {
    standardDeviation?: string;
    sharpeRatio?: string;
    maximumDrawdown?: string;
  };
  scripts: any[];
  closedPositions: any[];
  rebalanceCount: number;
  rebalanceHistory?: Array<{
    date: string | Date;
    added: { name: string; quantity: number }[];
    removed: { name: string; quantity: number }[];
    changed: { name: string; from: number; to: number }[];
    closed: { name: string }[];
  }>;
  performanceHistory: Array<{
    month: string;
    value: number;
    returns?: number;
    profitLoss?: number;
  }>;
  subscribedBy: string[];
  telegramChannelId?: string;
  createdAt: string;
  updatedAt: string;
}

type authorDataType = {
  id: string;
  name: string;
  email: string;
  type: string;
  authorImage: string;
  aboutAuthor: string;
};

type articleType = {
  authorData: authorDataType;
  title: string;
  category: string[];
  content: string;
  disclaimer: string;
  image: string;
  language: string;
  hasArticlePDF: boolean;
  schedule: string;
  _id: string;
  articleLink: string;
  likes: number;
};

type videoType = {
  authorData: authorDataType;
  videoStats: {
    likes: number;
    views: number;
  };
  title: string;
  category: string[];
  description: string;
  videoID: string;
  language: string;
  image: string;
  link: string;
  schedule: string;
  profileUrl: string;
  _id: string;
  createdAt: string;
};

type podcastType = {
  authorData: authorDataType;
  title: string;
  category: string[];
  image: string;
  description: string;
  link: string;
  language: string;
  videoID: string;
  schedule: string;
  _id: string;
  type: string;
  createdAt: string;
}[];

type eventType = {
  authorData: authorDataType;
  title: string;
  category: string[];
  description: string;
  link: string;
  image: string;
  language: string;
  location: string;
  schedule: string;
  _id: string;
  type: string;
  eventType: string;
  eventEmail: string;
  createdAt: string;
  price: number;
  aboutAuthor: string;
  NoOfRegistration: number;
  approvalStatus: boolean;
};

type notificationDataType = {
  _id?: string;
  message: string;
  sentBy: string;
  sendTo: string;
  createdAt?: string;
};

type OurServicesType = {
  _id: string;
  title: string;
  authorData: authorDataType;
  serviceType: string;
  description: string;
  disclaimer: string;
  validity: number;
  price?: number;
  faqs: { question: string; answer: string }[];
  coupon?: number;
  pricingPlans: {
    validity: number;
    price: number;
    purchaseType?: "ONE_TIME" | "RENEWABLE";
  }[];
  AUM?: number;
  NoOfClients?: number;
  inceptionDate?: string;
  Fundmanager?: string;
  returnsByTime?: number[];
  activated: boolean;
  AsOn?: string;
  createdAt: string;
  isFreeTrial: boolean;
  tradeboxPlanPaid: boolean;
  freeTrailDays: number;
  trailAvailedBy: string[];
  tncFile: string;
  subscribedBy?: string[];
  segment: string;
  keyFeatures: string[];
  bonusFeatures: string[];
  approvalStatus: boolean;
  bannerURL: string;
  telegramChannelId: string;
  tncFileURL: string;
  Documents: string[];
  shareWithMarketplaces: string[];
  purchaseType?: "ONE_TIME" | "RENEWABLE";
  callsQuota?: number | null;
  callsPeriod?: "DAY" | "WEEK" | "MONTH" | null;
  // Set when this service is shown because it's included in a purchased package
  // (not bought directly). Used to resolve the package's order for expiry/status.
  sourcePackageId?: string;
  sourcePackageTitle?: string;
};

type ScoreCardTypes = {
  _id: string;
  authorData: authorDataType;
  exchange: string;
  scriptname: string;
  entryPrice: number;
  entryType: string;
  rate?: number;
  target: number;
  token: string;
  stoploss: number;
  ltp?: number;
  validity: string;
  pnl?: number;
  pnlpercentage?: string;
  status?: string;
  result?: string;
  upperRange?: number;
  lowerRange?: number;
  istriggered?: string;
  rateRange?: string;
  exitRate?: string;
  holdingPeriod: string;
  exitDate?: string;
  createdAt: string;
  shareWith?: string[];
  shareWithPlans?: string[];
  // recommendationPDF: string;
};


export type AuthMode = "learning" | "kyc";

export type PanData = {
  data: {
    pan_number: string;
    full_name: string;
    masked_aadhaar: string;
    gender: string;
    dob: string;
    status: string;
  };
  success: boolean;
};
