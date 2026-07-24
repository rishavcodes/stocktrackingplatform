"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGetScheduledArticles } from "@/lib/data/ServiceProvider/articles";
import { useSession } from "next-auth/react";
import {
  Share2,
  CalendarDays,
  Trash,
  FileText,
  ArrowUpRight,
  Loader2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ShareCard } from "@/components";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ScheduledArticles() {
  const session = useSession();
  const { articles } = useGetScheduledArticles(session.data?.user.id!);
  const { toast } = useToast();

  const [articleList, setArticleList] = useState<any[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isVisible, setIsVisible] = useState<string>("");
  const shareCardRef = useRef<HTMLDivElement>(null);
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => {
    if (articles) {
      setArticleList(articles);
    }
  }, [articles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareCardRef.current &&
        !shareCardRef.current.contains(event.target as Node)
      ) {
        setIsVisible("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteClick = (article: any) => {
    setSelectedArticle(article);
    setIsDeleteModalOpen(true);
  };

  const deleteArticle = async (articleId: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/deleteArticles`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: articleId }),
        }
      );

      if (!response.ok) {
        toast({
          title: "Error",
          description: "There was an error deleting the research report",
          variant: "destructive",
        });
        return;
      }

      setArticleList((prev) =>
        prev.filter((article) => article._id !== articleId)
      );

      toast({
        title: "Success",
        description: "The scheduled research report has been successfully deleted",
        variant: "success",
      });

      setIsDeleteModalOpen(false);
      setSelectedArticle(null);
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: "Error",
        description: "Failed to delete research report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto py-10 px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {articleList.map((article) => {
            const dateString = new Date(article.schedule).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "short",
                day: "2-digit",
              }
            );

            return (
              <div
                key={article._id}
                className="flex flex-col md:flex-row gap-5 p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800"
              >
                {/* Image */}
                <div className="md:w-48 w-full">
                  <Link href={`/view/researchreport/page/${article._id}`}>
                    <Avatar className="w-full h-40 rounded-lg border">
                      <AvatarImage
                        src={article.image}
                        alt={article.title}
                        className="object-cover"
                      />
                      <AvatarFallback className="flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <Link href={`/view/researchreport/page/${article._id}`}>
                        <h2 className="text-xl font-semibold hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400">
                          {article.title}
                        </h2>
                      </Link>

                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <CalendarDays className="w-4 h-4" />
                        {dateString}
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                          Scheduled
                        </span>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                        {article.content?.split(" ").slice(0, 14).join(" ") ?? ""}....
                      </p>
                    </div>

                    {/* Share + Modify + Delete */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onMouseEnter={() => setIsVisible(article._id)}
                          onMouseLeave={() => setIsVisible("")}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>

                        <AnimatePresence>
                          {article._id === isVisible && (
                            <div
                              ref={shareCardRef}
                              className="absolute top-8 right-0 z-10"
                            >
                              <ShareCard
                                title={article.title}
                                separator="Read more at:"
                                url={`https://${hostname}/view/researchreport/page/${article._id}`}
                                hashtags={article.category}
                              />
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      <Link
                        href={`/dashboard/serviceprovider/content/researchreports/editresearchreport/${article._id}`}
                        className="inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 p-2 transition-colors"
                        title="Modify research report"
                      >
                        <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Link>

                      <Trash
                        className="cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        onClick={() => handleDeleteClick(article)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                    <div className="flex gap-2 flex-wrap">
                      {article.category?.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {article.hasArticlePDF ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          window.open(`/view/researchreport/pdf/${article._id}`)
                        }
                      >
                        View PDF <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Link
                        href={`/view/researchreport/page/${article._id}`}
                        className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        Read Full →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This action cannot be undone. This will permanently delete the
              scheduled research report{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                &ldquo;{selectedArticle?.title}&rdquo;
              </span>{" "}
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedArticle && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700 mb-4">
              <div className="flex items-start gap-4">
                {selectedArticle.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <img
                      src={selectedArticle.image}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {selectedArticle.title}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedArticle.category?.slice(0, 3).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                    {selectedArticle.category?.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        +{selectedArticle.category.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-slate-300 text-black hover:bg-gray-900 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedArticle && deleteArticle(selectedArticle._id)
              }
              disabled={isDeleting || !selectedArticle}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </span>
                </>
              ) : (
                "Delete Research Report"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
