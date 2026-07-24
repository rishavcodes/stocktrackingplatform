// app/marketplace/[id]/components/types.ts

export interface Marketplace {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  brokerSnapshot: {
    name: string;
    email: string;
    profileUrl?: string;
  };
  activeRaIds: RA[];
  createdAt: string;
  updatedAt: string;
}

export interface RA {
  _id: string;
  name?: string;
  RegName?: string;
  companyName?: string;
  email?: string;
  city?: string;
  state?: string;
  regNumber?: string;
  profileUrl?: string;
  verified?: boolean;
  category?: string;
  type?: string;
  AboutMe?: string;
  description?: string;
  stats?: {
    Followers?: string[];
    Following?: string[];
    Subscribers?: string[];
    contentStats?: {
      articles?: number;
      experience:number;
      videos?: number;
      podcasts?: number;
      events?: number;
      services?: number;
    };
    recommendationStats?: {
      total?: number;
      open?: number;
      close?: number;
      returnPercentage?: number;
      returnRatio?: number;
    };
    modelPortfolioStates?: {
      totalPortfolios?: number;
      activePortfolios?: number;
      closedPortfolios?: number;
      totalSubscribers?: number;
      avgReturnPercentage?: number;
      avgRiskLevel?: number;
    };
    courseStates?: {
      totalCourses?: number;
      publishedCourses?: number;
      draftCourses?: number;
      totalEnrollments?: number;
      totalRevenue?: number;
    };
  };
}

export interface Recommendation {
  _id: string;
  authorData: {
    id: string;
    name: string;
    email: string;
    authorImage?: string;
    type?: string;
  };
  exchange: string;
  scriptname: string;
  token: string;
  entryPrice: number;
  entryType: string;
  target: number;
  stoploss: number;
  validity: string;
  status: string;
  result: string;
  createdAt: string;
  pnlpercentage?: any;
  percentageChange?: number;
  pnl?: any;
  istriggered?: any;
  lotsize?:any;
  riskRewardRatio?: any;
  ltp?: any;
}

export interface Portfolio {
  _id: string;
  authorData: {
    id: string;
    name: string;
    email: string;
    authorImage:string;
    isVerified:string;
  };
  portfolioName: string;
  theme: string;
  methodology: string;
  benchmarkIndex: string;
  investmentHorizon: number;
  riskLevel: number;
  fees: number;
  bannerURL?: string;
  minInvestmentAmount: number;
  createdAt: string;
  scripts: string;
  reviewFrequency:string;
  rebalanceCount:string;
  Commercials: {
    
  endDate: string;
  };
  feeValidity:string;
  launchDate:string;
}

export interface Service {
  _id: string;
  authorData: {
    id: string;
    authorImage: string;
    name: string;
    email: string;
    isVerified: boolean | string; // Change to boolean if possible
  };
  title: string;
  description: string;
  
  // These should be arrays, not strings
  pricingPlans: any[] | string; // Ideally { price: number; validity: number; }[]
  keyFeatures: string[] | string;
  bonusFeatures: string[] | string;
  
  freeTrailDays: number | string;
  serviceType: string;
  isFreeTrial: boolean | string;
  segment: string;
  price?: number;
  validity?: number;
  bannerURL?: string;
  NoOfClients?: number;
  createdAt: string;
}

export interface Article {
  _id: string;
  authorData: {
    id: string;
    name: string;
    email: string;
    authorImage:string;
  };
  title: string;
  content: string;
  category: string[];
  image?: string;
  schedule: string;
  createdAt: string;
  articleLink :string;
  hasArticlePDF: boolean;
}

export interface Event {
  _id: string;
  authorData: {
    id: string;
    name: string;
    email: string;
  };
  title: string;
  description: string;
  category: string[];
  schedule: string;
  location?: string;
  image?: string;
  eventType: string;
  price: number;
  NoOfRegistration: number;
  createdAt: string;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type TabType =
  | "about"
  | "ra"
  | "recommendations"
  | "portfolio"
  | "services"
  | "articles"
  | "events"
  | "algo_strategies"
  | "lms";

export interface TabData {
  [key: string]: {
    data: any[];
    pagination?: PaginationData;
    loading: boolean;
  };
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
