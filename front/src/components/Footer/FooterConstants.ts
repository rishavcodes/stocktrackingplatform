import { SVGProps } from "react";

import FaceBookIcon from "@/icons/FaceBookIcon";
import TwitterXIcon from "@/icons/TwitterXIcon";
import PinterestLogo from "@/icons/PinterestLogo";
import InstagramIcon from "@/icons/InstagramIcon";
import YoutubeIcon from "@/icons/YoutubeIcon";
import LinkedinIcon from "@/icons/LinkedinIcon";

export const FooterArray: { title: string; href: string }[][] = [
  [
    { title: "Calender of festivale", href: "" },
    { title: "New assets", href: "" },
    { title: "The most popular content", href: "" },
    { title: "Search trends", href: "" },
    { title: "Blog", href: "" },
    {
      title: "Sign Up as service provider",
      href: "/auth/signup/serviceprovider",
    },
  ],
  [
    // { title: "Pricing", href: "" },
    { title: "About us", href: "/documents/about-us" },
    { title: "Do and Don't", href: "/documents/do-and-donot" },
    { title: "FAQ", href: "/documents/frequently-asked-questions" },
    { title: "Market Place", href: "/marketplace" },
    // { title: "Press room", href: "" },
    // { title: "API", href: "" },
    // { title: "Jobs", href: "" },
    // { title: "Sell content", href: "" },
  ],
  [
    { title: "Terms and conditions", href: "/documents/terms-and-conditions" },
    // { title: "License agreement", href: "" },
    { title: "Privacy policy", href: "/documents/privacy-policy" },
    {
      title: "Copyright information",
      href: "/documents/copyright-information",
    },
    { title: "Cookies policy", href: "/documents/cookie-policy" },
    { title: "Refund Policy", href: "/documents/refund-policy" },
    { title: "Disclaimer", href: "/documents/disclaimer" },
  ],
  [
    {
      title:
        "address:1471, Valencia Tower, Mahagun Moderne, sector 78, Noida-201301",
      href: "",
    },
    { title: "info@tradeboxlive.com", href: "mailto:info@tradeboxlive.com" },
  ],
];

export const FooterIcons: {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  href: string;
  text: string;
}[] = [
  {
    icon: LinkedinIcon,
    href: "https://www.linkedin.com/company/tradeboxlive/",
    text: "linkedin",
  },
  {
    icon: TwitterXIcon,
    href: "https://twitter.com/Tradeboxlive",
    text: "twitter",
  },

  {
    icon: InstagramIcon,
    href: "https://www.instagram.com/tradebox.live/",
    text: "instagram",
  },

  {
    icon: YoutubeIcon,
    href: "https://www.youtube.com/@Tradeboxlive",
    text: "youtube",
  }
];
