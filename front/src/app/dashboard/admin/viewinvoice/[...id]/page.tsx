"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

export default function Page() {
  // var pdfUrl = "https://";

  // params.id.map((param, idx) => {
  //   pdfUrl += `${param}${idx === params.id.length - 1 ? "" : "/"}`;
  // });

   const params = useParams<{ id: string[] }>(); // Unwrap params using useParams()
   const [pdfUrl, setPdfUrl] = useState("");

   useEffect(() => {
     if (params?.id) {
       const url = params.id.join("/");
       setPdfUrl(`https://${url}`);
     }
   }, [params]);

  return (
    <div className="p-10">
      <DocViewer
        documents={[
          {
            uri: pdfUrl,
            fileType: "docx",
          },
        ]}
        pluginRenderers={DocViewerRenderers}
        style={{ width: 900, height: 900 }}
      />
    </div>
  );
}
