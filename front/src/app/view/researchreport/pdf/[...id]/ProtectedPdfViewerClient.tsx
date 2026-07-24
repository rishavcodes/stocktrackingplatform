"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { ArrowLeft, Loader2, Lock, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";

// react-pdf needs a pdf.js worker whose version matches the bundled API
// exactly — otherwise pdf.js throws "API version X does not match Worker
// version Y" and onLoadError fires with "Could not render this PDF".
// Interpolating `pdfjs.version` (set by the bundled API) into the URL means
// the worker we fetch is always the matching one, so the API and Worker
// can never drift out of sync via stale postinstall artifacts.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  articleId: string;
  // Set when the page was opened via a Telegram-shared link (`?t=…`). In that
  // case Telegram's WebView has no NextAuth session, so we authenticate via
  // the signed token query param instead of the Bearer header.
  shareToken?: string;
}

export default function ProtectedPdfViewerClient({
  articleId,
  shareToken,
}: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  // zoom multiplies the fit-to-width render width. 1.0 = page exactly fills
  // the available container width (the on-screen "100%" the user expects on
  // mobile). The native PDF scale is no longer the unit of measurement.
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const usingShareToken = Boolean(shareToken);

  // Track the scroll-container width via ResizeObserver so the PDF re-renders
  // to fit whenever the viewport changes (orientation flip, browser resize,
  // sidebar toggle, etc.). We subtract a small inset so the page doesn't
  // collide with the scrollbar / shadow.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderWidth = useMemo(
    () => Math.max(0, (containerWidth - 24) * zoom),
    [containerWidth, zoom],
  );

  useEffect(() => {
    // Share-token path: skip the session wait, authenticate via `?t=`.
    // Bearer path: wait for NextAuth to settle, then use session.backendToken.
    let token: string | null = null;
    if (usingShareToken) {
      token = shareToken!;
    } else {
      if (status !== "authenticated") return;
      token = session?.backendToken ?? null;
      if (!token) {
        setError("You need to be signed in to view this PDF.");
        return;
      }
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const url = usingShareToken
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/article/pdf/${articleId}?t=${encodeURIComponent(token!)}`
          : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/article/pdf/${articleId}`;
        const res = await fetch(url, {
          headers: usingShareToken
            ? undefined
            : { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 403) {
            setError("This PDF is available to subscribers only.");
          } else if (res.status === 401) {
            setError("Your session has expired. Please sign in again.");
          } else if (res.status === 404) {
            setError("This article does not have a PDF.");
          } else if (res.status === 422) {
            // Bad data path — the S3 object isn't a valid PDF. Surface the
            // server-supplied message verbatim so the user gets the precise
            // "please re-upload" instruction.
            let serverMsg = "";
            try {
              const body = await res.json();
              if (typeof body?.message === "string") serverMsg = body.message;
            } catch {
              /* non-JSON */
            }
            setError(
              serverMsg ||
                "The PDF attached to this article is corrupt. Please ask the author to re-upload it."
            );
          } else {
            setError("Failed to load PDF. Please try again.");
          }
          return;
        }

        const buf = await res.arrayBuffer();
        if (!cancelled) setPdfData(new Uint8Array(buf));
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          setError("Failed to load PDF. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [articleId, session?.backendToken, status, shareToken, usingShareToken]);

  // pdf.js transfers the underlying ArrayBuffer to its worker on first parse,
  // which detaches the Uint8Array's buffer in the main thread. pdf.js then
  // lazy-loads later pages from that same source — and reads zero bytes,
  // silently failing past page 1–2 (the classic "PDF only renders a couple
  // of pages" symptom).
  //
  // Wrapping the bytes in a Blob and handing pdf.js the object URL sidesteps
  // the transfer: the Blob is a stable, retained byte source that the worker
  // fetches via XHR rather than receiving ownership of.
  const fileUrl = useMemo(() => {
    if (!pdfData) return null;
    // Cast: pdfData was built from `await res.arrayBuffer()` so its
    // underlying buffer is a plain ArrayBuffer (not SharedArrayBuffer),
    // which the BlobPart type narrows away to keep strict TS happy.
    return URL.createObjectURL(
      new Blob([pdfData as BlobPart], { type: "application/pdf" })
    );
  }, [pdfData]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Stable options reference — react-pdf re-parses the document whenever the
  // `options` prop's identity changes, so this must be memoised. cMapUrl and
  // standardFontDataUrl let pdf.js render extended fonts (CJK, special
  // glyphs) correctly; without them, affected pages can render blank.
  const documentOptions = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }),
    []
  );

  // Always-visible back button — rendered as a fixed overlay so it survives
  // every render state below (loading, unauthenticated, error, success).
  // Without this, a user stuck on the loading spinner or error screen has
  // no way out except the browser back button.
  //
  // The "View PDF" entry points all open this page via window.open(), so the
  // new tab has no history — a plain router.back() silently does nothing.
  // Detect that case and fall back to a sensible listing URL based on role.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      // Belt-and-suspenders: if router.back() landed us nowhere (history was
      // only [pdf-page]), close the tab — the user opened it in a new one
      // anyway, so closing is the natural exit.
      setTimeout(() => {
        // If we're still on this page after the back call, route to a fallback.
        if (window.location.pathname.startsWith("/view/researchreport/pdf")) {
          const role = (session as { user?: { role?: string } } | null)?.user?.role;
          const fallback =
            role === "provider"
              ? "/dashboard/serviceprovider/content/researchreports/postedresearchreports"
              : "/dashboard/user/researchreports";
          router.push(fallback);
        }
      }, 100);
      return;
    }
    // No browsable history — likely opened in a new tab via window.open().
    // Try to close the tab; if the browser refuses (some do unless the tab
    // was scripted open from the same origin), route to a sensible listing.
    try {
      window.close();
    } catch {
      /* ignored */
    }
    const role = (session as { user?: { role?: string } } | null)?.user?.role;
    const fallback =
      role === "provider"
        ? "/dashboard/serviceprovider/content/researchreports/postedresearchreports"
        : "/dashboard/user/researchreports";
    router.push(fallback);
  };

  const BackOverlay = (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className="fixed top-3 left-3 z-50 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/90 dark:bg-neutral-800/90 backdrop-blur shadow-md border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 transition"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );

  // The session loading/unauthenticated guards only apply when we're
  // authenticating via Bearer. The Telegram-share path doesn't need a
  // NextAuth session — it carries its own auth via `?t=`.
  if (!usingShareToken && status === "loading") {
    return (
      <>
        {BackOverlay}
        <div className="flex h-screen items-center justify-center text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      </>
    );
  }

  if (!usingShareToken && status === "unauthenticated") {
    return (
      <>
        {BackOverlay}
        <div className="flex h-screen flex-col items-center justify-center gap-3 text-gray-700 dark:text-gray-300">
          <Lock className="w-8 h-8" />
          <p>Sign in to view this article&apos;s PDF.</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {BackOverlay}
        <div className="flex h-screen flex-col items-center justify-center gap-3 text-gray-700 dark:text-gray-300">
          <Lock className="w-8 h-8 text-red-500" />
          <p>{error}</p>
        </div>
      </>
    );
  }

  return (
    <div
      className="h-screen w-full flex flex-col bg-neutral-100 dark:bg-neutral-900 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      {BackOverlay}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/80 dark:bg-neutral-800/80 backdrop-blur px-2 sm:px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center">
          {pageCount > 0
            ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
            : "—"}
        </span>
        <div className="hidden sm:block w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center py-6 gap-4"
      >
        {fileUrl ? (
          <Document
            file={fileUrl}
            options={documentOptions}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
            onLoadError={(err) => {
              // pdf.js surfaces the underlying cause on the error — log the
              // full thing so we can tell apart corrupt bytes vs. worker
              // misconfig vs. unsupported encryption.
              console.error("react-pdf onLoadError:", {
                name: (err as Error)?.name,
                message: (err as Error)?.message,
                error: err,
                pdfDataLength: pdfData?.byteLength ?? null,
              });
              setError(
                `Could not render this PDF (${
                  (err as Error)?.name || "error"
                }: ${(err as Error)?.message || "unknown"})`
              );
            }}
            loading={
              <div className="flex items-center text-neutral-600 dark:text-neutral-300">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Rendering…
              </div>
            }
          >
            {renderWidth > 0 &&
              Array.from({ length: pageCount }, (_, i) => (
                <div key={i + 1} className="mb-4 shadow-md max-w-full">
                  <Page
                    pageNumber={i + 1}
                    width={renderWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </div>
              ))}
          </Document>
        ) : (
          <div className="flex items-center text-neutral-600 dark:text-neutral-300">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading PDF…
          </div>
        )}
      </div>
    </div>
  );
}
