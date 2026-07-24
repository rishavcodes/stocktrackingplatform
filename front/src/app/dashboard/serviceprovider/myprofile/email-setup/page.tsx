"use client";

import { Input } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

type EmailSettings = {
    _id?: string;
    whitelabelEmail: string;
    whitelabelPassword: string;
};

export default function EmailSetup() {
    const session = useSession();
    const { data } = useSWR<{ data: EmailSettings }>(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/get-settings?id=${session.data?.user.id}`,
        fetcher
    );

    const { toast } = useToast();
    const [settings, setSettings] = useState<EmailSettings>({
        whitelabelEmail: "",
        whitelabelPassword: "",
    });

    useEffect(() => {
        if (data?.data) {
            setSettings(data.data);
        }
    }, [data?.data]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setSettings((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/email/update-settings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: session.data?.user.id,
                        ...settings,
                    }),
                }
            );

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Email settings saved successfully",
                    variant: "default",
                });
            } else {
                throw new Error("Failed to save settings");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save email settings",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="min-h-screen p-6 dark:bg-blackShade">
            <Toaster />

            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold">Email Configuration</h1>

                <form onSubmit={handleSubmit}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold mb-6">SMTP Settings</h2>

                        <div className="grid grid-cols-2 gap-6">
                            <Input
                                title="Whitelabel Email ID"
                                type="email"
                                name="whitelabelEmail"
                                value={settings.whitelabelEmail}
                                onChange={handleChange}
                                height="py-3"
                                placeholder="yourname@yourdomain.com"
                                required
                            />

                            <Input
                                title="App Password"
                                type="password"
                                name="whitelabelPassword"
                                value={settings.whitelabelPassword}
                                onChange={handleChange}
                                height="py-3"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex justify-end mt-8">
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-md transition-colors"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}