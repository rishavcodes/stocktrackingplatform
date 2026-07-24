import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

type ContactDialougeProps = {
  id: string;
  setIsContactDialogueOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type contactDetailType = {
  profileUrl: string;
  RegName: string;
  email: string;
  number: string;
  address1: string;
  address2: string;
};

export default function ContactDialouge({
  id,
  setIsContactDialogueOpen,
}: ContactDialougeProps) {
  // const { data, isLoading, error } = useSWR<{ data: contactDetailType }>(
  //   `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/spcontactdetails?id=${id}`,
  //   fetcher
  // );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        stiffness: 100,
      }}
      className="fixed w-full h-screen  top-0 left-0 flex justify-center items-center"
    >
      <div
        onClick={() => setIsContactDialogueOpen(false)}
        className="absolute left-0 backdrop-blur-sm top-0 w-full h-screen flex justify-center items-center z-[599]"
      >
        <div></div>
      </div>
      <div className="bg-white dark:bg-black w-fit p-5 z-[999] rounded-2xl text-black dark:text-whiteShade flex flex-col gap-5 items-center justify-center">
        <Link
          href={`/view/serviceprovider/${id}/services`}
          className="flex items-center gap-3 cursor-pointer"
        >
          <Avatar className="h-20 w-20 cursor-pointer">
            <AvatarImage src={"/images/logo/nav.png"} alt="profile-avatar" />

            <AvatarFallback>
              <Image
                src={"/images/avatar/avatar.jpg"}
                alt="avatar"
                width={1280}
                height={720}
              />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <div className="text-[20px]">TradeBox</div>
            <Link
              className="cursor-pointer"
              href={`mailto:info@tradeboxlive.com`}
            >
              info@tradeboxlive.com
            </Link>
          </div>
        </Link>
        <div className="flex flex-col items-start gap-1">
          {/* <Link
            className="cursor-pointer"
            href={`mailto:info@tradeboxlive.com`}
          >
            {data?.data.email}
          </Link> */}
          {/* <Link href={`tel:${data?.data.number}`} className="cursor-pointer">
            {data?.data.number}
          </Link>
          <div>
            {data?.data.address1} {data?.data.address2}
          </div> */}
        </div>
      </div>
    </motion.div>
  );
}
