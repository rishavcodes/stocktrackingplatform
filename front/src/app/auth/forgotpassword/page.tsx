import { ForgotPassRight } from "@/components";
import Image from "next/image";

export default function page() {
  return (
    <div className="bg-gradient-to-t from-teal-500 to-cyan-400 h-screen overflow-hidden">
      <div className="flex md:flex-row flex-col-reverse md:w-[80%] w-[95%] mx-auto pt-[40px] max-md:pb-10 ss:gap-20 gap-5">
        <Image
          src={"/images/login/login.png"}
          alt="login"
          width={1280}
          height={720}
          className="md:w-[50%] w-[60%] max-md:mx-auto aspect-square h-auto"
        />
        <ForgotPassRight />
      </div>
    </div>
  );
}
