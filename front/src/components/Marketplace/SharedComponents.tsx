// components/Marketplace/SharedComponents.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, FileText, Sparkles, Rocket, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

// ContentTab Component
export function ContentTab({
  title,
  data,
  loading,
  pagination,
  onPageChange,
  renderItem,
  emptyMessage,
}: {
  title: string;
  data: any[];
  loading: boolean;
  pagination?: any;
  onPageChange: (page: number) => void;
  renderItem: (item: any) => React.ReactNode;
  emptyMessage: string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-gray-200">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-12 border border-gray-200">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  const displayData = showAll ? data : data.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayData.map(renderItem)}
      </div>

      <div className="flex justify-center">
        {data.length > 6 && (
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="border-[#01a6b6] text-[#01a6b6] hover:bg-[#e6f7f9]"
          >
            {showAll ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                See All {data.length} Items
              </>
            )}
          </Button>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && showAll && (
        <PaginationComponent pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}

// ComingSoonTab Component
export function ComingSoonTab({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-12 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed">
      <div className="text-center space-y-4 max-w-md mx-auto">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h3>
          <p className="text-gray-600">{description}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Coming Soon
        </Badge>
      </div>
    </Card>
  );
}

// PaginationComponent
export function PaginationComponent({
  pagination,
  onPageChange,
}: {
  pagination: any;
  onPageChange: (page: number) => void;
}) {
  const { currentPage, totalPages, hasPrevPage, hasNextPage } = pagination;

  const renderPageNumbers = () => {
    const items = [];

    if (currentPage > 2) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => onPageChange(1)}>1</PaginationLink>
        </PaginationItem>,
      );
    }

    if (currentPage > 3) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages, currentPage + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => onPageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (currentPage < totalPages - 2) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    if (currentPage < totalPages - 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => hasPrevPage && onPageChange(currentPage - 1)}
              className={
                !hasPrevPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem>
            <PaginationNext
              onClick={() => hasNextPage && onPageChange(currentPage + 1)}
              className={
                !hasNextPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}