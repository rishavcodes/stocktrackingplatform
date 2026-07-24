"use client";

import { Input, LanguagesInput, MultiSelect } from "@/components";
import PictureIcon from "@/icons/PictureIcon";
import { ChangeEvent, FormEvent, useState, ClipboardEvent } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import YoutubeIcon from "@/icons/YoutubeIcon";
import { fetchVideoData, fetchVideoId } from "@/lib/fetchVideoData";
import { useSession } from "next-auth/react";

export type videoDataProps = {
  title: string;
  description: string;
  schedule: boolean;
  scheduleDate: Date;
  link: string;
  disclaimer: string;
  scheduleTime: Date;
  image: File | null;
  ExtraThumbnailUrl: string;
  authorImage: string;
  language: string;
};

export default function PostVideo() {
  const session = useSession();

  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [categories, setCategories] = useState<string[]>([]);

  const { toast } = useToast();

  const [videoData, SetVideoData] = useState<videoDataProps>({
    title: "",
    description: "",
    schedule: false,
    scheduleDate: new Date(),
    scheduleTime: new Date(),
    link: "",
    disclaimer: "",
    image: null,
    ExtraThumbnailUrl: "",
    authorImage: "",
    language: "english",
  });

  async function PostVideoChangehandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = event.target;

    if (name === "link") {
      const res = await fetchVideoData(videoData.link);

      if (res !== undefined) {
        const { title, description, url } = res;
        SetVideoData((prev) => ({
          ...prev,
          title,
          description,
          ExtraThumbnailUrl: url,
        }));
      }
    }

    SetVideoData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  }

  async function PasteHandler(event: ClipboardEvent<HTMLInputElement>) {
    const clipboardData = event.clipboardData;

    if (clipboardData) {
      const pastedText = clipboardData.getData("Text");
      const res = await fetchVideoData(pastedText);
      if (res !== undefined) {
        const { title, description, url } = res;
        SetVideoData((prev) => ({
          ...prev,
          title,
          description,
          ExtraThumbnailUrl: url,
        }));
        setPreviewUrl(url);
      }
    }
  }

  function videoImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;

    if (files && files?.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      SetVideoData((prev) => ({ ...prev, image: file }));
    }
  }

  async function PostSubmitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const vidID = await fetchVideoId(videoData.link);

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user._id,
      type: session.data?.user.category,
      authorImage: session.data?.user.profileUrl ?? "",
      title: videoData.title,
      category: categories,
      description: videoData.description,
      disclaimer: videoData.disclaimer,
      scheduleDate: videoData.scheduleDate,
      scheduleTime: videoData.scheduleTime,
      link: videoData.link,
      ExtraThumbnailUrl: videoData.ExtraThumbnailUrl,
      language: videoData.language,
      videoID: vidID,
    };

    if (videoData.image && videoData.image.size > 6291456) {
      toast({
        title: "Max File Size Exceeds",
        description: "Please select files under 5mb",
        variant: "destructive",
      });
      return;
    }

    if (categories.length === 0) {
      toast({
        title: "No Category selected",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();

    formData.append("data", JSON.stringify(data));

    if (videoData.image) {
      formData.append("image", videoData.image);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/postvideo`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.status === 200) {
        toast({
          title: "Video uploaded",
          description: "Video successfully uploaded",
          variant: "default",
        });
      } else {
        toast({
          title: "Error!",
          description: "There was an error uploading video please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error uploading video please try again",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="bg-white dark:bg-black p-7 mb-10">
      <Toaster />
      <form method="POST" onSubmit={PostSubmitHandler}>
        <div className="w-full flex flex-col gap-5">
          <div className="flex sm:flex-row flex-col justify-between gap-5">
            <div className="w-full flex flex-col gap-5">
              <Input
                title="Video Title (optional)"
                type="text"
                name="title"
                value={videoData.title}
                required={false}
                onChange={PostVideoChangehandler}
                labelStyle="text-black font-semibold"
                roundness="rounded-sm"
                height="py-2"
              />
              <div className="flex flex-col">
                <div className="text-black font-semibold dark:text-white/70">
                  Category
                </div>
                <MultiSelect onChange={setCategories} />
              </div>
              <div className="flex flex-col">
                <div className="text-black font-semibold dark:text-white/70">
                  Language
                </div>
                <LanguagesInput
                  value={videoData.language}
                  name="language"
                  title=""
                  onChange={SetVideoData}
                />
              </div>
            </div>

            <label className="flex flex-col justify-center text-center cursor-pointer items-center gap-2 border p-20 ">
              <input
                type="file"
                className="hidden dark:bg-blackShade"
                accept="image/apng, image/avif, image/gif, image/jpeg, image/png, image/svg+xml, image/webp"
                name="image"
                onChange={videoImageChangeHandler}
              />
              {previewUrl === "" ? (
                <div className="flex flex-col justify-center items-center gap-1">
                  <PictureIcon />
                  <div className="dark:text-white/70">
                    Upload Image (optional)
                  </div>
                </div>
              ) : (
                <Image
                  src={previewUrl}
                  alt="video-preview"
                  width={1280}
                  height={720}
                />
              )}
            </label>
          </div>

          <div className="flex flex-col">
            <div className="text-black font-semibold dark:text-white/70">
              Description (optional)
            </div>
            <textarea
              className="border p-2 dark:bg-blackShade"
              value={videoData.description}
              name="description"
              onChange={PostVideoChangehandler}
              rows={10}
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="font-medium dark:text-white/70">Upload With : </div>
            <YoutubeIcon
              className="w-10 h-10 cursor-pointer"
              onClick={() =>
                window.open("https://studio.youtube.com/channel/", "_blank")
              }
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="link"
              className="text-black font-semibold dark:text-white/70"
            >
              Youtube Video Link
            </label>
            <input
              required
              type="link"
              name="link"
              value={videoData.link}
              onChange={PostVideoChangehandler}
              onPasteCapture={PasteHandler}
              className={`border border-darkGrey/30 dark:bg-blackShade pl-4 focus:outline-none rounded-sm py-2 pr-14`}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-black font-semibold dark:text-white/70">
              Schedule Post
            </div>
            <input
              type="checkbox"
              name="schedule"
              value={videoData.schedule ? "true" : "false"}
              className="cursor-pointer"
              onChange={PostVideoChangehandler}
            />
          </div>
          {videoData.schedule && (
            <div className="w-[200px] flex gap-5">
              <Input
                title="Date"
                type="date"
                name="scheduleDate"
                min={new Date().toISOString().split("T")[0]}
                height="py-1"
                paddingRight="pr-2"
                onChange={PostVideoChangehandler}
              />
              <Input
                title="Time"
                type="time"
                name="scheduleTime"
                height="py-1"
                paddingRight="pr-2"
                onChange={PostVideoChangehandler}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col my-5">
          <div className="text-black font-semibold dark:text-white/70">
            Disclaimer*
          </div>
          <textarea
            className="border p-2 dark:bg-blackShade"
            value={videoData.disclaimer}
            name="disclaimer"
            required
            onChange={PostVideoChangehandler}
            rows={10}
          />
        </div>

        <input
          type="submit"
          value={"Post"}
          className="mt-5 bg-green-600 px-7 py-2 cursor-pointer dark:text-black"
        />
      </form>
    </div>
  );
}
