"use client";
import { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { setStepData } from "@/store/slices/cartStepSlice";
import { removeFromCart, clearCart } from "@/store/slices/cartSlice";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Step1 from "@/components/Cart/StepOne";
import Step2 from "@/components/Cart/StepTwo";

const CartPage = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartSteps = useSelector((state: RootState) => state.cartSteps);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + (item.price || 0),
    0
  );
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState(1);

  const stepData = useSelector((state: RootState) => state.cartSteps);
  console.log(cartItems[0])

  useEffect(() => {
    if (cartItems.length > 0) {
      dispatch(
        setStepData({
          step: "step1Data",
          data: cartItems.map((item) => ({
            id: item._id,
            title: item.title,
            author: item.authorData?.name || "Unknown",
            validity: item.validity || "N/A",
            price: item.price,
          })),
        })
      );
    }
  }, [cartItems, dispatch]);

  useEffect(() => {
    const stepFromURL = parseInt(searchParams.get("step") || "1", 10);
    if (stepFromURL >= 1 && stepFromURL <= 5) {
      setStep(stepFromURL);
    }
  }, [searchParams]);

  const updateStepInURL = (newStep: number) => {
    router.push(`${pathname}?step=${newStep}`, { scroll: false });
    setStep(newStep);
  };

  const placeOrder = async () => {
    console.log("Placing order with data:", stepData);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/order/place`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stepData),
        }
      );

      if (!response.ok) throw new Error("Order failed");

      alert("Order placed successfully!");
      router.push("/order-success");
    } catch (error) {
      console.error("Order placement error:", error);
      alert("Failed to place order.");
    }
  };

  const steps = [
    { number: 1, title: "" },
    { number: 2, title: "" },
    { number: 3, title: "" },
  ];

  return (
    <div className="mt-10">
      {/* <div className="bg-white p-4 mx-4 shadow-md rounded-[25px]">
        {step === 1 && <Step1 tncFileURL={cartItems[0]?.tncFileURL}
          serviceId={cartItems[0]?._id}
          updateStepInURL={updateStepInURL} setStep={setStep}
          onClose={onClose} 
          />}
        {step === 2 && cartItems.length > 0 && (
          <Step2
            updateStepInURL={updateStepInURL}
          />
        )}
        {step === 3 && <Step3 updateStepInURL={updateStepInURL} />}
      </div> */}
    </div>
  );
};

export default CartPage;
