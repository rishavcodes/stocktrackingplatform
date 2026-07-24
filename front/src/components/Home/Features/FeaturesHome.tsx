"use client";

import FeatOneIcon from "@/icons/HomeFeatures/FeatOneIcon";
import SectionHeading from "../SectionHeading";
import FeatTwoIcon from "@/icons/HomeFeatures/FeatTwoIcon";
import { motion } from "framer-motion";

export default function FeaturesHome() {
  return (
    <div className="py-20 dark:bg-blackShade">
      <SectionHeading
        heading={{ text1: "Top-Notch ", text2: "Features" }}
        description=""
      />
      <div className="flex flex-col mt-5 w-[80%] mx-auto gap-5">
        <div className="flex ss:flex-row flex-col sm:gap-10 gap-2">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{
              delay: 0.2,
              duration: 0.5,
              stiffness: 50,
              type: "spring",
            }}
            className="flex flex-col bg-green/20 dark:bg-black ss:w-[40%] p-5 gap-1 rounded-xl "
          >
            <FeatOneIcon className=" dark:bg-blackShade" />
            <h1 className="text-indigo dark:text-green font-semibold text-[20px]">
              Introducing a cutting-edge fintech solution:
            </h1>
            <p className=" text-darkBlue dark:text-red-100">
              Explore a range of credible advisory services offered by leading
              companies in the industry. These trusted advisories provide
              valuable insights and guidance to help navigate various aspects of
              Finance
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{
              delay: 0.4,
              duration: 0.5,
              stiffness: 50,
              type: "spring",
            }}
            className="flex flex-col bg-blue/20 dark:bg-blue/10 p-5 rounded-xl gap-1 ss:w-[60%] mx-auto"
          >
            <FeatTwoIcon />
            <h1 className="text-indigo dark:text-blue font-semibold text-[20px]">
              Read, Watch, listen to analysts in your language specifically to
              your asset class
            </h1>
            <p className=" text-darkBlue dark:text-darkGrey">
              Introducing a tailored platform that allows you to delve into
              comprehensive insights from analysts and, more importantly,
              focused exclusively on your asset class. This offers a diverse
              array of resources, including written articles, video content, and
              audio recordings, curated to cater to your specific investment
              interests.
            </p>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{
            delay: 0.5,
            duration: 0.5,
            stiffness: 50,
            type: "spring",
          }}
          className="flex flex-col bg-blue/20 dark:bg-black/50 p-5 rounded-xl gap-1 mx-auto"
        >
          <h1 className="text-indigo dark:text-white font-semibold text-[20px]">
            Direct Analyst Insights: Tailored Asset Class Research with
            Performance Ratings
          </h1>
          <p className=" text-darkBlue dark:text-darkGrey">
            Introducing an innovative platform that enables users to access
            premium research directly from analysts specializing in their chosen
            asset class. This cutting-edge platform revolutionizes the way
            investors gain insights, offering direct access to high-quality
            research tailored to specific asset classes.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
