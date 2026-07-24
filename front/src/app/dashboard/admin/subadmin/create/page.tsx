"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ADMIN_MODULES } from "@/constants/adminModules";

export default function CreateSubAdminPage() {
    const session = useSession();
    const { toast } = useToast()
    const initialForm = {
        name: "",
        email: "",
        number: "",
    };

    const [form, setForm] = useState(initialForm);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: any) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const togglePermission = (key: string) => {
        setPermissions(prev =>
            prev.includes(key)
                ? prev.filter(p => p !== key)
                : [...prev, key]
        );
    };

    const resetForm = () => {
        setForm(initialForm);
        setPermissions([]);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subadmin/create`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        ...form,
                        permissions,
                    }),
                    headers: {
                        "Content-type": "application/json",
                        Authorization: `Bearer ${session.data?.backendToken}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed");
            }

            toast({
                title: "Success",
                description: "Sub admin created!",
                variant: "success",
            });
            resetForm();

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toaster />
            <div className="max-w-7xl bg-white dark:bg-blackShade p-6 rounded-xl shadow">

                <h2 className="text-lg font-semibold mb-6">
                    Create Sub Admin
                </h2>

                {/* BASIC INFO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <Input
                        name="name"
                        placeholder="Full Name"
                        value={form.name}
                        onChange={handleChange}
                    />

                    <Input
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                    />

                    <Input
                        name="number"
                        placeholder="Phone Number"
                        value={form.number}
                        onChange={handleChange}
                    />
                </div>

                {/* PERMISSIONS */}
                <div className="mt-6">

                    <h3 className="font-medium mb-3">
                        Enable Tabs
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ADMIN_MODULES.map(mod => (
                            <label
                                key={mod.key}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="checkbox"
                                    checked={permissions.includes(mod.key)}
                                    onChange={() =>
                                        togglePermission(mod.key)
                                    }
                                />
                                <span className="text-sm">
                                    {mod.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-8 flex justify-between items-center gap-4">

                    <Button
                        variant="outline"
                        onClick={resetForm}
                        className="w-fit"
                    >
                        Reset
                    </Button>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-fit"
                    >
                        {loading ? "Creating..." : "Create Sub Admin"}
                    </Button>
                </div>
            </div>
        </>
    );
}
