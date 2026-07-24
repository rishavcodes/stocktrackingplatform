type videoType = {
  authorData: any;
  videoStats: {
    likes: number;
    views: number;
  };
  title: string;
  category: string[];
  description: string;
  videoID: string;
  language: string;
  image: string;
  link: string;
  schedule: string;
  profileUrl: string;
  _id: string;
  createdAt: string;
};

export async function fetchVideoStats(id: string) {
  try {
    if (id === "") {
      throw new Error("Id invalid or not provided");
    }

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${process.env.YT_API_KEY}`,
      { method: "GET" }
    );

    const rawRes = await res.json();
    const stats = rawRes.items[0];
    const { statistics } = stats;

    const { viewCount, likeCount } = statistics;

    return { views: viewCount, likes: likeCount };
  } catch (error) {
    return undefined;
  }
}
