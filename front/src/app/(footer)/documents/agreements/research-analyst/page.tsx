"use client"
import { DocumentPoint } from "@/components";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

export default function page() {
  return (
    // <iframe
    //   className="w-full h-screen"
    //   src="https://tradeboxfintech.s3.ap-south-1.amazonaws.com/SLA/SLA+Agreement+for+RA.docx"
    // >
    //   page
    // </iframe>
     <div className="p-10 min-h-screen">
     <DocViewer
       documents={[
         {
           uri: "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/SLA/SLA+Agreement+for+RA.docx",
           fileType: "docx",
         },
       ]}
       pluginRenderers={DocViewerRenderers}
       className="min-h-screen"
     />
   </div>
  );
}
