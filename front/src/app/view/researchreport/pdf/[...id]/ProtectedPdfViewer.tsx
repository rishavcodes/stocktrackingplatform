"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// react-pdf 9 is ESM-heavy. Importing it eagerly from a module that the
// Next.js (RSC + webpack) loader touches during SSR/build trips
// "Object.defineProperty called on non-object" inside __webpack_require__.r.
// Load the actual viewer dynamically with ssr:false so react-pdf is only
// evaluated in the browser.
const ProtectedPdfViewerClient = dynamic(
  () => import("./ProtectedPdfViewerClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading…
      </div>
    ),
  }
);

interface Props {
  articleId: string;
  shareToken?: string;
}

export default function ProtectedPdfViewer({ articleId, shareToken }: Props) {
  return (
    <ProtectedPdfViewerClient
      articleId={articleId}
      shareToken={shareToken}
    />
  );
}
