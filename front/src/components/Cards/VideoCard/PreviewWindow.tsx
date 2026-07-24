

import { Dispatch, SetStateAction,  } from "react";

export default function PreviewWindow({
  id,
  setIsPreviewWindowOpen,
}: {
  id: string;
  setIsPreviewWindowOpen: Dispatch<SetStateAction<boolean>>;
}) {


  return (
    <div
      className=" fixed left-[50%] -translate-x-[50%] -translate-y-[50%] z-50 w-[80%] top-[50%] h-[80%] bg-white
"
    >
      <div className="flex float-right">
        <div
          className=" bg-green px-2 w-fit"
          onClick={() => {
            window.open(`/view/video/${id}`, "_blank");
            setIsPreviewWindowOpen(false);
          }}
        >
          Fullscreen
        </div>

        <div
          className="bg-blue px-2 w-fit"
          onClick={() => {
            setIsPreviewWindowOpen(false);
          }}
        >
          {" "}
          close
        </div>
      </div>

      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      ></iframe>
    </div>
  );
}
