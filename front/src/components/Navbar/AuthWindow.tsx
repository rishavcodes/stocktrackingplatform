"use client";

import EmailIcon from "@/icons/EmailIcon";
import { setauthWindow } from "@/store/slices/authWindow";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";

export default function AuthWindow() {
  const dispatch = useDispatch();

  return (
    <div className="absolute left-0 top-0 w-full h-screen flex justify-center items-center">
      <div
        className="absolute left-0 backdrop-blur-sm top-0 w-full h-screen flex justify-center items-center z-[599]"
        onClick={() => dispatch(setauthWindow(false))}
      >
        <div></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          delay: 0.1,
          duration: 0.2,
        }}
        className="bg-white dark:bg-black xs:w-fit w-[90%] p-10 z-[999] rounded-2xl text-black dark:text-whiteShade flex flex-col gap-5 items-center"
      >
        <div className=" flex flex-col items-center gap-2">
          <div className="text-center">
            Ready to unlock your financial potential?
          </div>
          <div className=" text-[20px] font-medium">Join Us!</div>

          <div className="flex gap-2 items-center text-[25px] cursor-pointer">
            <Image
              src={"/images/logo/nav.png"}
              alt="navlogo"
              width={50}
              height={50}
            />
            <h1>
              Trade<span className="font-bold">Box</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-col w-full justify-center items-center">
          <Link
            href={"/auth/signup/user"}
            onClick={() => dispatch(setauthWindow(false))}
            className="flex items-center gap-5 border border-darkGrey ss:px-20 xs:px-14 px-5 py-2 rounded-3xl cursor-pointer hover:bg-lightGrey dark:hover:bg-blackShade duration-500"
          >
            <EmailIcon className="w-5 h-5 ss:text-[15px] text-[13px]" />
            <div>Sign up with email</div>
          </Link>
        </div>

        <div className="ss:text-[16px] text-[15px]">
          Already have an account?{" "}
          <Link
            className="text-blue"
            onClick={() => dispatch(setauthWindow(false))}
            href={"/auth/signin"}
          >
            Sign in
          </Link>{" "}
        </div>
      </motion.div>
    </div>
  );
}
