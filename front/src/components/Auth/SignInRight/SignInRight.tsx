"use client";

import EyeIcon from "@/icons/EyeIcon";
import EyeSlashIcon from "@/icons/EyeSlashIcon";
import { FormEvent, useState, ChangeEvent } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import CrossIcon from "@/icons/CrossIcon";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";

type SignInRightProps = { callbackUrl?: string; error?: string };

export default function SignInRight({ callbackUrl, error }: SignInRightProps) {
  const [isPasswordHidden, setIsPasswordHidden] = useState<boolean>(true);

  const [signInFormData, setSignInFormData] = useState({
    email: "",
    password: "",
    // otp: "",
  });

  function handleSignInChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setSignInFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSignInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn("credentials", {
      email: signInFormData.email.toLowerCase(),
      password: signInFormData.password,
      // otp: signInFormData.otp,
      redirect: true,
      callbackUrl: callbackUrl ?? "/",
    });
  }

  return (
    <div className="bg-white dark:bg-blackShade rounded-2xl md:w-[60%] w-[90%] max-md:mx-auto relative">
      <Toaster />
      {!!error && (
        <div className="text-center flex justify-center items-center gap-2 py-5 bg-orange text-white rounded-t-2xl absolute w-full top-0 left-0">
          <CrossIcon className="w-5 h-5" />
          <div className="mt-1">
            Unable to Login. Please check your password and try again.
          </div>
        </div>
      )}
      <div className="sm:px-28 ss:px-20 px-5 py-10 flex gap-5 flex-col justify-center mt-10 items-center">
        <div className="flex gap-2 items-center cursor-pointer">
          <Image
            src={"/images/logo/nav.png"}
            alt="navlogo"
            width={480}
            height={480}
            className="md:w-[70px] sm:w-[60px] w-[50px]"
          />
          <h1 className="md:text-[30px] sm:text-[25px] text-[20px]">
            Trade<span className="font-bold">Box</span>
          </h1>
        </div>

        <div className="w-full mt-10">
          <form
            method="POST"
            className=" flex flex-col gap-5 w-full"
            onSubmit={handleSignInSubmit}
          >
            <input
              type="email"
              placeholder="Email"
              className="focus:outline-none border rounded-3xl pl-6 pr-24 py-2"
              name="email"
              value={signInFormData.email.toLowerCase()}
              onChange={handleSignInChange}
              required
            />
            <div className="relative w-full">
              <input
                type={isPasswordHidden ? "password" : "text"}
                placeholder="Password"
                className="focus:outline-none border rounded-3xl pl-6 pr-24 py-2 w-full"
                name="password"
                value={signInFormData.password}
                onChange={handleSignInChange}
                required
              />
              {isPasswordHidden ? (
                <EyeIcon
                  className="absolute w-6 h-6 cursor-pointer right-5 top-2"
                  onClick={() => setIsPasswordHidden(false)}
                />
              ) : (
                <EyeSlashIcon
                  className="absolute w-6 h-6 cursor-pointer right-5 top-2"
                  onClick={() => setIsPasswordHidden(true)}
                />
              )}
            </div>

            <Link
              href={`/auth/signup/user/?callbackUrl=${callbackUrl}`}
              className="text-[14px] text-blue-300 hover:text-green font-semibold cursor-pointer text-right mt-[-10px]"
            >
              <span className="text-white">Don&#39;t have an account?</span> Sign Up
            </Link>

            <Link
              href={`/auth/forgotpassword`}
              className="text-[14px] text-blue-300 hover:text-green font-semibold cursor-pointer text-right mt-[-10px]"
            >
              Forgot Password?
            </Link>
            <input
              type="submit"
              value={"Login"}
              className="bg-green-600 px-16  text-white cursor-pointer py-3 rounded-2xl w-fit mx-auto"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
