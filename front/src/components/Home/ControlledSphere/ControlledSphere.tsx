"use client";

import Image from "next/image";
import SectionHeading from "../SectionHeading";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import Autoplay from "embla-carousel-autoplay";

const carouselImages = [
  "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/ads/EXPLORE-PLANS-Now-5_1.avif",
  "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/ads/IMG_2362_3_11zon.jpg",
  "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/ads/IMG_2364_1_11zon.jpg",
];

export default function ControlledSphere() {
  return (
    <div className="dark:bg-blackShade md:w-[90%] sm:w-[80%] w-full mx-auto">
      <SectionHeading
        heading={{ text1: "Controlled", text2: "Sphere" }}
        description="Navigating the Regulated Environment with SEBI Registered service providers, The system prioritizes transparency, credibility, and adherence to regulatory frameworks, fostering a trustworthy environment for investors, analysts, and stakeholders alike. By implementing rigorous verification protocols"
      />
      <div className="mt-10"></div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000,
          }),
        ]}
      >
        <CarouselContent>
          {carouselImages.map((carousel) => (
            <CarouselItem key={carousel}>
              {" "}
              <Link href={"/view/allplans"}>
                {" "}
                <Image
                  src={carousel}
                  alt={"ad"}
                  width={1920}
                  height={1080}
                  className="w-full"
                />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
