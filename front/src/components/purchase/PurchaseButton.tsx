"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AuthModal from "@/components/Modal/AuthModal";
import CartModal from "@/components/Modal/CartModal";
import { FiShoppingCart } from "react-icons/fi";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { usePurchaseFlow } from "@/hooks/usePurchaseFlow";

interface PurchaseButtonProps {
  plan: { price: number; validity: number };
  service: any;
  onLoginSuccess?: () => void;
}

export default function PurchaseButton({ plan, service, onLoginSuccess }: PurchaseButtonProps) {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    isCartModalOpen,
    setIsCartModalOpen,
    isBuying,
    handlePurchase,
  } = usePurchaseFlow();

  const cartItems = useSelector((state: RootState) => state.cart.items);

  return (
    <>
      <button
        disabled={isBuying || !plan}
        onClick={() => handlePurchase(plan, service)}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isBuying ? "Processing..." : <><FiShoppingCart className="mr-2" /> Purchase</>}
      </button>

      {/* Auth Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <AuthModal
            callbackUrl={`view/services/${service?._id}`}
            onLoginSuccess={onLoginSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Cart Modal */}
      <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
        <DialogContent className="w-[90%] max-h-[90vh] overflow-y-scroll scrollbar-none">
          <CartModal
            onClose={() => setIsCartModalOpen(false)}
            serviceData={cartItems[0]} 
            onPaymentInitiated={() => setIsCartModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
