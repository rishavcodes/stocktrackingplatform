"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

interface SubAdmin {
    _id: string;
    name: string;
    email: string;
    number: string;
    permissions: string[];
    createdAt: string;
}

export default function AllSubAdminsPage() {
    const session = useSession()
    const router = useRouter()
    const {toast} = useToast();
    const [data, setData] = useState<SubAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null); // id

    const fetchSubAdmins = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subadmin/all`, {
            method: "GET", 
            headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${session.data?.backendToken}`,
            },
        });
        const json = await res.json();
        console.log(json.data)
        setData(json.data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSubAdmins();
    }, []);

    const handleDelete = async (id: string) => {
        const confirm = window.confirm(
            "Are you sure you want to delete this sub admin?"
        );
        if (!confirm) return;

        try {
            setDeleteLoading(id);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/subadmin/delete/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${session.data?.backendToken}`,
                    },
                }
            );

            const data = await res.json();

            if (!res.ok) {
                toast({
                    title: "Error",
                    description: data.message,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Deleted",
                description: "Sub admin removed successfully",
                variant: "success",
            });

            // remove from UI
            setData(prev =>
                prev.filter(item => item._id !== id)
            );

        } finally {
            setDeleteLoading(null);
        }
    };

    if (loading) return <p>Loading...</p>;

    return (
        <>
            <Toaster />
            <div className="bg-white dark:bg-blackShade p-6 rounded-xl shadow">

                <h2 className="text-lg font-semibold mb-4">
                    All Sub Admins
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full border">

                        <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Email</th>
                                <th className="p-3 text-left">Number</th>
                                <th className="p-3 text-left">Permissions</th>
                                <th className="p-3 text-left">Created</th>
                                <th className="p-3 text-left">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data?.map((item) => (
                                <tr key={item?._id} className="border-t">

                                    <td className="p-3">{item?.name}</td>
                                    <td className="p-3">{item?.email}</td>
                                    <td className="p-3">{item?.number}</td>

                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {item?.permissions?.map(p => (
                                                <span
                                                    key={p}
                                                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                                                >
                                                    {p?.replace("_", " ")}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    <td className="p-3">
                                        {new Date(item?.createdAt)
                                            .toLocaleDateString("en-IN")}
                                    </td>

                                    <td className="p-3 flex gap-2">

                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/admin/subadmin/modify/${item._id}`
                                                )
                                            }
                                        >
                                            Modify
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                        >
                                            Delete
                                        </Button>

                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            </div>
        </>
    );
}
