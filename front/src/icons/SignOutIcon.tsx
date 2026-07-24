import { SVGProps } from "react";

export default function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1"
        stroke="#565656"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 9H17M17 9L14 6M17 9L14 12"
        stroke="#565656"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
