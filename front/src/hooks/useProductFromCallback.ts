"use client";

import { useEffect, useState } from "react";

export type CallbackProduct = {
  type: "services" | "article" | "events" | "portfolio" | "packages" | "courses";
  id: string;
  title?: string;
  image?: string;
  price?: number;
  authorName?: string;
};

const PATTERNS: { type: CallbackProduct["type"]; re: RegExp }[] = [
  { type: "services", re: /^\/view\/services\/([^/?#]+)/ },
  { type: "article", re: /^\/view\/article\/articlepage\/([^/?#]+)/ },
  { type: "events", re: /^\/view\/events\/details\/([^/?#]+)/ },
  { type: "portfolio", re: /^\/view\/portfolio\/([^/?#]+)/ },
  { type: "packages", re: /^\/view\/packages\/([^/?#]+)/ },
  { type: "courses", re: /^\/view\/courses\/([^/?#]+)/ },
];

function parse(callback: string | null): { type: CallbackProduct["type"]; id: string } | null {
  if (!callback) return null;
  const path = callback.startsWith("http") ? new URL(callback).pathname : callback;
  for (const { type, re } of PATTERNS) {
    const m = path.match(re);
    if (m) return { type, id: m[1] };
  }
  return null;
}

async function fetchProduct(
  parsed: { type: CallbackProduct["type"]; id: string }
): Promise<CallbackProduct | null> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { type, id } = parsed;
  try {
    if (type === "services") {
      const r = await fetch(`${base}/api/data/viewpmsservicedetails?id=${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const d = j.data;
      return {
        type, id,
        title: d?.title,
        image: d?.bannerURL,
        price: typeof d?.price === "number" ? d.price : undefined,
        authorName: d?.authorData?.name,
      };
    }
    if (type === "article") {
      const r = await fetch(`${base}/api/data/articledetail?id=${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.article;
      return {
        type, id,
        title: a?.title,
        image: a?.image,
        authorName: a?.authorData?.name,
      };
    }
    if (type === "events") {
      const r = await fetch(`${base}/api/data/eventdetails/?id=${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const e = j.event;
      return {
        type, id,
        title: e?.title,
        image: e?.image,
        price: typeof e?.price === "number" ? e.price : undefined,
        authorName: e?.authorData?.name,
      };
    }
    if (type === "portfolio") {
      const r = await fetch(`${base}/api/portfolio/get-portfolio-by-id?id=${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const p = j.data ?? j.portfolio ?? j;
      return {
        type, id,
        title: p?.portfolioName,
        image: p?.bannerURL,
        authorName: p?.authorData?.name,
      };
    }
    if (type === "packages") {
      const r = await fetch(`${base}/api/data/viewpackagedetails?id=${id}`);
      if (!r.ok) return null;
      const j = await r.json();
      const p = j.data;
      return {
        type, id,
        title: p?.title ?? p?.packageName,
        image: p?.bannerURL,
        price: typeof p?.price === "number" ? p.price : undefined,
        authorName: p?.authorData?.name,
      };
    }
    if (type === "courses") {
      const r = await fetch(`${base}/api/v1/courses/${id}/public`);
      if (!r.ok) return null;
      const j = await r.json();
      const c = j.data;
      return {
        type, id,
        title: c?.title,
        image: c?.thumbnailUrl,
        price: typeof c?.price === "number" ? c.price : undefined,
        authorName: c?.instructor?.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const cache = new Map<string, CallbackProduct | null>();

/**
 * Parse a `callbackUrl` query param and fetch a thin summary of the product
 * the user is signing in to access. Returns `undefined` while loading,
 * `null` if the callback doesn't point at a recognized product page.
 */
export function useProductFromCallback(
  callbackUrl: string | null
): CallbackProduct | null | undefined {
  const [data, setData] = useState<CallbackProduct | null | undefined>(() => {
    const parsed = parse(callbackUrl);
    if (!parsed) return null;
    const key = `${parsed.type}:${parsed.id}`;
    return cache.has(key) ? cache.get(key) : undefined;
  });

  useEffect(() => {
    const parsed = parse(callbackUrl);
    if (!parsed) {
      setData(null);
      return;
    }
    const key = `${parsed.type}:${parsed.id}`;
    if (cache.has(key)) {
      setData(cache.get(key));
      return;
    }
    let cancelled = false;
    fetchProduct(parsed).then((value) => {
      cache.set(key, value);
      if (!cancelled) setData(value);
    });
    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

  return data;
}
