// app/dashboard/serviceprovider/packages/mypackages/page.tsx
"use client";

import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { ChangeEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import PackagesCard from "@/components/Packages/PackagesCard";
import { authFetch } from "@/lib/authFetch";

export type PackageType = {
    _id: string;
    title: string;
    description: string;
    pricingPlans: {
        price: number;
        validity: number;
    }[];
    includedServices: {
        _id: string;
        title: string;
    }[];
    activated: boolean;
};

export default function MyPackages() {
    const session = useSession();
    const { toast } = useToast();

    const [packages, setPackages] = useState<PackageType[]>([]);
    const [search, setSearch] = useState("");

    /* fetch my packages */
    useEffect(() => {
        if (!session.data?.user.id) return;

        authFetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/mypackages?id=${session.data.user.id}`,
             {
                headers: {
                    Authorization: `Bearer ${session.data.backendToken}`, // ✅ added
                },
            }
        )
            .then(res => res.json())
            .then(data => setPackages(data.data || []))
            .catch(() => {
                toast({
                    title: "Error",
                    description: "Failed to load packages",
                    variant: "destructive",
                });
            });
    }, [session.data?.user.id]);

    /* search */
    function handleSearchUpdate(event: ChangeEvent<HTMLInputElement>) {
        const searchText = event.target.value.toLowerCase();
        setSearch(searchText);

        setPackages(prev =>
            prev.filter(pkg =>
                pkg.title.toLowerCase().includes(searchText)
            )
        );
    }

    return (
        <div className="w-full bg-white flex flex-col gap-5 dark:bg-black p-5">
            <Toaster />

            <div className="bg-lightGrey w-fit rounded-lg flex px-5 py-2">
                <input
                    placeholder="Search"
                    className="focus:outline-none bg-lightGrey"
                    onChange={handleSearchUpdate}
                    value={search}
                />
                <Search className="cursor-pointer" />
            </div>

            <PackagesCard
                packages={packages}
                setPackages={setPackages}
                token={session.data?.backendToken!}
            />
        </div>
    );
}
