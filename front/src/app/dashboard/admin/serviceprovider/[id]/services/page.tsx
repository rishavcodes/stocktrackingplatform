"use client";

import { useState, useEffect } from "react";
import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import useSWR from "swr";
import Link from "next/link";
import { PostRemovalBox } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function Servicespage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const { data, isLoading, error } = useSWR<{
    data: OurServicesType[];
  }>(
    id ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservices?id=${id}` : null,
    fetcher
  );

  const session = useSession();

  const returnArray = ["1M", "6M", "1Y", "3Y", "5Y"];

  return (
    <div className="mt-10 ml-5">
      <Toaster />
      <Link
        href={`/dashboard/admin/serviceprovider/${id}`}
        className=" bg-green px-5 py-3"
      >
        Back
      </Link>

      <div className="flex flex-wrap gap-5 mt-10">
        {data?.data.map((service) => {
          return (
            <div
              key={service._id}
              className={`bg-white dark:bg-black relative p-5 w-[500px] rounded-lg shadow-sm flex flex-col gap-3 ${service.serviceType === "fund" ? "cursor-pointer" : "cursor-default"
                }`}
            >
              {/* Remove Button */}
              <PostRemovalBox
                id={service._id}
                type="removeservice"
                position="right-2"
                token={session.data?.user.backendToken!}
              />

              {/* Banner Image */}
              {service.bannerURL && (
                <div className="w-full">
                  <Image
                    src={service.bannerURL}
                    alt={`${service.title} banner`}
                    width={500}
                    height={250}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <div className="flex items-center justify-between w-full">
                <div className="font-semibold text-[20px]">{service.title}</div>
              </div>

              <hr className="mt-2 border-darkGrey/40 dark:border-darkGrey" />

              {/* Validity */}
              {service.validity && (
                <div className="text-darkGrey dark:text-white/70 text-[14px]">
                  <span className="text-blue font-medium">Validity:</span>{" "}
                  {new Date(service.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(service.validity).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })}
                </div>
              )}

              {/* Price */}
              {service.price && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">Pricing:</span>{" "}
                  ₹{service.price}{" "}
                  {service.coupon && service.coupon > 0 && (
                    <span className="ml-1 text-green-600">
                      ({service.coupon}% OFF)
                    </span>
                  )}
                </div>
              )}

              {/* Service Type */}
              <div className="text-darkGrey dark:text-white/70">
                <span className="text-blue font-medium">Service Type:</span>{" "}
                {service.serviceType}
              </div>

              {service.pricingPlans && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Pricing Plans:</h4>
                  <ul className="space-y-1">
                    {service.pricingPlans.map((plan, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex justify-between border-b pb-1"
                      >
                        <span>{plan.validity} days</span>
                        <span>₹{plan.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Telegram Channel */}
              {service.telegramChannelId && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">
                    Telegram Channel ID:
                  </span>{" "}
                  {service.telegramChannelId}
                </div>
              )}

              {/* T&C File */}
              {service.tncFileURL && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">T&C:</span>{" "}
                  <Link
                    href={service.tncFileURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-500 hover:text-blue-700"
                  >
                    View Terms & Conditions
                  </Link>
                </div>
              )}

              {/* Extra Details (if needed) */}
              {service.AUM && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">AUM:</span>{" "}
                  {service.AUM}
                </div>
              )}
              {service.NoOfClients && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">
                    Number of Clients:
                  </span>{" "}
                  {service.NoOfClients}
                </div>
              )}
              {service.Fundmanager && (
                <div className="text-darkGrey dark:text-white/70">
                  <span className="text-blue font-medium">
                    Fund Manager:
                  </span>{" "}
                  {service.Fundmanager}
                </div>
              )}

              {/* Returns Section (if service type is fund) */}
              {service.returnsByTime && service.serviceType === "fund" && (
                <div className="mt-5 flex flex-col justify-center items-center gap-2 w-full border-t pt-3 border-darkGrey/40 dark:border-darkGrey">
                  <div className="text-blue font-medium">Returns</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {service.returnsByTime?.map((returnItem, index) => (
                      <div
                        key={returnItem + index}
                        className="bg-lightBlue dark:bg-lightGrey/10 px-2 py-1 text-[14px] rounded-xl"
                      >
                        {returnArray[index]} -{" "}
                        {returnItem !== null ? returnItem + "%" : "N/A"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
