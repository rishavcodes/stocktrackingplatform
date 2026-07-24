import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CheckIcon, XIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

type WalletRechargeCardProps = {
    token: string;
    providerName: string;
    id: string;
};

export default function WalletRechargeCard({ token, providerName, id }: WalletRechargeCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const {toast} = useToast();

    const [formData, setFormData] = useState({
        amount: "",
        transactionId: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {

        if (Number(formData.amount) <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Amount must be a positive number",
                variant: "destructive",
            });
            return;
        }
        
        if (!formData.amount || !formData.transactionId) {
            toast({
                title: "Missing fields",
                description: "Please fill out both the amount and transaction ID fields.",
                variant: "destructive",
            });
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/recharge-wallet`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ ...formData, providerId: id }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to recharge wallet");
            }

            setIsOpen(false);

            toast({
                title: "Wallet recharged successfully",
                description: `${providerName} wallet has been recharged with ₹${formData.amount}`,
                variant: "default",
            })
        } catch (error) {
            console.error(error);
            toast({
                title: "Error recharging wallet",
                description: "Recharge has been failed",
                variant: "default",
            })
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            amount: "",
            transactionId: "",
        });
    };

    return (
        <>
            <Toaster />
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) resetForm();
            }}>
                <DialogTrigger asChild>
                    <Button variant="green" className="bg-green-600 text-white">
                        Recharge Wallet
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md w-full p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold bg-green-600 text-white">
                            Recharge Wallet
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                className="w-full border rounded-md p-2"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Transaction ID</label>
                            <input
                                type="text"
                                name="transactionId"
                                className="w-full border rounded-md p-2"
                                value={formData.transactionId}
                                onChange={handleChange}
                                placeholder="Enter transaction ID"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="grey" onClick={() => { setIsOpen(false); resetForm(); }} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="green" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Processing..." : (<><CheckIcon className="w-4 h-4 mr-2" /> Confirm</>)}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
