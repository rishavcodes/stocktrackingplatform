"use client";

import { ArticleCard } from "@/components";
import SectionHeading from "../SectionHeading";
import { motion } from "framer-motion";
import { articleType } from "@/lib/types";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import Link from "next/link";

type responseType = {
  data: articleType[];
};

export default function TrendingArticles() {
  const { data, error, isLoading } = useSWR<responseType>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allarticles`,
    fetcher
  );

  return (
    <div className="dark:bg-black bg-white h-auto w-full flex flex-col items-center py-12">
      {/* <SectionHeading
        heading={{ text1: "Trending ", text2: "Articles" }}
        description={`Explore a curated collection of "Trending Articles" penned by top-tier financial advisors and experts, offering invaluable insights and guidance in the realm of finance.`}
      /> */}

      <h2 className="text-4xl font-league mt-4">EXPERTS WRITES</h2>
      <p className="text-lg font-league text-[#8F8F8F] w-[80%] md:w-[50vw] text-center my-3 font-light">
        Explore in-depth articles from market experts, offering analysis,
        strategies, and valuable perspectives to guide your investment journey
      </p>

      <div className="flex justify-center items-stretch gap-5 flex-wrap mt-10">
        {data?.data.map((article, idx) => (
          <motion.div
            className="flex justify-center items-stretch"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{
              delay: 0.2 * idx + 0.2,
              duration: 0.5,
              stiffness: 50,
              type: "spring",
            }}
            key={article._id}
          >
            <ArticleCard
              url={article.image}
              articleId={article._id}
              category={article.authorData.type}
              authorId={article.authorData.id}
              heading={article.title}
              dateAndRead={[
                new Date(article.schedule).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                }),
              ]}
              paragraph={article.content}
              profileUrl={article.authorData.authorImage}
              name={article.authorData.name}
              tags={article.category}
              hasArticlePDF={article.hasArticlePDF}
            />
          </motion.div>
        ))}
      </div>

      <Link href={'/market-watch/all/articles'} className="text-[##565656] text-2xl underline my-5">View all Articles</Link>
    </div>
  );
}
