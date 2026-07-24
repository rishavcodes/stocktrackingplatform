"use client";

import { Input } from "@/components";
import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import EyeIcon from "@/icons/EyeIcon";
import EyeSlashIcon from "@/icons/EyeSlashIcon";

type ForgotPassword = {
  email: string;
  otp: string;
  newPassword: string;
  confirmNewPassword?: string;
};

export default function ForgotPassRight() {
  const { toast } = useToast();

  const [isOTPRequested, setIsOTPRequested] = useState<boolean>(false);
  const [isOTPVerified, setIsOTPVerified] = useState<boolean>(false);

  const [isPassHidden, setIsPassHidden] = useState<boolean>(true);
  const [isConfirmPassHidden, setIsConfirmPassHidden] = useState<boolean>(true);

  const [forgotPassData, setForgotPassData] = useState<ForgotPassword>({
    email: "",
    otp: "",
    newPassword: "",
  });

  function passChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForgotPassData((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (forgotPassData.newPassword !== forgotPassData.confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "please check your passwords and try again",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/resetpassword`,
        {
          method: "POST",
          body: JSON.stringify({
            email: forgotPassData.email,
            newPassword: forgotPassData.newPassword,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Password updated",
          variant: "default",
        });

        setTimeout(() => {
          window.location.href = "/auth/signin";
        }, 2000);
      } else {
        toast({
          title: "Error!",
          description: "Error resetting password please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "Error resetting password please try again",
        variant: "destructive",
      });
    }
  }

  async function requestForOTP() {
    if (forgotPassData.email === "") {
      toast({
        title: "Email required",
        description: "Please write email address before requesting for OTP",
        variant: "destructive",
      });
      return;
    }

    const checkUserFetch = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL
      }/api/auth/checkforuser?email=${forgotPassData.email.toLowerCase()}`,
      {
        method: "GET",
      }
    );

    if (checkUserFetch.status !== 200) {
      toast({
        title: "User Not Found",
        description:
          "User Not Found Please verify you have written correct email address",
        variant: "destructive",
      });

      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestpassresetotp`,
      {
        method: "POST",
        body: JSON.stringify({ email: forgotPassData.email }),
        headers: {
          "Content-type": "application/json",
        },
      }
    );
    const res = await response.json();
    if (response.status === 200) {
      toast({
        title: "OTP Sent",
        description: "OTP Sent to your given mail address",
        variant: "default",
      });
      setIsOTPRequested(true);
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
  }

  async function submitOTP() {
    if (forgotPassData.email === "") {
      toast({
        title: "Email required",
        description: "Please write email address before submitting OTP",
        variant: "destructive",
      });
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/checkotp`,
      {
        method: "POST",
        body: JSON.stringify({
          email: forgotPassData.email,
          otp: forgotPassData.otp,
        }),
        headers: {
          "Content-type": "application/json",
        },
      }
    );

    const res = await response.json();

    if (response.status === 200) {
      toast({
        title: "OTP Verified",
        description: "OTP Succesfully verified",
        variant: "default",
      });
      setIsOTPVerified(true);
    } else {
      toast({
        title: "Error!",
        description: res.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="bg-white dark:bg-blackShade rounded-2xl md:w-[60%] w-[90%] max-md:mx-auto relative">
      <Toaster />
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

        <form
          method="POST"
          className="w-full flex flex-col gap-5 items-center"
          onSubmit={handlePassSubmit}
        >
          <Input
            title="E-mail"
            type="text"
            name="email"
            disabled={isOTPRequested}
            value={forgotPassData.email}
            onChange={passChangeHandler}
          />

          {isOTPVerified && (
            <div className="flex flex-col gap-5 w-full">
              <div className="relative w-full">
                <Input
                  title="Password"
                  type={isPassHidden ? "password" : "text"}
                  name="newPassword"
                  onChange={passChangeHandler}
                  value={forgotPassData.newPassword}
                />

                {isPassHidden ? (
                  <EyeIcon
                    className="absolute w-6 h-6 cursor-pointer right-5 bottom-1"
                    onClick={() => setIsPassHidden(false)}
                  />
                ) : (
                  <EyeSlashIcon
                    className="absolute w-6 h-6 cursor-pointer right-5 bottom-1"
                    onClick={() => setIsPassHidden(true)}
                  />
                )}
              </div>

              <div className="relative w-full">
                <Input
                  title="Enter Password Again"
                  type={isConfirmPassHidden ? "password" : "text"}
                  name="confirmNewPassword"
                  onChange={passChangeHandler}
                  value={forgotPassData.confirmNewPassword}
                />

                {isConfirmPassHidden ? (
                  <EyeIcon
                    className="absolute w-6 h-6 cursor-pointer right-5 bottom-1"
                    onClick={() => setIsConfirmPassHidden(false)}
                  />
                ) : (
                  <EyeSlashIcon
                    className="absolute w-6 h-6 cursor-pointer right-5 bottom-1"
                    onClick={() => setIsConfirmPassHidden(true)}
                  />
                )}
              </div>
            </div>
          )}

          {isOTPRequested && !isOTPVerified && (
            <Input
              title=""
              type="text"
              placeholder="OTP"
              name="otp"
              height="py-2"
              value={forgotPassData.otp}
              onChange={passChangeHandler}
              required
            />
          )}

          {isOTPVerified ? (
            <input
              type="submit"
              value={"Change Password"}
              className="bg-green px-10 py-3 rounded-xl mt-10 w-fit mx-auto text-white cursor-pointer"
            />
          ) : (
            <>
              {" "}
              {!isOTPRequested ? (
                <div
                  className="bg-blue/10  w-fit px-5 py-2 cursor-pointer text-blue"
                  onClick={requestForOTP}
                >
                  Request OTP
                </div>
              ) : (
                <div
                  className="bg-blue/10  w-fit px-5 py-2 cursor-pointer text-blue"
                  onClick={submitOTP}
                >
                  Verify OTP
                </div>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
