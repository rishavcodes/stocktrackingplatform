import getVideoId from "get-video-id";

import { videoType } from "./types";

export async function fetchVideoId(url: string) {
  try {
    const { id } = getVideoId(url);
    return id;
  } catch (error) {
    return "";
  }
}

export function fetchVideoThumbnail(url: string) {
  try {
    const { id } = getVideoId(url);
    return `https://img.youtube.com/vi/${id}/0.jpg`;
  } catch (error) {
    return "";
  }
}

export async function fetchVideoData(urlStr: string) {
  try {
    const { id } = getVideoId(urlStr);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${process.env.NEXT_PUBLIC_YT_API_KEY}`
    );

    const rawData = await res.json();

    const { items } = rawData;
    const { snippet } = items[0];
    const { title, description, thumbnails } = snippet;
    const { high } = thumbnails;
    const { url } = high;

    return { title, description, url };
  } catch (error) {
    return undefined;
  }
}

export async function fetchVideoStats(id: string) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${process.env.NEXT_PUBLIC_YT_API_KEY}`,
    { method: "GET", cache: "force-cache" }
  );

  const rawRes = await res.json();
  const stats = rawRes.items[0];
  const { statistics } = stats;

  const { viewCount, likeCount } = statistics;

  return { views: viewCount, likes: likeCount };
}

export async function addStatsToVideoArray(videos: videoType[]) {
  try {
    const videoStatsPromises = videos.map((video: videoType) =>
      fetchVideoStats(video.videoID)
    );
    const videoStats = await Promise.all(videoStatsPromises);

    const videosWithStats = videos.map((video: videoType, index: number) => ({
      ...video,
      videoStats: videoStats[index],
    }));

    return videosWithStats;
  } catch (error) {
    return videos;
  }
}
