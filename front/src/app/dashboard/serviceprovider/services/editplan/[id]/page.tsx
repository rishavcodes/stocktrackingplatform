"use client";

import {
  DocumentsListInput,
  Input,
  PlanSegmentInput,
  TradeboxPlans,
} from "@/components";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";
import RecordInput from "@/components/Services/RecordInput/RecordInput";
import { useToast } from "@/components/ui/use-toast";
import MultiSelectKeyFeatures from "@/components/MultiSelect/MultiSelectKeyFeatures";
import MultiSelectBonusFeatures from "@/components/MultiSelect/MultiSelectBonusFeatures";
import Image from "next/image";
import PictureIcon from "@/icons/PictureIcon";
import PdfIcon from "@/icons/PdfIcon";
import { OurServicesType } from "@/lib/types";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";

type EditServicesType = {
  title: string;
  description: string;
  pricingPlans: {
    validity: number;
    price: number;
    purchaseType: "ONE_TIME" | "RENEWABLE";
  }[];
  faqs: { question: string; answer: string }[];
  AUM?: number;
  NoOfClients?: number;
  inceptionDate?: string;
  Fundmanager?: string;
  onemonth?: number;
  sixmonths?: number;
  oneyear?: number;
  threeyears?: number;
  fiveyears?: number;
  AsOn?: string;
  isFreeTrial: boolean;
  freeTrailDays: number;
  segment: string;
  bannerURL: string | File | null;
  tncFile: File | string | null;
  tncFileURL?: string | null;
  keyFeatures: string[];
  bonusFeatures: string[];
  documents: string[] | null;
  shareWithMarketplaces: string[];
  telegramConfig?: {
    channelId: string;
  };
  purchaseType: "ONE_TIME" | "RENEWABLE";
  callsQuota: number;
  callsPeriod: "DAY" | "WEEK" | "MONTH";
  allowRecurringPayment: boolean;
};

async function fetchService(id: string) {
  const fetchData = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/fetchservice?id=${id}`,
    { method: "GET" }
  );

  if (fetchData.status !== 200) {
    return null;
  }

  const response = await fetchData.json();
  return response.data;
}

export default function EditPlan({ params }: { params: Promise<{ id: string }> }) {
  const [isFund, setIsFund] = useState<boolean>(false);
  const [id, setId] = useState<string>("");
  const { toast } = useToast();
  const session = useSession();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [needTelegram, setNeedTelegram] = useState<boolean>(false);
  const [telegramChannelId, setTelegramChannelId] = useState<string>('');
  const [telegramError, setTelegramError] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [documents, setDocuments] = useState<{ name: string; link: string; _id: string }[]>([]);
  const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recurringPaymentAllowed, setRecurringPaymentAllowed] = useState(false);

  const [serviceData, setServiceData] = useState<EditServicesType>({
    title: "",
    description: "",
    pricingPlans: [{ validity: 0, price: 0, purchaseType: "RENEWABLE" }],
    faqs: [{ question: "", answer: "" }],
    tncFile: null,
    tncFileURL: null,
    AUM: undefined,
    NoOfClients: undefined,
    inceptionDate: "",
    Fundmanager: "",
    onemonth: undefined,
    sixmonths: undefined,
    oneyear: undefined,
    threeyears: undefined,
    fiveyears: undefined,
    AsOn: "",
    isFreeTrial: false,
    freeTrailDays: 0,
    segment: "",
    bannerURL: null,
    keyFeatures: [],
    bonusFeatures: [],
    documents: [],
    shareWithMarketplaces: [],
    purchaseType: "RENEWABLE",
    callsQuota: 0,
    callsPeriod: "DAY",
    allowRecurringPayment: false,
  });

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  useEffect(() => {
    if (
      session.data?.user.category === "PMS" ||
      session.data?.user.category === "AIF" ||
      session.data?.user.category === "Mutual Funds"
    ) {
      setIsFund(true);
    }
  }, [session.data?.user.category]);

  // Check if admin has enabled Recurring Payment service for this SP
  useEffect(() => {
    if (!session.data?.user?.id) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/check-subscription?providerId=${session.data.user.id}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isSubscription && data?.services?.recurringPayment) {
          setRecurringPaymentAllowed(true);
        }
      })
      .catch(() => {});
  }, [session.data?.user?.id]);

  // Sync shareWithMarketplaces with serviceData
  useEffect(() => {
    setServiceData(prev => ({
      ...prev,
      shareWithMarketplaces: shareWithMarketplaces
    }));
  }, [shareWithMarketplaces]);

  useEffect(() => {
    const loadService = async () => {
      if (!id) return;

      setIsLoading(true);
      console.log("Loading service for ID:", id);

      const service: OurServicesType | null = await fetchService(id);

      if (service) {
        console.log("Service loaded successfully:", service.title);
        console.log("Marketplace IDs from API:", service.shareWithMarketplaces);

        // Set service data
        setServiceData({
          title: service.title || "",
          description: service.description || "",
          pricingPlans: (service.pricingPlans || [{ validity: 0, price: 0 }]).map(
            (p) => {
              const raw =
                (p as { purchaseType?: string }).purchaseType ??
                service.purchaseType ??
                "RENEWABLE";
              return {
                ...p,
                purchaseType:
                  raw === "ONE_TIME" ? ("ONE_TIME" as const) : ("RENEWABLE" as const),
              };
            }
          ),
          faqs: service.faqs || [{ question: "", answer: "" }],
          tncFile: service.tncFile || service.tncFileURL || null,
          tncFileURL: service.tncFileURL || null,
          AUM: service.AUM,
          NoOfClients: service.NoOfClients,
          inceptionDate: service.inceptionDate || "",
          Fundmanager: service.Fundmanager || "",
          onemonth: service.returnsByTime?.[0] || 0,
          sixmonths: service.returnsByTime?.[1] || 0,
          oneyear: service.returnsByTime?.[2] || 0,
          threeyears: service.returnsByTime?.[3] || 0,
          fiveyears: service.returnsByTime?.[4] || 0,
          AsOn: service.AsOn || "",
          isFreeTrial: service.isFreeTrial || false,
          freeTrailDays: service.freeTrailDays || 0,
          segment: service.segment || "",
          bannerURL: service.bannerURL || null,
          keyFeatures: service.keyFeatures || [],
          bonusFeatures: service.bonusFeatures || [],
          documents: service.Documents || [],
          shareWithMarketplaces: service.shareWithMarketplaces || [],
          purchaseType: service.purchaseType || "RENEWABLE",
          callsQuota:
            typeof service.callsQuota === "number" ? service.callsQuota : 0,
          callsPeriod:
            (service.callsPeriod as "DAY" | "WEEK" | "MONTH") || "DAY",
          allowRecurringPayment: !!(service as any).allowRecurringPayment,
        });

        // Set marketplace IDs with delay to ensure MarketPlaceSelect is ready
        setTimeout(() => {
          setShareWithMarketplaces(service.shareWithMarketplaces || []);
        }, 1000);

        if (service.bannerURL) {
          setPreviewUrl(service.bannerURL);
        }

        if (service.telegramChannelId) {
          setTelegramChannelId(service.telegramChannelId);
          setNeedTelegram(true);
        }
      } else {
        console.log("No service data returned");
      }

      setIsLoading(false);
    };

    loadService();
  }, [id]);

  function serviceDataChangehandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = event.target;

    setServiceData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : type === "number"
            ? value === "" ? undefined : Number(value)
            : value,
    }));
  }

  function handleCallsQuotaChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setServiceData((prev) => ({
      ...prev,
      callsQuota: v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0),
    }));
  }

  function bannerChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;

    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setServiceData((prev) => ({ ...prev, bannerURL: file }));
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      if (file.type !== "application/pdf") {
        setErrorMessage("Only PDF files are allowed.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("File size must be less than 5MB.");
        return;
      }

      setErrorMessage("");
      setServiceData((prev) => ({ ...prev, tncFile: file }));
    }
  }

  function handleFaqChange(
    index: number,
    field: "question" | "answer",
    value: string
  ) {
    setServiceData((prev) => {
      const updatedFaqs = [...prev.faqs];
      updatedFaqs[index][field] = value;
      return {
        ...prev,
        faqs: updatedFaqs,
      };
    });
  }

  function addFaq() {
    setServiceData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  }

  function removeFaq(index: number) {
    setServiceData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  }

  function handlePricingPlanChange(
    index: number,
    field: "validity" | "price",
    value: number
  ) {
    setServiceData((prev) => {
      const newPlans = [...prev.pricingPlans];
      newPlans[index] = { ...newPlans[index], [field]: value };
      return { ...prev, pricingPlans: newPlans };
    });
  }

  function handlePricingPlanPurchaseType(
    index: number,
    purchaseType: "ONE_TIME" | "RENEWABLE"
  ) {
    setServiceData((prev) => {
      const newPlans = [...prev.pricingPlans];
      newPlans[index] = { ...newPlans[index], purchaseType };
      return { ...prev, pricingPlans: newPlans };
    });
  }

  function addPricingPlan() {
    setServiceData((prev) => ({
      ...prev,
      pricingPlans: [
        ...prev.pricingPlans,
        { validity: 0, price: 0, purchaseType: "RENEWABLE" },
      ],
    }));
  }

  function removePricingPlan(index: number) {
    setServiceData((prev) => ({
      ...prev,
      pricingPlans: prev.pricingPlans.filter((_, i) => i !== index),
    }));
  }

  const validateTelegramChannelId = (id: string): boolean => {
    const telegramRegex = /^-100\d+$/;
    if (!telegramRegex.test(id)) {
      setTelegramError('Telegram Channel ID must start with -100 followed by numbers');
      return false;
    }
    setTelegramError('');
    return true;
  };

  async function updateService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate pricing plans
    for (const plan of serviceData.pricingPlans) {
      if (plan.validity > 365) {
        toast({
          title: "Validity Exceeded",
          description: "Validity should not be more than 365 days!",
          variant: "destructive",
        });
        return;
      }

      const maxAllowedPrice = 151000;
      if (plan.price > maxAllowedPrice) {
        toast({
          title: "Invalid Price",
          description: `Price exceeds maximum allowed price of ${maxAllowedPrice}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (needTelegram && !telegramChannelId.trim()) {
      toast({
        title: "Telegram Channel Required",
        description: "Please enter Telegram Channel ID",
        variant: "destructive",
      });
      return;
    }

    if (needTelegram && !validateTelegramChannelId(telegramChannelId)) {
      return;
    }

    const pricingPlansNormalized = serviceData.pricingPlans.map((p) => ({
      validity: p.validity,
      price: p.price,
      purchaseType:
        p.purchaseType === "ONE_TIME" ? "ONE_TIME" : ("RENEWABLE" as const),
    }));
    const derivedPurchaseType = pricingPlansNormalized.some(
      (p) => p.purchaseType === "RENEWABLE"
    )
      ? ("RENEWABLE" as const)
      : ("ONE_TIME" as const);

    // Prepare data for API
    const data = {
      id: id,
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      type: session.data?.user.category,
      authorImage: session.data?.user.profileUrl ?? "",
      aboutAuthor: session.data?.user.aboutMe,
      serviceType: isFund ? "fund" : "normal",
      returnsByTime: [
        serviceData.onemonth || 0,
        serviceData.sixmonths || 0,
        serviceData.oneyear || 0,
        serviceData.threeyears || 0,
        serviceData.fiveyears || 0,
      ],
      Documents: documents.map(doc => doc.link),
      telegramConfig: needTelegram
        ? {
          channelId: telegramChannelId,
        }
        : null,
      ...serviceData,
      pricingPlans: isFund ? serviceData.pricingPlans : pricingPlansNormalized,
      purchaseType: isFund ? serviceData.purchaseType : derivedPurchaseType,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));

    if (serviceData.bannerURL && serviceData.bannerURL instanceof File) {
      formData.append("bannerURL", serviceData.bannerURL);
    }

    if (serviceData.tncFile && serviceData.tncFile instanceof File) {
      formData.append("tncFile", serviceData.tncFile);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/updateservice`,
        {
          method: "PUT",
          body: formData,
        }
      );

      if (response.status === 200) {
        toast({
          title: "Updated",
          description: `Tradebox service updated`,
          variant: "default",
        });

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error!",
          description: errorData.message || "There was an error updating service please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error updating service please try again",
        variant: "destructive",
      });
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (needTelegram && !validateTelegramChannelId(telegramChannelId)) {
      return;
    }

    updateService(e);
  };

  let tncName = "";

  if (serviceData.tncFile instanceof File) {
    tncName = serviceData.tncFile.name;
  } else if (typeof serviceData.tncFile === "string") {
    const fullName = serviceData.tncFile.split("/").pop() || "";
    tncName = decodeURIComponent(fullName.replace(/^[^()]+-\(tncFile\)-/, ""));
  } else if (serviceData.tncFileURL) {
    const fullName = serviceData.tncFileURL.split("/").pop() || "";
    tncName = decodeURIComponent(fullName.replace(/^[^()]+-\(tncFile\)-/, ""));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8">
      <Toaster />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading service data...</p>
          </div>
        </div>
      ) : (
        <form
          method="POST"
          className="mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          onSubmit={handleSubmit}
        >
          <h1 className="text-3xl font-bold mb-8">
            {isFund ? "Edit Fund" : "Edit Plan"}
          </h1>

          {/* Basic Information Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                title={`${isFund ? "Name of Fund / Scheme" : "Title of the plan"
                  }*`}
                type="text"
                name="title"
                value={serviceData.title}
                height="py-2"
                paddingRight="pr-2"
                roundness="rounded-md"
                labelStyle="text-black font-semibold dark:text-white/70"
                onChange={serviceDataChangehandler}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Segment*</label>
                <PlanSegmentInput
                  onChange={setServiceData}
                  value={serviceData.segment}
                  title={"Segment"}
                  name={"segment"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description*</label>
              <textarea
                className="w-full border rounded-md p-3 dark:bg-gray-800 min-h-[120px]"
                value={serviceData.description}
                name="description"
                onChange={serviceDataChangehandler}
                placeholder="Describe your offering..."
              />
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Features*</label>
                <MultiSelectKeyFeatures
                  onChange={(features) => setServiceData(prev => ({ ...prev, keyFeatures: features }))}
                  initialFeatures={serviceData.keyFeatures}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bonus Features*</label>
                <MultiSelectBonusFeatures
                  onChange={(features) => setServiceData(prev => ({ ...prev, bonusFeatures: features }))}
                  initialFeatures={serviceData.bonusFeatures}
                />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-black dark:text-white/70">
                Call commitment (optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How many calls you will provide per daily, weekly, or monthly basis for this plan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-xl">
                <div className="flex-1 min-w-[8rem]">
                  <label className="text-xs text-gray-500 block mb-1">Number of calls</label>
                  <input
                    type="number"
                    name="callsQuota"
                    min={0}
                    placeholder="e.g. 5"
                    className="w-full border rounded-md px-3 py-2 dark:bg-gray-800 h-10"
                    value={serviceData.callsQuota === 0 ? "" : serviceData.callsQuota}
                    onChange={handleCallsQuotaChange}
                  />
                </div>
                <div className="flex-1 min-w-[10rem]">
                  <label className="text-xs text-gray-500 block mb-1">Per</label>
                  <select
                    name="callsPeriod"
                    className="w-full border rounded-md px-3 py-2 dark:bg-gray-800 h-10 bg-white dark:bg-gray-800"
                    value={serviceData.callsPeriod}
                    onChange={(e) =>
                      setServiceData((prev) => ({
                        ...prev,
                        callsPeriod: e.target.value as "DAY" | "WEEK" | "MONTH",
                      }))
                    }
                  >
                    <option value="DAY">Daily</option>
                    <option value="WEEK">Weekly</option>
                    <option value="MONTH">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Marketplaces Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">
              Select Marketplaces
            </h2>



            <MarketPlaceSelect
              key={`marketplace-${shareWithMarketplaces.length}-${id}`}
              onChange={setShareWithMarketplaces}
              initialValues={shareWithMarketplaces}
            />


          </div>

          {/* Media Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">Media</h2>
            <div className="space-y-2">
              {previewUrl ? (
                <label htmlFor="bannerInput" className="block cursor-pointer w-96">
                  <Image
                    src={previewUrl}
                    alt="article-preview"
                    width={200}
                    height={200}
                    className="w-full h-full object-cover rounded-md"
                  />
                </label>
              ) : (
                <label htmlFor="bannerInput" className="block space-y-2 cursor-pointer">
                  <span className="text-sm font-medium">Banner Image*</span>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-green transition-colors">
                    <PictureIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Click to upload banner image
                    </p>
                    <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </label>
              )}

              <input
                type="file"
                id="bannerInput"
                className="hidden"
                accept="image/*"
                name="bannerURL"
                onChange={bannerChangeHandler}
              />
            </div>
          </div>

          {/* Pricing & Validity Section (for non-fund services) */}
          {!isFund && (
            <div className="space-y-6 mb-8">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Pricing & Validity
              </h2>

              {serviceData.pricingPlans.map((plan, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <Input
                      title={"Validity (days)*"}
                      type={"number"}
                      name={`validity-${index}`}
                      height="py-2"
                      value={plan.validity}
                      min="0"
                      paddingRight="pr-2"
                      roundness="rounded-md"
                      labelStyle="text-black font-semibold dark:text-white/70"
                      onChange={(e) =>
                        handlePricingPlanChange(
                          index,
                          "validity",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                    <div className="flex gap-4 items-end">
                      <Input
                        title="Price (Excl. GST)*"
                        type="number"
                        name={`price-${index}`}
                        value={plan.price}
                        height="py-2"
                        paddingRight="pr-2"
                        roundness="rounded-md"
                        labelStyle="text-black font-semibold dark:text-white/70"
                        onChange={(e) =>
                          handlePricingPlanChange(
                            index,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                      {serviceData.pricingPlans.length > 1 && (
                        <button
                          type="button"
                          className="h-10 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          onClick={() => removePricingPlan(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-black dark:text-white/70">
                      Purchase setting for this validity
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`purchaseType-${index}`}
                          value="ONE_TIME"
                          checked={plan.purchaseType === "ONE_TIME"}
                          onChange={() =>
                            handlePricingPlanPurchaseType(index, "ONE_TIME")
                          }
                        />
                        <span className="text-sm">One-time</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`purchaseType-${index}`}
                          value="RENEWABLE"
                          checked={plan.purchaseType === "RENEWABLE"}
                          onChange={() =>
                            handlePricingPlanPurchaseType(index, "RENEWABLE")
                          }
                        />
                        <span className="text-sm">Renewable</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                onClick={addPricingPlan}
              >
                + Add Another Pricing Plan
              </button>
            </div>
          )}

          {isFund && (
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Purchase Settings
              </h2>

              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    value="ONE_TIME"
                    checked={serviceData.purchaseType === "ONE_TIME"}
                    onChange={() =>
                      setServiceData(prev => ({
                        ...prev,
                        purchaseType: "ONE_TIME",
                      }))
                    }
                  />
                  <div>
                    <p className="font-medium">One-time purchase</p>
                    <p className="text-sm text-gray-500">
                      User can purchase this service only once
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    value="RENEWABLE"
                    checked={serviceData.purchaseType === "RENEWABLE"}
                    onChange={() =>
                      setServiceData(prev => ({
                        ...prev,
                        purchaseType: "RENEWABLE",
                      }))
                    }
                  />
                  <div>
                    <p className="font-medium">Renewable</p>
                    <p className="text-sm text-gray-500">
                      User can repurchase after expiry
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* FAQs Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">FAQs</h2>

            {serviceData.faqs.map((faq, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"
              >
                <Input
                  title="Question*"
                  type="text"
                  placeholder="Optional"
                  name={`question-${index}`}
                  height="py-2"
                  value={faq.question}
                  paddingRight="pr-2"
                  roundness="rounded-md"
                  labelStyle="text-black font-semibold dark:text-white/70"
                  onChange={(e) =>
                    handleFaqChange(index, "question", e.target.value)
                  }
                />
                <div className="flex gap-4 items-end">
                  <Input
                    title="Answer*"
                    type="text"
                    placeholder="Optional"
                    name={`answer-${index}`}
                    value={faq.answer}
                    height="py-2"
                    paddingRight="pr-2"
                    roundness="rounded-md"
                    labelStyle="text-black font-semibold dark:text-white/70"
                    onChange={(e) =>
                      handleFaqChange(index, "answer", e.target.value)
                    }
                  />
                  {serviceData.faqs.length > 1 && (
                    <button
                      type="button"
                      className="h-10 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      onClick={() => removeFaq(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
              onClick={addFaq}
            >
              + Add Another FAQ
            </button>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">
              Legal Documents
            </h2>
            <div className="space-y-2">
              {serviceData.tncFile ? (
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span>{tncName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceData((prev) => ({ ...prev, tncFile: null }));
                        const fileInput = document.getElementById(
                          "tncFile"
                        ) as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="tncFile"
                  className="block space-y-2 cursor-pointer"
                >
                  <span className="text-sm font-medium">
                    Terms & Conditions (PDF)*
                  </span>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-green transition-colors">
                    <PdfIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Click to upload PDF document
                    </p>
                    <p className="text-sm text-gray-400 mt-1">PDF up to 5MB</p>
                  </div>
                </label>
              )}
              <input
                type="file"
                id="tncFile"
                name="tncFile"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
                required={!serviceData.tncFile}
              />
            </div>
          </div>

          {/* Fund-specific fields */}
          <div className="flex md:flex-row flex-col md:items-center">
            <div className="p-5 flex flex-col gap-5 w-full">
              {isFund && (
                <div className="flex flex-col gap-5">
                  <div className="flex ss:flex-row flex-col w-full gap-5">
                    <div className="w-full">
                      <Input
                        title="AUM"
                        type="number"
                        required={false}
                        value={serviceData.AUM}
                        name="AUM"
                        height="py-2"
                        paddingRight="pr-2"
                        min={"0"}
                        labelStyle="text-black font-semibold dark:text-white/70"
                        onChange={serviceDataChangehandler}
                      />
                    </div>
                    <div className=" w-full">
                      <Input
                        title="No. of Clients"
                        type="number"
                        name="NoOfClients"
                        value={serviceData.NoOfClients}
                        required={false}
                        height="py-2"
                        paddingRight="pr-2"
                        min={"0"}
                        roundness="rounded-md"
                        labelStyle="text-black font-semibold dark:text-white/70"
                        onChange={serviceDataChangehandler}
                      />
                    </div>
                  </div>
                  <div className="flex ss:flex-row flex-col w-full gap-5">
                    <div className="w-full">
                      <Input
                        title="Inception Date *"
                        type="date"
                        name="inceptionDate"
                        value={serviceData.inceptionDate}
                        height="py-2"
                        paddingRight="pr-2"
                        labelStyle="text-black font-semibold dark:text-white/70"
                        onChange={serviceDataChangehandler}
                      />
                    </div>

                    <div className="w-full">
                      <Input
                        title="As On*"
                        type="date"
                        name="AsOn"
                        value={serviceData.AsOn}
                        height="py-2"
                        paddingRight="pr-2"
                        labelStyle="text-black font-semibold dark:text-white/70"
                        onChange={serviceDataChangehandler}
                      />
                    </div>
                  </div>
                  <div className="w-full">
                    <Input
                      title="Fund Manager*"
                      type="text"
                      name="Fundmanager"
                      value={serviceData.Fundmanager}
                      height="py-2"
                      paddingRight="pr-2"
                      roundness="rounded-md"
                      labelStyle="text-black font-semibold dark:text-white/70"
                      onChange={serviceDataChangehandler}
                    />
                  </div>

                  <div className="w-full">
                    <div className="dark:text-white/70">Select Documents</div>
                    <DocumentsListInput
                      onChange={setDocuments}
                      id={session.data?.user._id!}
                      initialDocuments={
                        serviceData.documents
                          ? serviceData.documents.map((doc: any, index: number) => ({
                            name: doc.name || `Document ${index + 1}`,
                            link: typeof doc === 'string' ? doc : doc.link,
                            _id: doc._id || `${index}-${Date.now()}`
                          }))
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {isFund && (
              <div className="flex flex-col justify-stretch max-ss:w-[90%] mx-auto gap-10 items-stretch">
                <div className="flex flex-col items-stretch w-full">
                  <div>Returns (In %)</div>
                  <div className="flex flex-col gap-5 items-stretch">
                    <RecordInput
                      title={{ time: 1, frame: "Month" }}
                      value={serviceData.onemonth!}
                      name="onemonth"
                      changeHandler={serviceDataChangehandler}
                    />
                    <RecordInput
                      title={{ time: 6, frame: "Months" }}
                      value={serviceData.sixmonths!}
                      name="sixmonths"
                      changeHandler={serviceDataChangehandler}
                    />
                    <RecordInput
                      title={{ time: 1, frame: "Year" }}
                      value={serviceData.oneyear!}
                      name="oneyear"
                      changeHandler={serviceDataChangehandler}
                    />
                    <RecordInput
                      title={{ time: 3, frame: "Years" }}
                      value={serviceData.threeyears!}
                      name="threeyears"
                      changeHandler={serviceDataChangehandler}
                    />
                    <RecordInput
                      title={{ time: 5, frame: "Years" }}
                      value={serviceData.fiveyears!}
                      name="fiveyears"
                      changeHandler={serviceDataChangehandler}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Free Trial Section */}
          {serviceData.isFreeTrial && (
            <Input
              title="No. of trial days"
              type="number"
              name="freeTrailDays"
              value={serviceData.freeTrailDays}
              required={false}
              height="py-2"
              paddingRight="pr-2"
              roundness="rounded-md"
              min={"0"}
              labelStyle="text-black font-semibold dark:text-white/70"
              onChange={serviceDataChangehandler}
            />
          )}

          {/* Telegram Integration */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold border-b pb-2">
              Telegram Integration
            </h2>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">
                Link Telegram Channel?
              </label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${needTelegram ? "bg-green-600" : "bg-gray-900"
                  }`}
                onClick={() => setNeedTelegram(!needTelegram)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${needTelegram ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            {needTelegram && (
              <div className="space-y-2 pl-6">
                <Input
                  title="Telegram Channel ID*"
                  type="text"
                  name="telegramChannelId"
                  value={telegramChannelId}
                  height="py-2"
                  paddingRight="pr-2"
                  roundness="rounded-md"
                  labelStyle="text-black font-semibold dark:text-white/70"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    setTelegramChannelId(value);
                    validateTelegramChannelId(value);
                  }}
                  placeholder="Format: -1001234567890 (must start with -100)"
                />
                {telegramError && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {telegramError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recurring Payment Toggle - only shown if admin enabled this service for the SP */}
          {recurringPaymentAllowed && (
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Recurring Payment (Auto-Renewal)
              </h2>
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 mt-1 ${serviceData.allowRecurringPayment ? "bg-green-600" : "bg-slate-500"}`}
                  onClick={() =>
                    setServiceData((prev) => ({
                      ...prev,
                      allowRecurringPayment: !prev.allowRecurringPayment,
                    }))
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${serviceData.allowRecurringPayment ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-black dark:text-white/70">
                    Allow auto-renewal via UPI Auto-Pay for this plan
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, customers will see an option on the checkout page to subscribe to auto-renewal for this plan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <input
              type="submit"
              value={"Update"}
              className="bg-green-600 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-md transition-colors cursor-pointer"
            />
          </div>
        </form>
      )}
    </div>
  );
}