import { SVGProps } from "react";

export default function CrossIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.17 13.83L13.83 8.17M13.83 13.83L8.17 8.17M11 21C16.5 21 21 16.5 21 11C21 5.5 16.5 1 11 1C5.5 1 1 5.5 1 11C1 16.5 5.5 21 11 21Z"
        className="stroke-black dark:stroke-white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
