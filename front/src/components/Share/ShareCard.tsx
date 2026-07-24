"use client";

import {
  WhatsappIcon,
  WhatsappShareButton,
  XIcon,
  TwitterShareButton,
  EmailShareButton,
  EmailIcon,
  TelegramShareButton,
  TelegramIcon,
} from "react-share";

import { motion } from "framer-motion";
import CopyIcon from "@/icons/CopyIcon";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

type ShareCardProps = {
  title: string;
  separator?: string;
  url: string;
  related?: string[];
  hashtags?: string[];
  top?: string;
};

export default function ShareCard({
  title,
  separator,
  url,
  hashtags,
  top = "top-2",
}: ShareCardProps) {
  const { toast } = useToast();

  async function copyToClipboard(url: string) {
    await navigator.clipboard.writeText(url);
    toast({
      description: "Copied to clipboard",
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        delay: 0.1,
        duration: 0.1,
        stiffness: 100,
        type: "spring",
      }}
      className={`flex items-center mt-4 gap-3 z-20 absolute bg-whiteShade px-5 py-2 rounded-xl right-0 ${top}`}
    >
      <Toaster />
      <WhatsappShareButton title={title} separator={separator} url={url}>
        <WhatsappIcon size={25} />
      </WhatsappShareButton>
      <TwitterShareButton
        title={title}
        url={url}
        related={["Tradeboxlive"]}
        hashtags={hashtags}
      >
        <XIcon size={25} />
      </TwitterShareButton>
      <EmailShareButton url={url}>
        <EmailIcon size={25} />
      </EmailShareButton>
      <TelegramShareButton url={url}>
        <TelegramIcon size={25} />
      </TelegramShareButton>
      <CopyIcon
        className="w-6 h-6 cursor-pointer"
        onClick={() => {
          copyToClipboard(url);
        }}
      />
    </motion.div>
  );
}
