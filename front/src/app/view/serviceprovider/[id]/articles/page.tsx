"use client";

import { ArticleCard } from "@/components";
import { articleType } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

async function fetchArticles(id: string): Promise<articleType[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allarticles/previous?id=${id}`,
      { 
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const { data } = await response.json();
      return data || [];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return [];
  }
}

export default function SPArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const [articleData, setArticleData] = useState<articleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadArticles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchArticles(id);
        
        if (isMounted) {
          setArticleData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load articles");
          console.error("Error loading articles:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadArticles();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!articleData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Articles Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no articles available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Articles ({articleData.length})
        </h2>
      </div>
      
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
        {articleData.map((article) => (
          <ArticleCard
            key={article._id}
            width="w-full"
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
              `${Math.ceil(article.content.length / 200)} min read`
            ]}
            paragraph={article.content}
            profileUrl={article.authorData.authorImage}
            name={article.authorData.name}
            tags={article.category}
            hasArticlePDF={article.hasArticlePDF}
          />
        ))}
      </div>
    </div>
  );
}