import { OurServicesType } from "@/lib/types";

export type ToastOptions = {
  title: string;
  description: string;
  variant: "default" | "destructive" | null | undefined;
};

export async function deactivateService(
  id: string,
  setMyPlans: React.Dispatch<React.SetStateAction<OurServicesType[]>>,
  showToast: (options: ToastOptions) => void
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/deactivateservice`,
      {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: { "Content-type": "application/json" },
      }
    );

    if (response.status === 200) {
      showToast({
        title: "Service deactivated",
        description: "Service successfully deactivated",
        variant: "default",
      });

      setMyPlans((prev) =>
        prev.map((plan) => {
          if (plan._id === id) {
            return { ...plan, activated: false };
          }
          return plan;
        })
      );
    } else {
      showToast({
        title: "Error!",
        description: "There was an error deactivating service please try again",
        variant: "destructive",
      });
    }
  } catch (error) {
    showToast({
      title: "Error!",
      description: "There was an error deactivating service please try again",
      variant: "destructive",
    });
  }
}

export async function activateService(
  id: string,
  setMyPlans: React.Dispatch<React.SetStateAction<OurServicesType[]>>,
  showToast: (options: ToastOptions) => void
) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkout`,
      {
        method: "POST",
        body: JSON.stringify({ id }),
        headers: { "Content-type": "application/json" },
      }
    );

    if (response.status === 200) {
      showToast({
        title: "Service activated",
        description: "Service successfully activated",
        variant: "default",
      });

      setMyPlans((prev) =>
        prev.map((plan) => {
          if (plan._id === id) {
            return { ...plan, activated: true };
          }
          return plan;
        })
      );
    } else {
      showToast({
        title: "Error!",
        description: "There was an error activating service please try again",
        variant: "destructive",
      });
    }
  } catch (error) {
    showToast({
      title: "Error!",
      description: "There was an error activating service please try again",
      variant: "destructive",
    });
  }
}
