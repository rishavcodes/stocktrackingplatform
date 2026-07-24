"use client"
import EditPortfolio from "@/components/Portfolio/EditPortfolio";
import { useState, useEffect } from "react";

async function fetchPortfolio(id: string) {
    const fetchData = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-portfolio-by-id?id=${id}`,
        { method: "GET" }
    );

    if (fetchData.status !== 200) {
        return [];
    }

    const response = await fetchData.json();

    return response.data;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {

    // const [id, setId] = useState<string>("");

    // useEffect(() => {
    //     const getId = async () => {
    //         const { id } = await params;
    //         setId(id);
    //     };
    //     getId();
    // }, [params]);

    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Get the id and fetch data in one go
                const { id } = await params;
                const portfolioData = await fetchPortfolio(id);
                setPortfolio(portfolioData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params]);

    console.log("portfolio",portfolio)

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <EditPortfolio data={portfolio!} />
    )

}