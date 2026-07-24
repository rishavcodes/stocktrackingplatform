import {SVGProps} from 'react'

export default function TradyCoin(props:SVGProps<SVGSVGElement>) {

  return (
    <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className="w-5 h-5 mr-1 text-white"
    {...props}>
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1.125 1.125 0 001.07.772h4.908c.969 0 1.371 1.24.588 1.81l-3.974 2.89a1.125 1.125 0 00-.403 1.268l1.518 4.674c.3.921-.755 1.688-1.538 1.217l-3.974-2.89a1.125 1.125 0 00-1.317 0l-3.974 2.89c-.782.47-1.837-.296-1.538-1.217l1.518-4.674a1.125 1.125 0 00-.403-1.268L2.964 9.183c-.783-.57-.38-1.81.588-1.81h4.908a1.125 1.125 0 001.07-.772l1.518-4.674z" />
    </svg>

    );
}