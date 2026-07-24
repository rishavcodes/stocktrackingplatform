export type SuperUserApprovalDetailsType = {
  _id: string;
  type: string;
  category: string;
  RegName: string;
  companyName?: string;
  name: string;
  email: string;
  number: number;
  DOB: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  description: string;
  certificate: string;
  CompanyCertificate: string;
  regNumber: string;
  profileUrl: string;
  companyLogo: string;
  verified: boolean;
  approved: boolean;
  role: string;
  approvalDate: string;
  customSubdomain?: string | null;
  customSubdomainStatus?: "pending" | "active" | "disabled";
  gst: string;
  telegram?: string;
  website?: string;
  AboutMe?: string;
  PAN?: string;
  aadhar?: string;
  signature?: string;
  disclaimer?: string;
  refundPolicy?: string;
  privacyPolicy?: string;
  investorCharter?: string;
  complianceOfficerName?: string;
  complianceOfficerEmail?: string;
  complianceOfficerNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  wallet: {
    amount: number;
  };
  socials?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    facebook?: string;
  };
  Documents?: { name: string; link: string }[];
  addedby?: {
    isSubProfile?: boolean;
    id?: string;
    companyName?: string;
  };
  stats?: {
    Followers?: string[];
    Following?: string[];
    Subscribers?: string[];
    contentStats?: {
      articles?: number;
      videos?: number;
      podcasts?: number;
      events?: number;
      services?: number;
    };
    eventStats?: {
      upcomingEvents?: number;
      pastEvents?: number;
    };
    serviceStats?: {
      totalPlans?: number;
      totalSubscribers?: number;
      totalLeads?: number;
    };
    recommendationStats?: {
      total?: number;
      open?: number;
      close?: number;
      returnRatio?: number;
      returnPercentage?: number;
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
  currentSubscriptionDetails: {
    _id: string;
    plan: string;
    amount: string;
    gst: string;
    total: string;
    pricingType: "Percentage" | "Fixed";
    status: string;
    duration: number;
    customerLimit: number;
    percentageFreshOnboarding: number;
    percentageRenewal: number;
    fixedFreshOnboardingCharge: number;
    fixedRenewalCharge: number;
    renewalCharge: number;
    freshOnboardingCharge: number;
    remainder: number;
    startDate: string;
    endDate: string;
    invoiceLink: string;
    isExpired: boolean;
    orderdBy: {
      name: string;
      id: string;
      email: string;
    };
    createdAt: string;
    updatedAt: string;
    fixedCommercialFee: string;
  };
  subscriptionDetails: {
    plan: string;
    validity: number;
    price: number;
    gst: number;
    total: number;
    startDate: Date;
    endDate: Date;
    status: string;
    monthlyFee: number;
    percentageSales: number;
    customerLimit: number;
    additionalCustomerCharge: number;
    renewalCharge: number;
    subscriptionActive: boolean;
  };
  services?: {
    recommendations?: boolean;
    paymentGateway?: boolean;
    onboarding?: boolean;
    content?: boolean;
    modelPortfolio?: boolean;
    recurringPayment?: boolean;
  };
  lmsCommercial?: {
    enabled?: boolean;
    commissionPercentage?: number;
  };
  modelPortfolios?: {
    limits: number;
    Portfolios?: any[];
  };
  metadata?: {
    whatsapp?: {
      businessId?: string;
      phoneNumberId?: string;
      wabaId?: string;
      isConnected?: boolean;
      onboardedAt?: string;
    };
  };
  marketplaces?: {
    _id: string;
    name: string;
    slug: string;
    role: "broker" | "member";
  }[];
};

export type WalletTransaction = {
  _id: string;
  serviceProviderId: string;
  orderdBy: {
    name: string;
    id: string;
    email: string;
  };
  paymentId: string;
  orderId: string;
  amount: number;
  type: string;
  remarks?: string;
  createdAt: string;
};

export type Order = {
  _id: string;
  subscribedToId: string;
  serviceName: string;
  orderdBy: {
    name: string;
    id: string;
    email: string;
  };
  soldBy: {
    name: string;
    id: string;
  };
  paymentId?: string;
  orderId?: string;
  amount?: number;
  subtotal?: number;
  gst?: number;
  total?: number;
  paymentMethod: string;
  isExpired: boolean;
  validity: string;
  type?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  isRenewal?: boolean;
  createdAt: string;
};

export type RazorpayKey = {
  _id: string;
  keyId: string;
  name?: string;
  email?: string;
  createdAt: string;
};

export type ProviderBillingData = {
  walletTransactions: WalletTransaction[];
  orders: Order[];
  razorpayKey: RazorpayKey | null;
};

export type ProviderAnalyticsData = {
  services: {
    total: number;
    totalSubscribers: number;
    list: { _id: string; title: string; subscribedBy: string[]; orders: string[] }[];
  };
  recommendations: {
    total: number;
    open: number;
    closed: number;
  };
  packages: {
    total: number;
    totalPurchases: number;
    list: { _id: string; title: string; stats: { purchases: number }; pricingPlans: { price: number; validity: number }[] }[];
  };
  events: {
    total: number;
    totalRegistrations: number;
    list: { _id: string; title: string; registrations: number }[];
  };
  articles: {
    total: number;
  };
};
