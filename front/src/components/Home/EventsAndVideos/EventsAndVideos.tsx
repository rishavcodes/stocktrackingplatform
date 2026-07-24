import Events from "./Events";
import Videos from "./Videos";

export default function EventsAndVideos() {
  return (
    <div className="dark:bg-blackShade">
      <div className="w-[90%] mx-auto py-10 sm:mt-20 mt-10 sm:px-10 flex md:flex-row flex-col gap-10 justify-center items-center">
        <div className="md:w-[50%] sm:w-[80%] w-[95%] mx-auto">
          <Events />
        </div>
        <div className="md:w-[50%] sm:w-[80%] w-[95%] mx-auto">
          <Videos />
        </div>
      </div>
    </div>
  );
}
