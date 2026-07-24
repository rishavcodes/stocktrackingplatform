"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButtons from "@/app/view/services/ActionButtons";
import InfoCard from "@/app/view/services/InfoCard";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import FAQSection from "@/components/faq/faq";
import PricingSection from "@/components/service-page/PricingSection";
import { FiAlertTriangle, FiCheckCircle, FiChevronDown, FiChevronUp, FiDollarSign, FiGift, FiHelpCircle, FiInfo, FiMail, FiMapPin, FiPhone, FiShield, FiStar, FiUser, FiX } from "react-icons/fi";
import { formatCallQuotaLabel } from "@/lib/formatCallQuota";


type OurServicesTypeWithIndex = OurServicesType & {
  [key: string]: string | number | undefined;
};
type SPType = {
  [key: string]: string;
};

export default function ServicePageNormal({ data, marketplaceSlug }: { data: any; marketplaceSlug?: string }) {
  const session = useSession();
  const { toast } = useToast();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [spData, setSpData] = useState<SPType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTncModalOpen, setIsTncModalOpen] = useState(false);
  // const [esignCompleted, setEsignCompleted] = useState(false);

  const toggleContent = () => {
    setShowFullContent(!showFullContent);
  };

  const fetchSpData = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
      );

      if (res.status === 200) {
        const response = await res.json();
        setSpData(response.data);
        // console.log("provider data", response.data)
      } else {
        setError("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // const searchParams = useSearchParams();
  // const dispatch = useDispatch();

  // useEffect(() => {
  //   const esignStatus = searchParams.get("esign");
  //   if (esignStatus !== "success") return;
  //   if (!session.data?.user?.id) return;

  //   (async () => {
  //     try {
  //       const res = await fetch(
  //         `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/session?serviceId=${data._id}&userId=${session.data.user.id}`
  //       );

  //       if (!res.ok) throw new Error();

  //       const { signedDocURL } = await res.json();

  //       dispatch(
  //         setStepData({
  //           step: "step2Data",
  //           data: {
  //             signedDocURL,
  //             isEsignCompleted: true,
  //           },
  //         })
  //       );
  //     } catch (err) {
  //       console.error("Failed to resume eSign", err);
  //     }
  //   })();
  // }, [searchParams, session.data?.user?.id]);

  // Default Tradebox FAQs — shown when the service provider hasn't configured any.
  const DEFAULT_TRADEBOX_FAQS: { question: string; answer: string }[] = [
    {
      question: "How will I receive trade calls / recommendations?",
      answer:
        "All recommendations are sent through your Tradebox account and Telegram channel (where applicable) as soon as they are published by the analyst.",
    },
    {
      question: "Can I cancel or get a refund after subscribing?",
      answer:
        "Refunds are governed by the service provider's refund policy listed on this page. As per SEBI guidelines, services rendered are generally non-refundable unless explicitly stated otherwise.",
    },
    {
      question: "Are these recommendations guaranteed to make profit?",
      answer:
        "No. All trades carry market risk. Recommendations are based on the analyst's research, not assured returns. Past performance is not indicative of future results.",
    },
    {
      question: "How do I renew my plan?",
      answer:
        "You can renew from your subscriptions page anytime before or after expiry. If auto-renewal is enabled on the plan, your card will be charged automatically.",
    },
    {
      question: "Where can I raise a complaint or query?",
      answer:
        "You can reach out to the service provider via the contact details on this page, or contact Tradebox support at info@tradeboxlive.com.",
    },
  ];

  const rawFaqs =
    typeof data.faqs === "string" ? JSON.parse(data.faqs) : data.faqs;

  // If the SP didn't add any FAQs (or only added empty ones), fall back to
  // Tradebox defaults so the page never shows a sparse / empty FAQ section.
  const cleanedFaqs = Array.isArray(rawFaqs)
    ? rawFaqs.filter(
        (f: any) => f?.question?.trim() && f?.answer?.trim()
      )
    : [];
  const faqsArray =
    cleanedFaqs.length > 0 ? cleanedFaqs : DEFAULT_TRADEBOX_FAQS;

  // Truncate the disclaimer content to first 100 words
  const truncatedDisclaimer = spData?.disclaimer
    ? spData?.disclaimer.split(" ").slice(0, 100).join(" ")
    : "";

  const truncatedRefundPolicy = spData?.refundPolicy
    ? spData?.refundPolicy.split(" ").slice(0, 100).join(" ")
    : "";

  useEffect(() => {
    if (session.data?.user) {
      setIsLoggedIn(true);
    }
    if (data?.authorData?.id) {
      fetchSpData(data?.authorData?.id);
    }
  }, [session]);

  function renderContent(content: string) {
    return { __html: content.replace(/\n/g, "<br />") };
  }

  // console.log("data", data)

  const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      {Icon && (
        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Icon className="text-slate-600 dark:text-slate-400 text-base" />
        </div>
      )}
      <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
  );

  return (
    <>
      <Toaster />
      <div className="bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-3 sm:space-y-4">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Banner Image */}
                <div className="lg:w-7/12">
                  <img
                    src={data?.bannerURL}
                    alt={data?.title}
                    className="w-full h-auto max-h-[420px] rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div className="mt-4 sm:mt-5">
                    <div className="flex items-start gap-2 flex-wrap mb-2 sm:mb-3">
                      {data.segment && (
                        <span className="inline-flex items-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {data.segment}
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {data?.title}
                    </h1>
                    {formatCallQuotaLabel(data.callsQuota, data.callsPeriod) && (
                      <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-900 dark:text-white">Call commitment:</span>{" "}
                        {formatCallQuotaLabel(data.callsQuota, data.callsPeriod)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="lg:w-5/12">
                  <PricingSection
                    data={data}
                    spData={spData}
                    isLoggedIn={isLoggedIn}
                    setIsTncModalOpen={setIsTncModalOpen}
                    marketplaceSlug={marketplaceSlug}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
            <SectionHeader title="About the Plan" icon={FiInfo} />
            <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              <div dangerouslySetInnerHTML={renderContent(data.description)} />
            </div>
          </div>

          {/* Key Features Section */}
          {data?.keyFeatures?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
              <SectionHeader title="Key Features" icon={FiStar} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {data.keyFeatures.map((keyfeature: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 py-2">
                    <FiCheckCircle className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{keyfeature}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bonus Features Section */}
          {data?.bonusFeatures?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
              <SectionHeader title="Bonus Features" icon={FiGift} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {data.bonusFeatures.map((bonusfeature: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 py-2">
                    <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{bonusfeature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert Details Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
            <SectionHeader title="About the Research Analyst" icon={FiUser} />

            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
              {/* Expert Image */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <img
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                  src={spData?.profileUrl || "/default-profile.png"}
                  alt={spData?.name}
                />
              </div>

              {/* Expert Info */}
              <div className="flex-grow w-full">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                    {spData?.RegName || spData?.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Research Analyst</p>
                  {spData?.regNumber && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded self-start">
                      <FiShield className="text-slate-500 dark:text-slate-400" />
                      SEBI Reg. No: {spData.regNumber}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {spData?.email && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FiMail className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">Email:</span>
                      <span className="text-slate-700 dark:text-slate-300 break-all">{spData.email}</span>
                    </div>
                  )}

                  {spData?.number && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <FiPhone className="text-slate-400 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                      <span className="text-slate-700 dark:text-slate-300">{spData.number}</span>
                    </div>
                  )}

                  {spData?.address1 && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <FiMapPin className="text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">Address:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {spData.address1}{spData.address2 && `, ${spData.address2}`}, {spData.city}, {spData.state}
                      </span>
                    </div>
                  )}
                </div>

                {/* About Us — replaces the compliance officer block */}
                {(spData as any)?.aboutMe && (
                  <div className="mt-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <FiShield className="text-slate-500 dark:text-slate-400" />
                      About Us
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {(spData as any).aboutMe}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Refund Policy Section */}
          {spData?.refundPolicy && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
              <SectionHeader title="Refund Policy" icon={FiDollarSign} />
              <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {showFullContent ? (
                  <>
                    <div dangerouslySetInnerHTML={renderContent(spData.refundPolicy)} />
                    <button
                      className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                      onClick={toggleContent}
                    >
                      Show less <FiChevronUp className="ml-1" />
                    </button>
                  </>
                ) : (
                  <>
                    <p>{truncatedRefundPolicy}</p>
                    {spData.refundPolicy.split(" ").length > 100 && (
                      <button
                        className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                        onClick={toggleContent}
                      >
                        Read more <FiChevronDown className="ml-1" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {faqsArray?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
              <SectionHeader title="Frequently Asked Questions" icon={FiHelpCircle} />

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {faqsArray.map(
                  (
                    faq: { question: string; answer: string; _id?: string },
                    index: number
                  ) => (
                    <div key={faq._id || index} className="py-3 sm:py-4 first:pt-0 last:pb-0">
                      <h3 className="font-medium text-sm sm:text-base text-slate-900 dark:text-white">
                        {faq.question}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Disclaimer Section */}
          {spData?.disclaimer && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 lg:p-8">
              <SectionHeader title="Disclaimer & Risk Factors" icon={FiAlertTriangle} />
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {showFullContent ? (
                  <>
                    <div dangerouslySetInnerHTML={renderContent(spData.disclaimer)} />
                    <button
                      className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                      onClick={toggleContent}
                    >
                      Show less <FiChevronUp className="ml-1" />
                    </button>
                  </>
                ) : (
                  <>
                    <p>{truncatedDisclaimer}</p>
                    {spData.disclaimer.split(" ").length > 100 && (
                      <button
                        className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
                        onClick={toggleContent}
                      >
                        Read more <FiChevronDown className="ml-1" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Terms and Conditions Modal */}
        {isTncModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Terms and Conditions
                </h2>
                <button
                  onClick={() => setIsTncModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="prose prose-lg dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  {spData?.privacyPolicy || "No privacy policy provided."}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setIsTncModalOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}