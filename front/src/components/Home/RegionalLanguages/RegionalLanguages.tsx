"use client";

import Image from "next/image";
import SectionHeading from "../SectionHeading";
import { motion } from "framer-motion";

export default function RegionalLanguages() {
  return (
    <div className="flex md:flex-row flex-col items-center gap-5 w-[80%] font-jakarta my-20">
      <div className="gap-5 flex flex-col">
        <SectionHeading
          heading={{ text1: "Regional", text2: "Languages" }}
          description=""
        />
        <div className="flex flex-col gap-5 sm:text-[15px] text-[13px]">
          <motion.p
            initial={{ opacity: 0, translateY: 20 }}
            whileInView={{ opacity: 1, translateY: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.5,
              stiffness: 70,
              type: "spring",
            }}
            className="text-indigo dark:text-purple"
          >
            {`Tradebox offers a personalized and tailored experience, providing
          users with content that aligns perfectly with their language
          preferences. We aim to cater to individuals who prefer consuming
          content in their regional languages. Whether it's articles, news
          updates or educational material, our platform ensures that you receive
          information in a language you're comfortable with.`}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, translateY: 20 }}
            whileInView={{ opacity: 1, translateY: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.5,
              stiffness: 70,
              type: "spring",
            }}
            className="text-indigo dark:text-purple"
          >
            {`With a wide array of languages supported, our goal is to make information accessible and engaging for everyone, breaking language barriers and fostering inclusivity. Experience a seamless journey through curated content that resonates with your linguistic choices, enhancing your browsing or learning experience like never before.`}
          </motion.p>
        </div>
      </div>

      <Image
        src={"/images/languages/languages.png"}
        alt="languages"
        width={480}
        height={480}
        className=" h-auto md:w-[40%] sm:w-[60%] w-[80%]"
      />
    </div>
  );
}
