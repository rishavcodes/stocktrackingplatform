import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckIcon, XIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceKey =
  | "recommendations"
  | "paymentGateway"
  | "onboarding"
  | "content"
  | "modelPortfolio"
  | "recurringPayment";

type modelPortfolios = {
  limits: number;
};

type WalletBalanceCardProps = {
  amount: number;
  token: string;
  id: string;
  subscribed: boolean;
  currentSubscription?: {
    plan: string;
    duration: number;
    freshOnboardingCharge?: number;
    renewalCharge?: number;
    customerLimit?: number;
    oneTimesetupFee?: string;
    percentageFreshOnboarding?: number;
    percentageRenewal?: number;
    fixedFreshOnboardingCharge?: number;
    fixedRenewalCharge?: number;
    fixedCommercialFee?: string;
    pricingType?: "Fixed" | "Percentage";
    services?: {
      [key in ServiceKey]?: boolean;
    };
  };
  services?: {
    [key in ServiceKey]?: boolean;
  };
  data?: {
    serviceProviderData?: {
      services?: {
        [key in ServiceKey]?: boolean;
      };
    };
  };
  modelPortfolios?: modelPortfolios;
  onSubscriptionChange?: () => void; // Callback to refresh parent component
};

export default function WalletBalanceCard({
  amount,
  token,
  id,
  subscribed,
  currentSubscription,
  data,
  services,
  modelPortfolios,
  onSubscriptionChange,
}: WalletBalanceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);


  const [postpaidType, setPostpaidType] = useState<"Percentage" | "Fixed">(
    "Percentage"
  );
  const [selectedServices, setSelectedServices] = useState<{
    [key in ServiceKey]: boolean;
  }>({
    recommendations:
      services?.recommendations ||
      currentSubscription?.services?.recommendations ||
      data?.serviceProviderData?.services?.recommendations ||
      false,
    paymentGateway:
      services?.paymentGateway ||
      currentSubscription?.services?.paymentGateway ||
      data?.serviceProviderData?.services?.paymentGateway ||
      false,
    onboarding:
      services?.onboarding ||
      currentSubscription?.services?.onboarding ||
      data?.serviceProviderData?.services?.onboarding ||
      false,
    content:
      services?.content ||
      currentSubscription?.services?.content ||
      data?.serviceProviderData?.services?.content ||
      false,
    modelPortfolio:
      services?.modelPortfolio ||
      currentSubscription?.services?.modelPortfolio ||
      data?.serviceProviderData?.services?.modelPortfolio ||
      false,
    recurringPayment:
      services?.recurringPayment ||
      currentSubscription?.services?.recurringPayment ||
      data?.serviceProviderData?.services?.recurringPayment ||
      false,
  });

  // Add this effect to handle prop updates
  useEffect(() => {
    if (services) {
      setSelectedServices((prev) => ({
        ...prev,
        ...services,
      }));
    }
  }, [services]);

  const [formData, setFormData] = useState({
    plan: "Postpaid",
    validity: "1",
    freshOnboardingCharge: "",
    renewalCharge: "",
    customerLimit: "",
    oneTimesetupFee: "",
    percentageFreshOnboarding: "",
    percentageRenewal: "",
    fixedFreshOnboardingCharge: "",
    fixedRenewalCharge: "",
    fixedCommercialFee: "",
    modelPortfolioLimit: "50",
  });

  useEffect(() => {
    if (currentSubscription) {
      // Get the actual model portfolio limit from backend
      // const modelPortfolioLimit = currentSubscription.modelPortfolios?.[0]?.limits?.toString() || "1";

      setFormData(prev => ({
        ...prev,
        plan: "Postpaid",
        validity: currentSubscription.duration?.toString() || "1",
        freshOnboardingCharge: currentSubscription.freshOnboardingCharge?.toString() || "",
        renewalCharge: currentSubscription.renewalCharge?.toString() || "",
        customerLimit: currentSubscription.customerLimit?.toString() || "",
        oneTimesetupFee: currentSubscription.oneTimesetupFee?.toString() || "",
        percentageFreshOnboarding: currentSubscription.percentageFreshOnboarding?.toString() || "",
        percentageRenewal: currentSubscription.percentageRenewal?.toString() || "",
        fixedFreshOnboardingCharge: currentSubscription.fixedFreshOnboardingCharge?.toString() || "",
        fixedRenewalCharge: currentSubscription.fixedRenewalCharge?.toString() || "",
        fixedCommercialFee: currentSubscription.fixedCommercialFee?.toString() || "",
        modelPortfolioLimit: modelPortfolios?.limits?.toString() || "50",
      }));

      // Set pricing type based on existing data
      if (currentSubscription.pricingType == "Percentage") {
        setPostpaidType("Percentage");
      } else if (currentSubscription.pricingType == "Fixed") {
        setPostpaidType("Fixed");
      }
    }

  }, [currentSubscription]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleServiceChange = (service: ServiceKey, checked: boolean) => {
    setSelectedServices((prev) => ({
      ...prev,
      [service]: checked,
    }));
  };

  const handleLimitChange = (value: number) => {
    const newLimit = Math.max(1, value); // Ensure limit is at least 1
    setFormData(prev => ({
      ...prev,
      modelPortfolioLimit: newLimit.toString()
    }));
  };

  // Handle Form Submit
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = isUpdating
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-membership`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/activate-membership`;

      const requestBody: any = {
        ...formData,
        id,
        services: selectedServices,
        validity: Math.min(12, Math.max(1, Number(formData.validity) || 1)),
        freshOnboardingCharge: Number(formData.freshOnboardingCharge),
        renewalCharge: Number(formData.renewalCharge),
        customerLimit: Number(formData.customerLimit),
        oneTimesetupFee: Number(formData.oneTimesetupFee),
        percentageFreshOnboarding: Number(formData.percentageFreshOnboarding),
        percentageRenewal: Number(formData.percentageRenewal),
        fixedFreshOnboardingCharge: Number(formData.fixedFreshOnboardingCharge),
        fixedRenewalCharge: Number(formData.fixedRenewalCharge),
        fixedCommercialFee: Number(formData.fixedCommercialFee),
        pricingType: postpaidType,
      };

      // Add model portfolios data in the format backend expects
      if (selectedServices.modelPortfolio) {
        requestBody.modelPortfolios = [{
          limits: Number(formData.modelPortfolioLimit),
          Portfolios: [] // Empty array as default
        }];
      } else {
        // If model portfolio is not selected, ensure it's not included or set to empty
        requestBody.modelPortfolios = [];
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // console.log("response data", data);
      if (response.status == 200) {
        toast({
          title: "Success!",
          description:
            data?.message ||
            (isUpdating
              ? "Subscription Updated Successfully"
              : "Membership Activated Successfully"),
          variant: "default",
        });
        setIsOpen(false);
        setIsUpdating(false);
        // Refresh parent component if callback provided
        if (onSubscriptionChange) {
          onSubscriptionChange();
        }
      } else {
        toast({
          title: "Error",
          description:
            data?.message || `Something went wrong (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsOpen(false);
      toast({
        title: "Failed!",
        description: `${error}`,
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log("postpaidType:", postpaidType);
  }, [postpaidType]);

  // Handle Deactivate Subscription
  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deactivate-membership`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id }),
        }
      );

      const data = await response.json();

      console.log("limits", data);
      if (response.status === 200) {
        toast({
          title: "Success!",
          description: data?.message || "Subscription Deactivated Successfully",
          variant: "default",
        });
        setIsDeactivateOpen(false);
        // Refresh parent component if callback provided
        if (onSubscriptionChange) {
          onSubscriptionChange();
        }
      } else {
        toast({
          title: "Error",
          description:
            data?.message || `Something went wrong (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsDeactivateOpen(false);
      toast({
        title: "Failed!",
        description: `${error}`,
        variant: "default",
      });
    } finally {
      setDeactivating(false);
    }
  };

  // console.log("fixed fee on commecial", currentSubscription);
  return (
    <>
      <Toaster />
      <div>
        {subscribed ? (
          <div className="flex  gap-2">
            {/* Update Subscription Button and Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full p-5  bg-blue-600 text-white hover:bg-blue-900 hover:scale-105 transition-all duration-300
                   font-semibold"
                  onClick={() => setIsUpdating(true)}
                >
                  Update Subscription
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                <DialogHeader className="sticky top-0 bg-white pb-2 border-b z-10">
                  <DialogTitle className="text-xl font-bold text-gray-800">
                    Update Subscription
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">
                      Service Activation
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "recommendations",
                        "paymentGateway",
                        "onboarding",
                        "content",
                        "modelPortfolio",
                        "recurringPayment",
                      ].map((service) => (
                        <div key={service} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={service}
                            checked={selectedServices[service as ServiceKey]}
                            onChange={(e) =>
                              handleServiceChange(
                                service as ServiceKey,
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label
                            htmlFor={service}
                            className="capitalize text-sm font-medium"
                          >
                            {service.replace(/([A-Z])/g, " $1")}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Model Portfolio Limit Input - Visible when modelPortfolio is checked */}
                  {selectedServices.modelPortfolio && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold mb-2 text-blue-800">
                        Model Portfolio
                      </h3>
                      <div className="flex items-center gap-4">
                        <Label htmlFor="modelPortfolioLimit" className="text-sm font-medium">
                          Portfolio Limit:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLimitChange(Number(formData.modelPortfolioLimit) - 1)}
                            disabled={Number(formData.modelPortfolioLimit) <= 1}
                            className="h-8 w-8 p-0"
                          >
                            -
                          </Button>
                          <Input
                            id="modelPortfolioLimit"
                            name="modelPortfolioLimit"
                            type="number"
                            min="1"
                            value={formData.modelPortfolioLimit}
                            onChange={handleChange}
                            className="w-20 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLimitChange(Number(formData.modelPortfolioLimit) + 1)}
                            className="h-8 w-8 p-0"
                          >
                            +
                          </Button>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formData.modelPortfolioLimit} portfolio{Number(formData.modelPortfolioLimit) !== 1 ? 's' : ''} allowed
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="oneTimesetupFee"
                        className="w-full border rounded-md p-2 bg-gray-100"
                        value={formData.oneTimesetupFee}
                        onChange={handleChange}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">
                        Validity (Months)
                      </label>
                      <input
                        type="number"
                        name="validity"
                        min={1}
                        max={12}
                        className="w-full border rounded-md p-2"
                        value={formData.validity}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Pricing Type
                      </label>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm ${postpaidType === "Percentage" ? "font-bold text-blue-600" : "text-gray-700"}`}>
                          Percentage
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer "
                            checked={postpaidType === "Fixed"}
                            onChange={() =>
                              setPostpaidType((prev) =>
                                prev === "Percentage" ? "Fixed" : "Percentage"
                              )
                            }
                          />
                          <div className="w-11 h-6  peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:bg-blue-600 transition-all duration-300"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform duration-300" />
                        </label>
                        <span className={`text-sm ${postpaidType === "Fixed" ? "font-bold text-blue-600" : "text-gray-700"}`}>
                          Fixed
                        </span>

                      </div>
                      <p className="text-xs">
                        current: <span className="text-purple-500 font-bold">{postpaidType}</span>
                      </p>

                    </div>

                    {postpaidType === "Percentage" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium">
                            % of Sales on Fresh Onboarding
                          </label>
                          <input
                            type="number"
                            name="percentageFreshOnboarding"
                            className="w-full border rounded-md p-2"
                            value={formData.percentageFreshOnboarding}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            % of Sales on Renewal
                          </label>
                          <input
                            type="number"
                            name="percentageRenewal"
                            className="w-full border rounded-md p-2"
                            value={formData.percentageRenewal}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Common: Fixed Fee on Commercial (appears in both cases) */}
                        <div>
                          <label className="block text-sm font-medium">
                            Fixed Fee on Commercial
                          </label>
                          <input
                            type="number"
                            name="fixedCommercialFee"
                            className="w-full border rounded-md p-2"
                            value={formData.fixedCommercialFee}
                            onChange={handleChange}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium">
                            Fixed Amount on Fresh Onboarding
                          </label>
                          <input
                            type="number"
                            name="fixedFreshOnboardingCharge"
                            className="w-full border rounded-md p-2"
                            value={formData.fixedFreshOnboardingCharge}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            Fixed Amount per Renewal
                          </label>
                          <input
                            type="number"
                            name="fixedRenewalCharge"
                            className="w-full border rounded-md p-2"
                            value={formData.fixedRenewalCharge}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Common: Fixed Fee on Commercial (appears in both cases) */}
                        <div>
                          <label className="block text-sm font-medium">
                            Fixed Fee on Commercial
                          </label>
                          <input
                            type="number"
                            name="fixedCommercialFee"
                            className="w-full border rounded-md p-2"
                            value={formData.fixedCommercialFee}
                            onChange={handleChange}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t z-10 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setIsUpdating(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 text-white"
                  >
                    {loading ? "Processing..." : "Update Subscription"}
                  </Button>
                </div>

                <button
                  className="absolute top-3 right-3"
                  onClick={() => {
                    setIsOpen(false);
                    setIsUpdating(false);
                  }}
                >
                  <XIcon className="w-5 h-5 text-gray-500" />
                </button>
              </DialogContent>
            </Dialog>

            {/* Deactivate Subscription Button and Dialog */}
            <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full  bg-red-600 text-white  hover:bg-red-950 hover:scale-105 transition-all duration-300">
                  Deactivate Subscription
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Deactivate Subscription</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p>Are you sure you want to deactivate this subscription?</p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeactivateOpen(false)}
                    disabled={deactivating}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-600 text-white"
                    onClick={handleDeactivate}
                    disabled={deactivating}
                  >
                    {deactivating ? "Deactivating..." : "Deactivate"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 text-white">
                Activate Membership
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              {/* Header */}
              <DialogHeader className="sticky top-0 bg-white pb-2 border-b z-10">
                <DialogTitle className="text-xl font-bold text-gray-800">
                  Activate Membership
                </DialogTitle>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Select Services to Activate
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "recommendations",
                      "paymentGateway",
                      "onboarding",
                      "content",
                      "modelPortfolio",
                      "recurringPayment",
                    ].map((service) => (
                      <div key={service} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={service}
                          checked={selectedServices[service as ServiceKey]}
                          onChange={(e) =>
                            handleServiceChange(
                              service as ServiceKey,
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={service}
                          className="capitalize text-sm font-medium"
                        >
                          {service.replace(/([A-Z])/g, " $1")}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Model Portfolio Limit Input - Visible when modelPortfolio is checked */}
                {selectedServices.modelPortfolio && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold mb-2 text-blue-800">
                      Model Portfolio Settings
                    </h3>
                    <div className="flex items-center gap-4">
                      <Label htmlFor="modelPortfolioLimit" className="text-sm font-medium">
                        Portfolio Limit:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleLimitChange(Number(formData.modelPortfolioLimit) - 1)}
                          disabled={Number(formData.modelPortfolioLimit) <= 1}
                          className="h-8 w-8 p-0"
                        >
                          -
                        </Button>
                        <Input
                          id="modelPortfolioLimit"
                          name="modelPortfolioLimit"
                          type="number"
                          min="1"
                          value={formData.modelPortfolioLimit}
                          onChange={handleChange}
                          className="w-20 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleLimitChange(Number(formData.modelPortfolioLimit) + 1)}
                          className="h-8 w-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                      <span className="text-sm text-gray-600">
                        {formData.modelPortfolioLimit} portfolio{Number(formData.modelPortfolioLimit) !== 1 ? 's' : ''} allowed
                      </span>
                    </div>
                  </div>
                )}

                {/* Grid Layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Amount
                    </label>
                    <input
                      type="number"
                      name="oneTimesetupFee"
                      className="w-full border rounded-md p-2"
                      value={formData.oneTimesetupFee}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">
                      Validity (Months)
                    </label>
                    <input
                      type="number"
                      name="validity"
                      min={1}
                      max={12}
                      className="w-full border rounded-md p-2"
                      value={formData.validity}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Toggle Between Percentage and Fixed */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Pricing Type
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-700">Percentage</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={postpaidType === "Fixed"}
                          onChange={() =>
                            setPostpaidType((prev) =>
                              prev === "Percentage" ? "Fixed" : "Percentage"
                            )
                          }
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer dark:bg-gray-700 peer-checked:bg-blue-600 transition-all duration-300"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transform peer-checked:translate-x-5 transition-transform duration-300" />
                      </label>
                      <span className="text-sm text-gray-700">Fixed</span>
                    </div>
                  </div>

                  {/* Conditional Inputs Based on Toggle */}
                  {postpaidType === "Percentage" ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium">
                          % of Sales on Fresh Onboarding
                        </label>
                        <input
                          type="number"
                          name="percentageFreshOnboarding"
                          className="w-full border rounded-md p-2"
                          value={formData.percentageFreshOnboarding}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium">
                          % of Sales on Renewal
                        </label>
                        <input
                          type="number"
                          name="percentageRenewal"
                          className="w-full border rounded-md p-2"
                          value={formData.percentageRenewal}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Common: Fixed Fee on Commercial (appears in both cases) */}
                      <div>
                        <label className="block text-sm font-medium">
                          Fixed Fee on Commercial
                        </label>
                        <input
                          type="number"
                          name="fixedCommercialFee"
                          className="w-full border rounded-md p-2"
                          value={formData.fixedCommercialFee}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium">
                          Fixed Amount on Fresh Onboarding
                        </label>
                        <input
                          type="number"
                          name="fixedFreshOnboardingCharge"
                          className="w-full border rounded-md p-2"
                          value={formData.fixedFreshOnboardingCharge}
                          onChange={handleChange}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium">
                          Fixed Amount per Renewal
                        </label>
                        <input
                          type="number"
                          name="fixedRenewalCharge"
                          className="w-full border rounded-md p-2"
                          value={formData.fixedRenewalCharge}
                          onChange={handleChange}
                        />
                      </div>

                      {/* Common: Fixed Fee on Commercial (appears in both cases) */}
                      <div>
                        <label className="block text-sm font-medium">
                          Fixed Fee on Commercial
                        </label>
                        <input
                          type="number"
                          name="fixedCommercialFee"
                          className="w-full border rounded-md p-2"
                          value={formData.fixedCommercialFee}
                          onChange={handleChange}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white pt-4 border-t z-10 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-600 text-white"
                >
                  {loading ? (
                    "Processing..."
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" /> Confirm
                    </>
                  )}
                </Button>
              </div>

              {/* Close Button */}
              <button
                className="absolute top-3 right-3"
                onClick={() => setIsOpen(false)}
              >
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}