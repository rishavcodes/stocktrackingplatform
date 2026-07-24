"use client";

import { Input } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import useSWR from "swr";

type RazorpayDetailsProps = {
    _id?: string;
    keyId: string;
    keySecret: string;
    webhookSecret: string;
};

export default function RazorpayDetails() {
    const session = useSession();
    const { toast } = useToast();

    const { data } = useSWR<{ data: RazorpayDetailsProps }>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/razorpaykeys?id=${session.data?.user._id}`,
        fetcher
    );

    const [details, setDetails] = useState<RazorpayDetailsProps>({
        _id: "",
        keyId: "",
        keySecret: "",
        webhookSecret: "",
    });

    useEffect(() => {
        if (data?.data) {
            setDetails(data.data);
        }
    }, [data?.data]);

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setDetails((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/add/razorpaykeys`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: session.data?.user._id,
                        name: session.data?.user.RegName,
                        email: session.data?.user.email,
                        ...details,
                    }),
                }
            );

            if (res.status !== 200) {
                toast({
                    title: "Error",
                    description: "Failed to add Razorpay keys",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Success",
                description: "Razorpay keys added successfully",
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        }
    }

    async function updateDetails() {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/update/razorpaykeys`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(details),
                }
            );

            if (res.status !== 200) {
                toast({
                    title: "Error",
                    description: "Failed to update Razorpay keys",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Success",
                description: "Razorpay keys updated successfully",
                variant: "default",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="min-h-screen p-6 dark:bg-blackShade">
            <Toaster />

            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold">Razorpay API Configuration</h1>

                <form className="space-y-8" onSubmit={handleSubmit}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold mb-6">Enter Razorpay API Keys</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                title={"Key ID"}
                                type={"text"}
                                name={"keyId"}
                                value={details.keyId}
                                onChange={handleChange}
                                required={true}
                                height="py-3"
                            />
                            <Input
                                title={"Key Secret"}
                                type={"password"}
                                name={"keySecret"}
                                value={details.keySecret}
                                onChange={handleChange}
                                required={true}
                                height="py-3"
                            />
                            <Input
                                title={"Webhook Secret"}
                                type={"text"}
                                name={"webhookSecret"}
                                value={details.webhookSecret}
                                onChange={handleChange}
                                required={true}
                                height="py-3"
                            />
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            {data?.data ? (
                                <button
                                    type="button"
                                    onClick={updateDetails}
                                    className="bg-green-600 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-md transition-colors"
                                >
                                    Update Keys
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-md transition-colors"
                                >
                                    Add Keys
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
