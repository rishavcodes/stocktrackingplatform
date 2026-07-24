"use client";

import { motion } from "framer-motion";

type SectionHeadingProps = {
  heading: { text1: string; text2: string };
  description: string;
};

export default function SectionHeading({
  heading,
  description,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col justify-center items-center text-center font-jakarta">
      <motion.h1
        initial={{ opacity: 0, translateY: 20 }}
        whileInView={{ opacity: 1, translateY: 0 }}
        transition={{
          delay: 0.1,
          duration: 0.5,
          stiffness: 70,
          type: "spring",
        }}
        className="ss:text-[40px] text-[30px] text-indigo dark:text-greenDarkText font-bold font-jakarta"
      >
        {heading.text1}{" "}
        <span className=" text-blueShade relative">
          {heading.text2}
          <div
            className=" absolute h-[4px] w-full bg-black bottom-[-6px] right-0"
            style={{
              background:
                "linear-gradient(270deg, #28B3D8 0%, rgba(40, 179, 216, 0) 99.27%)",
            }}
          ></div>
        </span>
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0, translateY: 40 }}
        whileInView={{ opacity: 1, translateY: 0 }}
        transition={{
          delay: 0.1,
          duration: 0.5,
          stiffness: 70,
          type: "spring",
        }}
        className="text-indigo mt-2 font-jakarta md:w-[60%] sm:w-[80%] w-[90%] sm:text-[16px] text-[14px] mx-auto dark:text-purple"
      >
        {description}
      </motion.h2>
    </div>
  );
}
