"use client";

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

type LMSCommercialCardProps = {
    token: string;
    providerId: string;
    initialEnabled?: boolean;
    initialPercentage?: number;
};

export default function LMSCommercialCard({
    token,
    providerId,
    initialEnabled = false,
    initialPercentage = 0,
}: LMSCommercialCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [enabled, setEnabled] = useState(initialEnabled);
    const [percentage, setPercentage] = useState(
        initialPercentage ? initialPercentage.toString() : ""
    );

    const handleSubmit = async () => {
        const value = Number(percentage);

        if (enabled && (value <= 0 || value > 100)) {
            toast({
                title: "Invalid percentage",
                description: "Commission must be between 1 and 100",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/lms-commercial`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        providerId,
                        enabled,
                        commissionPercentage: enabled ? value : 0,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to update LMS commercial");
            }

            toast({
                title: "LMS commercial updated",
                description: enabled
                    ? `Commission set to ${value}% per sale`
                    : "LMS disabled for this provider",
            });

            setIsOpen(false);
        } catch (err) {
            toast({
                title: "Error",
                description: "Unable to save LMS commercial settings",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toaster />
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-purple-600 text-white hover:bg-purple-700">
                        LMS Commercial Settings
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md w-full p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            LMS Commercial
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">
                                Enable LMS for this provider
                            </span>
                        </label>

                        {enabled && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Commission per sale (%)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={percentage}
                                    onChange={(e) => setPercentage(e.target.value)}
                                    className="w-full border rounded-md p-2"
                                    placeholder="e.g. 20"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
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
                            className="bg-purple-600 text-white"
                        >
                            {loading ? "Saving..." : (
                                <>
                                    <CheckIcon className="w-4 h-4 mr-2" /> Save
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
