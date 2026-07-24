// components/Marketplace/VerticalContentSection.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import Link from "next/link";

interface VerticalContentSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: any[];
  loading: boolean;
  emptyMessage: string;
  renderItem: (item: any) => React.ReactNode;
  viewAllLink: string;
  showCount: number;
  isComingSoon?: boolean;
}

export default function VerticalContentSection({
  title,
  subtitle,
  icon,
  data,
  loading,
  emptyMessage,
  renderItem,
  viewAllLink,
  showCount = 3,
  isComingSoon = false
}: VerticalContentSectionProps) {
  const displayData = data.slice(0, showCount);

  if (loading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-60" />
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: showCount }).map((_, i) => (
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
        </CardContent>
      </Card>
    );
  }

  if (isComingSoon) {
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
            <p className="text-gray-600">{emptyMessage}</p>
          </div>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Coming Soon
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              {icon}
            </div>
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                {title}
                {data.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {data.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {subtitle}
              </CardDescription>
            </div>
          </div>
          
          {data.length > showCount && (
            <Link href={viewAllLink}>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                View All {data.length} Items
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {displayData.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayData.map(renderItem)}
            </div>
            
            {data.length > showCount && (
              <div className="mt-8 text-center">
                <div className="text-sm text-gray-500 mb-3">
                  Showing {showCount} of {data.length} items
                </div>
                <Link href={viewAllLink}>
                  <Button 
                    variant="outline" 
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Show All {data.length} {title}
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}