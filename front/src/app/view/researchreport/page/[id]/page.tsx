"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { articleType } from "@/lib/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import SectionHeading from "@/components/Home/SectionHeading";
import { ArticleCard } from "@/components";
import { buildProductUrl } from "@/lib/customDomain";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useSpSubdomain } from "@/hooks/useSpSubdomain";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";
import {
  Calendar,
  Clock,
  Eye,
  Heart,
  Share2,
  BookOpen,
  ArrowLeft,
  Download,
  ExternalLink,
  Tag,
  User
} from "lucide-react";

type Props = {
  params: { id: string };
};

async function getArticleData(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/articledetail?id=${id}`,
      {
        method: "GET",
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch article data");
      return {};
    }

    const rawRes = await res.json();

    return { article: rawRes.article, moreArticles: rawRes.moreArticles };
  } catch (error) {
    console.error("Error in getArticleData:", error);
    return {};
  }
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [article, setArticle] = useState<articleType | null>(null);
  const [moreArticles, setMoreArticles] = useState<articleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [views, setViews] = useState(0);

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  useEffect(() => {
    const fetchArticleData = async () => {
      if (id) {
        setIsLoading(true);
        const { article, moreArticles } = await getArticleData(id);
        setArticle(article);
        setMoreArticles(moreArticles);
        setViews(article?.stats?.views || Math.floor(Math.random() * 1000) + 100);
        setIsLoading(false);
      }
    };

    fetchArticleData();
  }, [id]);

  const authorSpId = article?.authorData?.id;
  const { data: sessionData } = useSession();
  useEnforceSubdomainOwnership(authorSpId);
  useCanonicalUrl();
  const sp = useSpSubdomain(authorSpId);

  // Logged-in subscribers go to the dashboard-internal expert profile (the new
  // UI view). Logged-out visitors who reach this public page from home /
  // marketplace article cards keep the public profile, since the dashboard
  // route would require auth.
  const spHref = sessionData?.user
    ? `/dashboard/user/experts/${authorSpId}`
    : `/view/serviceprovider/${authorSpId}/articles`;

  function renderContent(content: string) {
    return { __html: content.replace(/\n/g, "<br />") };
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.content.substring(0, 100),
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You can add a toast notification here
    }
  };

  const formatReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button Skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>

          {/* Header Skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!article) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Article Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">The article you&apos;re looking for doesn&apos;t exist.</p>
        {/* <Link
          href="/marketplace/articles"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Link> */}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 mt-16 sm:mt-24">
      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* <Link
          href="/marketplace/articles"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group mb-8"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Articles
        </Link> */}
      </div>

      {/* Main Article Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <article className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Article Header */}
          <div>
            {/* Article Image */}
            <div className="relative h-52 sm:h-72 md:h-[28rem] w-full overflow-hidden">
              <Image
                src={article.image || `/images/category/${article.category[0]}.jpg`}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Article Meta */}
            <div className="p-4 sm:p-6 md:p-8 text-gray-900 dark:text-white">
              {/* Category Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {article.category.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(article.schedule).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{formatReadTime(article.content)}</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full">
                  <Eye className="w-4 h-4" />
                  <span>{views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
          </div>

          {/* Article Body */}
          <div className="px-4 sm:px-6 md:px-8 pb-8">
            {/* Author Info and Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-8 pb-8 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-white dark:border-gray-700 shadow-lg">
                  <AvatarImage
                    src={article.authorData.authorImage}
                    alt={article.authorData.name}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>

                <div>
                  <Link
                    href={spHref}
                    className="group"
                  >
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {article.authorData.name}
                    </h3>
                  </Link>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {article.authorData.type}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {article.hasArticlePDF && (
                  <Link
                    href={buildProductUrl("articlepdf", article._id, sp)}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    View PDF
                  </Link>
                )}

                {article.articleLink && article.articleLink !== undefined && (
                  <Link
                    href={article.articleLink}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Link
                  </Link>
                )}

                {/* <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-2 rounded-xl transition-all ${isLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button> */}

                <button
                  onClick={handleShare}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-base sm:prose-lg dark:prose-invert max-w-none overflow-x-auto">
              <div
                className="text-gray-700 dark:text-gray-300 leading-relaxed text-base sm:text-lg"
                dangerouslySetInnerHTML={renderContent(article.content)}
              />
            </div>

            {/* Tags */}
            <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.category.map((tag) => (
                  <Link
                    href={`/market-watch/${tag}/articles`}
                    key={tag}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors font-medium"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* More Articles Section */}
        {moreArticles.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                More Articles You Might Like
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                Explore more insightful articles from our financial experts and advisors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {moreArticles.map((article) => (
                <ArticleCard
                  key={article._id}
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
                    formatReadTime(article.content)
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
        )}

        {/* Disclaimer Section */}
        {article.disclaimer && (
          <div className="mt-16 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-lg">
                <BookOpen className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-yellow-800 dark:text-yellow-200">
                Disclaimer & Risk Factors
              </h3>
            </div>
            <div className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed space-y-3">
              {article.disclaimer.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}