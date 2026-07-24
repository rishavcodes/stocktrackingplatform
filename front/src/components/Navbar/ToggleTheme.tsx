"use client";

import {  Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// export default function ToggleTheme() {
//   const { resolvedTheme, setTheme } = useTheme();
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//     const storedTheme = localStorage.getItem("theme");
//     if (storedTheme !== null) {
//       setTheme(storedTheme);
//     }
//   }, [setTheme]);

//   if (!mounted) {
//     return null;
//   }

//   const toggleTheme = () => {
//     const newTheme = resolvedTheme === "dark" ? "light" : "dark";
//     setTheme(newTheme);
//     localStorage.setItem("theme", newTheme);
//   };

//   return (
//     <motion.button
//       whileHover={{ scale: 1.02 }}
//       whileTap={{ scale: 0.98 }}
//       className="w-[218px] flex items-center gap-x-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 cursor-pointer group"
//       onClick={toggleTheme}
//     >
//       <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">
//         {resolvedTheme === "dark" ? (
//           <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
//         ) : (
//           <MoonIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
//         )}
//       </span>
//       <span className="flex-1 text-left">
//         {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
//       </span>
//       <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
//         <svg
//           className="w-4 h-4"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M9 5l7 7-7 7"
//           />
//         </svg>
//       </span>
//     </motion.button>
//   );
// }

// export default function ToggleTheme() {
//   return null;
// }



export default function ToggleTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
    
  }, [setTheme]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled
      className="w-[218px] flex items-center gap-x-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium
        text-gray-700 bg-gray-100 cursor-not-allowed opacity-80"
    >
      <Sun className="w-5 h-5 text-yellow-500" />
      <span className="flex-1 text-left">Light mode</span>
    </motion.button>
  );
}