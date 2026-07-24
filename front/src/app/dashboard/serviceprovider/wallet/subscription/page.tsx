"use client"
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

interface SubscriptionDetails {
  amount: number;
  billingCycle: {
    lastBillingDate: string;
    nextBillingDate: string;
  };
  createdAt: string;
  duration: number;
  endDate: string;
  fixedFreshOnboardingCharge: number;
  fixedRenewalCharge: number;
  gst: number;
  invoiceLink: string;
  isExpired: boolean;
  oneTimesetupFee: number;
  percentageFreshOnboarding: number;
  percentageRenewal: number;
  orderdBy: {
    name: string;
    id: string;
    email: string;
  };
  plan: string;
  pricingType: string;
  remainder: number;
  startDate: string;
  status: string;
  total: number;
  updatedAt: string;
  _id: string;
}

interface SubscriptionResponse {
  success: boolean;
  isActive: boolean;
  subscriptionDetails: SubscriptionDetails;
}


const Home = () => {
  const session = useSession();

  const { data } = useSWR<SubscriptionResponse>(
    session?.data?.user?._id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/subscription-details?userId=${session.data.user._id}`
      : null,
    fetcher
  );

  if (!data || !data.success || !data.isActive) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center m-4">
        <h2 className="text-xl font-semibold text-gray-700">No Active Subscription</h2>
        <p className="text-gray-500 mt-2">You currently do not have any active subscription.</p>
      </div>
    );
  }

  const sub = data.subscriptionDetails;


  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl" data-name="subscription-card">
      {/* Header with Gradient */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{sub.plan} Plan</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                {sub.pricingType} Pricing
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${sub.status.toLowerCase() === 'active'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                  : sub.status.toLowerCase() === 'expired'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                {sub.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {sub.total}
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">/year</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sub.duration} year duration
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Subscription Period */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Subscription Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-300">Start Date</div>
              <div className="font-medium dark:text-white">
                {new Date(sub.startDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-300">End Date</div>
              <div className="font-medium dark:text-white">
                {new Date(sub.endDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Charges Breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Charges Breakdown
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3 border border-gray-100 dark:border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Base Amount</span>
              <span className="font-medium dark:text-white">{sub.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">GST</span>
              <span className="font-medium dark:text-white">{sub.gst}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 my-2"></div>
            <div className="flex justify-between items-center font-semibold text-lg text-blue-600 dark:text-blue-400">
              <span>Total Amount</span>
              <span>{sub.total}</span>
            </div>
          </div>
        </div>

        {/* Onboarding Charges */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Onboarding Charges
          </h3>
          {sub.pricingType === "Fixed" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">Fixed Fresh Onboarding</div>
                <div className="font-medium dark:text-white">{sub.fixedFreshOnboardingCharge}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">Fixed Renewal Charge</div>
                <div className="font-medium dark:text-white">{sub.fixedRenewalCharge}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">% Fresh Onboarding</div>
                <div className="font-medium dark:text-white">{sub.percentageFreshOnboarding}%</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="text-sm text-gray-600 dark:text-gray-300">% Renewal Charge</div>
                <div className="font-medium dark:text-white">{sub.percentageRenewal}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Download */}
        {sub.invoiceLink && (
          <div className="flex justify-end">
            <a
              href={sub.invoiceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Invoice
            </a>
          </div>
        )}
      </div>
    </div>
  );
};


export default Home;
