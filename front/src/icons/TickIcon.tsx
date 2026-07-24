import { SVGProps } from "react";

export default function TickIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M17.6282 9.90041L11.3744 16.1543L8.39724 13.1772M24 13C24 19.0751 19.0751 24 13 24C6.92488 24 2 19.0751 2 13C2 6.92488 6.92488 2 13 2C19.0751 2 24 6.92488 24 13Z"
        stroke="#13584C"
        strokeWidth="2.5"
        stroke-miterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
