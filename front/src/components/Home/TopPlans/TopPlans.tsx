"use client";
import { useState, useEffect } from "react";
import { OurServicesType } from "@/lib/types";
import ServiceCard from "@/components/Services/ServiceCard/ServiceCard";
import Link from "next/link";
import { motion } from "framer-motion";

const TopPlans = () => {
  const [filters, setFilters] = useState({ name: "", segment: "All" });
  const [data, setData] = useState<OurServicesType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allservices?segment=${filters.segment}`
        );
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const result = await response.json();
        const sortedData = result.data
          .filter(
            (service: OurServicesType) => typeof service.price === "number"
          )
          .sort(
            (a: OurServicesType, b: OurServicesType) =>
              (a.price ?? 0) - (b.price ?? 0)
          );

        setData(sortedData.slice(0, 3)); // Get the top 3 cheapest plans
        setError(null);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // console.log("this is the top three plan: ", data);

  return (
    <div className="h-auto w-full flex flex-col items-center py-12">
      <h2 className="text-4xl font-league mt-4 text-center">CHOOSE YOUR STRATEGY</h2>
      <p className="text-lg font-league text-[#8F8F8F] w-[80%] md:w-[50vw] text-center my-3 font-light">
        Plans Tailored for Every Budget. Whether you&apos;re just starting out
        or growing fast, we have options designed for every stage.
      </p>

      <motion.div
        className="flex justify-center items-stretch"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{
          delay: 0.2,
          duration: 0.5,
          stiffness: 50,
          type: "spring",
        }}
      >
        <ServiceCard
          servicesArray={data}
          gridLayout="md:p-5 p-3 grid  md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5"
        />
      </motion.div>

      <Link
        href={"/view/allplans"}
        className="text-[##565656] text-2xl underline my-5"
      >
        View all Plans
      </Link>
    </div>
  );
};

export default TopPlans;
