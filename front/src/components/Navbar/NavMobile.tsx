"use client";

import CrossIcon from "@/icons/CrossIcon";
import HamIcon from "@/icons/HamIcon";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { dropDownData } from "./NavbarConstants";
import Link from "next/link";

export default function NavMobile() {
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);

  return (
    <div className="sm:hidden flex">
      {!isNavOpen ? (
        <HamIcon
          className="w-7 h-7 cursor-pointer"
          onClick={() => {
            setIsNavOpen(true);
          }}
        />
      ) : (
        <CrossIcon
          className="w-7 h-7 cursor-pointer"
          onClick={() => {
            setIsNavOpen(false);
          }}
        />
      )}
      <AnimatePresence>
        {isNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              delay: 0.1,
              duration: 0.5,
              type: "spring",
              stiffness: 50,
            }}
            className="bg-whiteShade/60 dark:bg-blackShade/60 backdrop-blur-md w-screen h-screen top-16 left-0 absolute z-[1000]"
          >
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{
                delay: 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 50,
              }}
              className="w-[80%] mx-auto mt-5 origin-top"
            >
              <Accordion type="single" className="mt-5 mb-4" collapsible>
                {dropDownData.map((drop) => {
                  return (
                    <AccordionItem key={drop.title} value={drop.title}>
                      {" "}
                      <AccordionTrigger>{drop.title}</AccordionTrigger>
                      {drop.list.map((list) => (
                        <AccordionContent
                          key={list.title}
                          onClick={() => {
                            window.location.href = list.href;
                            setIsNavOpen(false);
                          }}
                        >
                          {list.title}
                        </AccordionContent>
                      ))}
                    </AccordionItem>
                  );
                })}
              </Accordion>
              <Link href={"/marketplace/articles"} className="pt-5 block">
                Market Place
              </Link>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/auth/provider/signin"
                  className="block text-center bg-[#02d2bf] text-white font-semibold py-2 px-4 rounded-lg"
                  onClick={() => setIsNavOpen(false)}
                >
                  Sign in as Expert
                </Link>
                <Link
                  href="/auth/user/signin"
                  className="block text-center bg-[#02d2bf] text-white font-semibold py-2 px-4 rounded-lg"
                  onClick={() => setIsNavOpen(false)}
                >
                  Sign in as Customer
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
