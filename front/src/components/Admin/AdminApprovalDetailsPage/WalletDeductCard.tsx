import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CheckIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

type WalletDeductCardProps = {
    token: string;
    providerName: string;
    id: string;
    currentBalance: number;
};

export default function WalletDeductCard({ token, providerName, id, currentBalance }: WalletDeductCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        amount: "",
        remarks: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const amount = Number(formData.amount);

        if (amount <= 0) {
            toast({ title: "Invalid Amount", description: "Amount must be a positive number", variant: "destructive" });
            return;
        }
        if (amount > currentBalance) {
            toast({ title: "Insufficient Balance", description: `Cannot deduct ₹${amount}. Current balance is ₹${currentBalance.toFixed(2)}`, variant: "destructive" });
            return;
        }
        if (!formData.remarks.trim()) {
            toast({ title: "Remarks required", description: "Please enter a reason for this deduction.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deduct-wallet`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ amount, providerId: id, remarks: formData.remarks }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to deduct from wallet");
            }

            setIsOpen(false);
            toast({ title: "Wallet deducted successfully", description: `₹${formData.amount} has been deducted from ${providerName}'s wallet` });
            resetForm();
            window.location.reload();
        } catch (error) {
            toast({ title: "Error deducting from wallet", description: error instanceof Error ? error.message : "Deduction has failed", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => setFormData({ amount: "", remarks: "" });

    return (
        <>
            <Toaster />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                    <Button variant="destructive" className="bg-red-600 text-white">
                        Deduct Wallet
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md w-full p-6 space-y-5">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold text-gray-900">Deduct from Wallet</DialogTitle>
                    </DialogHeader>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        <strong>Warning:</strong> You are deducting from {providerName}&apos;s wallet.
                        Current balance: <strong>₹{currentBalance.toFixed(2)}</strong>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount to Deduct</label>
                            <input
                                type="number"
                                name="amount"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                max={currentBalance}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Remarks <span className="text-red-500">*</span></label>
                            <textarea
                                name="remarks"
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                                value={formData.remarks}
                                onChange={handleChange}
                                placeholder="Reason for deduction (e.g. penalty, manual adjustment, refund processing...)"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">This will be visible in transaction history for both admin and provider.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" onClick={() => { setIsOpen(false); resetForm(); }} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
                            {loading ? "Processing..." : (<><CheckIcon className="w-4 h-4 mr-2" />Confirm Deduction</>)}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
