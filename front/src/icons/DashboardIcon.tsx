import { SVGProps } from "react";

export default function DashboardIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M8.99997 9.00005L3.40293 4.46986C3.05972 4.19206 2.55252 4.243 2.31042 4.61225C1.85517 5.30658 1.50113 6.0842 1.27451 6.92997C0.131261 11.1966 2.66329 15.5823 6.92996 16.7255C11.1966 17.8687 15.5823 15.3367 16.7255 11.07C17.8687 6.80337 15.3367 2.41776 11.07 1.27451C8.96446 0.710331 6.82998 1.04119 5.07047 2.03387"
        stroke="#565656"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
