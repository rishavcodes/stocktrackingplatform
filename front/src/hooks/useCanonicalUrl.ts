"use client";

import { useEffect } from "react";
import { APEX_DOMAIN } from "@/lib/customDomain";

/**
 * Sets `<link rel="canonical">` to the apex copy of the current pathname.
 * Used on `/view/*` pages to prevent search engines from indexing both the
 * apex URL and per-SP-subdomain URLs as duplicate content.
 */
export function useCanonicalUrl(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const href = `https://${APEX_DOMAIN}${window.location.pathname}`;
    let link = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    const created = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    const previousHref = link.href;
    link.href = href;
    return () => {
      if (created && link?.parentNode) {
        link.parentNode.removeChild(link);
      } else if (link) {
        link.href = previousHref;
      }
    };
  }, []);
}
