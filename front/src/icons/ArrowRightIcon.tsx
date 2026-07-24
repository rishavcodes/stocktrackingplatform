import { SVGProps } from "react";

export default function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="19"
      height="15"
      viewBox="0 0 19 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0.999999 7.5L18 7.5M18 7.5L11.625 14M18 7.5L11.625 1"
        stroke="#565656"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
