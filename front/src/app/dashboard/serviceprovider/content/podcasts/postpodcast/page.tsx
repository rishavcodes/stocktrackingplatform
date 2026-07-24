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

export type podcastDataProps = {
  title: string;
  schedule: boolean;
  scheduleDate: Date;
  link: string;
  scheduleTime: Date;
  disclaimer: string;
  image: File | null;
  ExtraThumbnailUrl: string;
  description: string;
  language: string;
};

export default function PostPodcast() {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [categories, setCategories] = useState<string[]>([]);

  const { toast } = useToast();

  const session = useSession();

  const [podcastData, SetPodcastData] = useState<podcastDataProps>({
    title: "",
    schedule: false,
    scheduleDate: new Date(),
    scheduleTime: new Date(),
    link: "",
    disclaimer: "",
    description: "",
    image: null,
    ExtraThumbnailUrl: "",
    language: "english",
  });

  function PostPodcastChangehandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = event.target;

    SetPodcastData((prev) => ({
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
        SetPodcastData((prev) => ({
          ...prev,
          title,
          description,
          ExtraThumbnailUrl: url,
        }));
        setPreviewUrl(url);
      }
    }
  }

  function podcastImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;

    if (files && files?.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      SetPodcastData((prev) => ({ ...prev, image: file }));
    }
  }

  async function PostSubmitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const vidId = await fetchVideoId(podcastData.link);

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user._id,
      type: session.data?.user.category,
      title: podcastData.title,
      category: categories,
      scheduleDate: podcastData.scheduleDate,
      scheduleTime: podcastData.scheduleTime,
      description: podcastData.description,
      disclaimer: podcastData.disclaimer,
      link: podcastData.link,
      ExtraThumbnailUrl: podcastData.ExtraThumbnailUrl,
      language: podcastData.language,
      videoID: vidId,
    };

    if (podcastData.image && podcastData.image.size > 6291456) {
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

    // if (!podcastData.image) {
    //   toast({
    //     title: "Please add image",
    //     description: "Looks like you havent added image please add image",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    if (podcastData.image && podcastData.image.size > 6291456) {
      toast({
        title: "Max File Size Exceeds",
        description: "Please select files under 5mb",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();

    formData.append("data", JSON.stringify(data));

    if (podcastData.image) {
      formData.append("image", podcastData.image);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/postpodcast`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.status === 200) {
        toast({
          title: "Podcast uploaded",
          description: "Podcast successfully uploaded",
          variant: "default",
        });
      } else {
        toast({
          title: "Error!",
          description: "There was an error uploading podcast please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error uploading podcast please try again",
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
                title="Podcast Title"
                type="text"
                name="title"
                value={podcastData.title}
                onChange={PostPodcastChangehandler}
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
                  value={podcastData.language}
                  name="language"
                  title=""
                  onChange={SetPodcastData}
                />
              </div>
            </div>

            <label className="flex flex-col justify-center cursor-pointer items-center gap-2 border p-20 ">
              <input
                type="file"
                className="hidden"
                accept="image/apng, image/avif, image/gif, image/jpeg, image/png, image/svg+xml, image/webp"
                name="image"
                onChange={podcastImageChangeHandler}
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
                  alt="podcast-preview"
                  width={1280}
                  height={720}
                />
              )}
            </label>
          </div>

          <div className="flex flex-col">
            <div className="text-black font-semibold dark:text-white/70">
              Description
            </div>
            <textarea
              className="border p-2 dark:bg-blackShade"
              value={podcastData.description}
              name="description"
              onChange={PostPodcastChangehandler}
              rows={10}
            />
          </div>

          <div className="flex gap-2 items-center">
            <div className="font-medium">Upload With : </div>
            <YoutubeIcon
              className="w-10 h-10 cursor-pointer"
              onClick={() =>
                window.open("https://studio.youtube.com/channel/", "_blank")
              }
            />
            {/* <SpotifyIcon
                className="w-9 h-9 cursor-pointer"
                onClick={() => {
                  window.open("https://open.spotify.com/", "_blank");
                }}
              /> */}
          </div>

          <input
            title="Podcast Link"
            type="link"
            name="link"
            value={podcastData.link}
            onChange={PostPodcastChangehandler}
            onPasteCapture={PasteHandler}
            className={`border border-darkGrey/30 dark:bg-blackShade pl-4 focus:outline-none rounded-sm py-2 pr-14`}
          />

          <div className="flex items-center gap-2">
            <div className="text-black font-semibold dark:text-white/70">
              Schedule Post
            </div>
            <input
              type="checkbox"
              name="schedule"
              value={podcastData.schedule ? "true" : "false"}
              className="cursor-pointer"
              onChange={PostPodcastChangehandler}
            />
          </div>
          {podcastData.schedule && (
            <div className="w-[200px] flex gap-5">
              <Input
                title="Date"
                type="date"
                name="scheduleDate"
                min={new Date().toISOString().split("T")[0]}
                height="py-1"
                paddingRight="pr-2"
                onChange={PostPodcastChangehandler}
              />
              <Input
                title="Time"
                type="time"
                name="scheduleTime"
                height="py-1"
                paddingRight="pr-2"
                onChange={PostPodcastChangehandler}
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
            value={podcastData.disclaimer}
            name="disclaimer"
            required
            onChange={PostPodcastChangehandler}
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
