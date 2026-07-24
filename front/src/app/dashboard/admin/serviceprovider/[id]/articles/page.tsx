"use client";
import { useState, useEffect } from "react";
import { ArticleCard, PostRemovalBox } from "@/components";
import { useGetArticles } from "@/lib/data/ServiceProvider/articles";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";

export default function Articlepage({ params }: { params:  Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");
  
    useEffect(() => {
      const getId = async () => {
        const { id } = await params;
        setId(id);
      };
      getId();
    }, [params]);
  const { articles } = useGetArticles(id);
  const session = useSession();

  return (
    <div className=" pl-10 items-stretch pt-10 w-full h-full">
      <Toaster />
      <Link
        href={`/dashboard/admin/serviceprovider/${id}`}
        className=" bg-green px-5 py-3"
      >
        Back
      </Link>

      <div className="flex flex-wrap gap-5 mt-10">
        {articles?.map((article) => (
          <div
            key={article._id}
            className="flex justify-center relative items-stretch"
          >
            <PostRemovalBox
              id={article._id}
              type="removearticle"
              token={session.data?.user.backendToken!}
            />

            <ArticleCard
              articleId={article._id}
              authorId={article.authorData.id}
              url={article.image}
              category={article.authorData.type}
              heading={article.title}
              dateAndRead={[
                new Date(article.schedule).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                }),
              ]}
              paragraph={article.content}
              profileUrl="/images/avatar/avatar.png"
              name={article.authorData.name}
              tags={article.category}
              hasArticlePDF={article.hasArticlePDF}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
