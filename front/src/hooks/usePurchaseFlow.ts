"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { RootState } from "@/store/rootReducer";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { useToast } from "@/components/ui/use-toast";

export function usePurchaseFlow() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const handlePurchase = (
    plan: { price: number; validity: number; purchaseType?: "ONE_TIME" | "RENEWABLE" },
    service: any
  ) => {
    if (!session) {
      setIsAuthModalOpen(true); // Not logged in → show auth
      return;
    }

    try {
      setIsBuying(true);

      if (cartItems.length > 0) {
        dispatch(clearCart()); // Only one item in cart
      }

      const cartData = {
        title: service.title,
        author: service.authorData.name,
        authorId: service.authorData.id,
        tncFileURL: service.tncFileURL,
        price: plan.price,
        validity: plan.validity,
        planPurchaseType:
          plan.purchaseType ??
          service.purchaseType ??
          "RENEWABLE",
        subscribedToId: service._id,
      };

      dispatch(addToCart(cartData));
      setIsCartModalOpen(true); // Open cart modal

    } catch (err) {
      toast({
        title: "Error",
        description: "Could not add to cart",
        variant: "destructive",
      });
    } finally {
      setIsBuying(false);
    }
  };

  return {
    isAuthModalOpen,
    setIsAuthModalOpen,
    isCartModalOpen,
    setIsCartModalOpen,
    isBuying,
    handlePurchase,
  };
}
