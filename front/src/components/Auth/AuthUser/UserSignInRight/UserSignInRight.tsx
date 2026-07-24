"use client";

import { Input } from "@/components";
import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import EyeIcon from "@/icons/EyeIcon";
import EyeSlashIcon from "@/icons/EyeSlashIcon";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type userSignInProps = {
  name: string;
  email: string;
  number: number;
  otp: string;
  password: string;
  confirmpassword?: string;
};

export default function UserSignInRight({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [userSignInData, setUserSignInData] = useState<userSignInProps>({
    name: "",
    email: "",
    number: Number(null),
    otp: "",
    password: "",
  });

  const [isOTPRequested, setIsOTPRequested] = useState<boolean>(false);
  const [isOTPVerified, setIsOTPVerified] = useState<boolean>(false);

  const [isPassHidden, setIsPassHidden] = useState<boolean>(true);
  const [isConfirmPassHidden, setIsConfirmPassHidden] = useState<boolean>(true);

  function userDataChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setUserSignInData((prev) => ({ ...prev, [name]: value }));
  }

  async function requestForOTP() {
    if (userSignInData.email === "") {
      toast({
        title: "Email required",
        description: "Please write email address before requesting for OTP",
        variant: "destructive",
      });
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestotp`,
      {
        method: "POST",
        body: JSON.stringify({ email: userSignInData.email }),
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
    if (userSignInData.email === "") {
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
          email: userSignInData.email,
          otp: userSignInData.otp,
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

  async function userSignUpSubmitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (userSignInData.password !== userSignInData.confirmpassword) {
      toast({
        title: "Passwords do not match",
        description: "please check your passwords and try again",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/user/signup`,
        {
          method: "POST",
          body: JSON.stringify({
            ...userSignInData,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const res = await response.json();

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Signed Up successfully",
          variant: "default",
        });

        // Extract token or session data from response
        const { token } = res;

        // Sign in the user
        await signIn("credentials", {
          email: userSignInData.email,
          password: userSignInData.password,
          callbackUrl: callbackUrl ?? "/",
        });

        // if (signInResponse) {
        //   // Redirect to the callbackUrl or a default event page
        //   setTimeout(() => {
        //     router.push(callbackUrl || "/"); // Adjust '/events' to your event page path
        //   }, 2000);
        // }
      } else {
        toast({
          title: "Error!",
          description: "Error signing up please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "Error signing up please try again",
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
          onSubmit={userSignUpSubmitHandler}
        >
          <Input
            title="E-mail"
            type="text"
            name="email"
            disabled={isOTPRequested}
            value={userSignInData.email}
            onChange={userDataChangeHandler}
          />

          {isOTPVerified && (
            <div className="flex flex-col gap-5 w-full">
              <Input
                title="Name"
                type="text"
                name="name"
                value={userSignInData.name}
                onChange={userDataChangeHandler}
              />
              <Input
                title="Phone No."
                type="number"
                name="number"
                value={userSignInData.number}
                onChange={userDataChangeHandler}
              />

              <div className="relative w-full">
                <Input
                  title="Password"
                  type={isPassHidden ? "password" : "text"}
                  name="password"
                  onChange={userDataChangeHandler}
                  value={userSignInData.password}
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
                  name="confirmpassword"
                  onChange={userDataChangeHandler}
                  value={userSignInData.confirmpassword}
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
              value={userSignInData.otp}
              onChange={userDataChangeHandler}
              required
            />
          )}

          {isOTPVerified ? (
            <input
              type="submit"
              value={"Sign Up"}
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
