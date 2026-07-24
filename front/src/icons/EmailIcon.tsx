import { SVGProps } from "react";

export default function EmailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 22 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1 9C1 5.22876 1 3.34315 2.17157 2.17157C3.34315 1 5.22876 1 9 1H13C16.7712 1 18.6569 1 19.8284 2.17157C21 3.34315 21 5.22876 21 9C21 12.7712 21 14.6569 19.8284 15.8284C18.6569 17 16.7712 17 13 17H9C5.22876 17 3.34315 17 2.17157 15.8284C1 14.6569 1 12.7712 1 9Z"
        stroke="#979797"
      />
      <path
        d="M5 5L7.1589 6.79908C8.99553 8.3296 9.9139 9.0949 11 9.0949C12.0861 9.0949 13.0045 8.3296 14.8411 6.79908L17 5"
        stroke="#979797"
        strokeLinecap="round"
      />
    </svg>
  );
}
