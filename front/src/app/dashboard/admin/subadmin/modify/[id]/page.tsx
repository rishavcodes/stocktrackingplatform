"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_MODULES } from "@/constants/adminModules";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export default function EditSubAdminPage() {
    const session = useSession();
    const { toast } = useToast();
    const router = useRouter();
    const { id } = useParams();
    const [form, setForm] = useState({
        name: "",
        number: "",
        isActive: true,
    });
    const [permissions, setPermissions] =
        useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);

    const fetchData = async () => {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subadmin/${id}`,
            {
                method: "GET",
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${session.data?.backendToken}`,
                },
            }
        );
        const json = await res.json();

        setForm({
            name: json.data.name,
            number: json.data.number,
            isActive: json.data.isActive,
        });
        setPermissions(json.data.permissions);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const togglePermission = (key: string) => {
        setPermissions(prev =>
            prev.includes(key)
                ? prev.filter(p => p !== key)
                : [...prev, key]
        );
    };

    const handleUpdate = async () => {
        setUpdateLoading(true);
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subadmin/update/${id}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    ...form,
                    permissions,
                }),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.data?.backendToken}`,
                },
            }
        );

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        setUpdateLoading(false);

        toast({
            title: "Success!",
            description: "Sub admin updated successfully!",
            variant: "success"
        });
        router.push(
            `/dashboard/admin/subadmin/list`
        )
    };

    if (loading) return <p>Loading...</p>;

    return (
        <>
            <Toaster />
            <div className="bg-white p-6 rounded-xl">

                <h2 className="font-semibold mb-6">
                    Modify Sub Admin
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <Input
                        value={form.name}
                        onChange={e =>
                            setForm({
                                ...form,
                                name: e.target.value,
                            })
                        }
                    />

                    <Input
                        value={form.number}
                        onChange={e =>
                            setForm({
                                ...form,
                                number: e.target.value,
                            })
                        }
                    />
                </div>

                <div className="mt-6">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={() =>
                                setForm({
                                    ...form,
                                    isActive: !form.isActive,
                                })
                            }
                        />
                        Active
                    </label>
                </div>

                <div className="mt-6">
                    <h3 className="font-medium mb-3">
                        Permissions
                    </h3>

                    <div className="grid md:grid-cols-3 gap-3">
                        {ADMIN_MODULES.map(mod => (
                            <label
                                key={mod.key}
                                className="flex gap-2"
                            >
                                <input
                                    type="checkbox"
                                    checked={permissions.includes(mod.key)}
                                    onChange={() =>
                                        togglePermission(mod.key)
                                    }
                                />
                                {mod.label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mt-8">
                    <Button
                        onClick={handleUpdate}
                        className="w-full"
                        disabled={updateLoading} 
                    >
                        {updateLoading ? "Saving Changes.." : "Save Changes" }
                    </Button>
                </div>
            </div>
        </>
    );
}
