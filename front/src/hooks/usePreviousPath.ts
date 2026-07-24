"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function usePreviousPath() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  return prevPathRef.current;
}
