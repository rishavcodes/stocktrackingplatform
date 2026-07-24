import VideoCard from "@/components/Cards/VideoCard/VideoCard";
import { Search } from "lucide-react";

export default function Videos() {
  return (
    <div className="w-[95%] flex flex-col gap-10 mx-auto h-full pt-10">
      <div className="flex justify-between">
        <div className="flex gap-10">
          <h1 className="text-[20px] cursor-pointer">Videos</h1>{" "}
          <h1 className="text-[20px] cursor-pointer">Saved Videos</h1>
        </div>
        <div className="bg-white flex px-5 py-2 mr-[50px]">
          <input placeholder="Search" className="focus:outline-none" />
          <Search className="cursor-pointer" />
        </div>
      </div>
      <div className="flex gap-5 flex-wrap justify-center">
        <VideoCard
          thumbnailUrl="/images/articles/ar.png"
          authorID={"video.authorData.id"}
          category={["equity"]}
          description="Ok"
          videoID={""}
          title="The Psychology of Money: Overcoming Behavioral Biases in Finance"
          stats={{ views: 106, likes: 100 }}
          name={"Aditya Rana"}
          type=""
          videoLink=""
          profileUrl="/images/avatar/avatar.png"
        />
      </div>
    </div>
  );
}
