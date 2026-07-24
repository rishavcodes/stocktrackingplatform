// components/ServiceCard.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, TrendingUp, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  width?: string;
  serviceId: string;
  bannerURL: string;
  authorId: string;
  segment: string;
  title: string;
  description: string;
  price: number;
  serviceType: "normal" | "fund";
  pricingPlans: any[];
  authorName: string;
  authorImage: string;
  approvalStatus: boolean;
  activated: boolean;
  keyFeatures: string[];
  bonusFeatures: string[];
  isFreeTrial: boolean;
  freeTrailDays: number;
  subscribedBy: string[];
  AUM?: number;
  NoOfClients?: number;
  returnsByTime?: number[];
  createdAt: string;
}

export function ServiceCard({
  width = "w-full",
  serviceId,
  bannerURL,
  segment,
  title,
  description,
  price,
  serviceType,
  authorName,
  authorImage,
  approvalStatus,
  activated,
  keyFeatures,
  isFreeTrial,
  subscribedBy,
  AUM,
  NoOfClients,
  returnsByTime,
  createdAt,
}: ServiceCardProps) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow duration-300", width)}>
      <CardHeader className="p-0">
        <img
          src={bannerURL || "/placeholder-banner.jpg"}
          alt={title}
          className="w-full h-48 object-cover"
        />
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant={serviceType === "fund" ? "default" : "secondary"}>
            {serviceType}
          </Badge>
          <span className="text-lg font-bold text-green-600">₹{price}</span>
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{subscribedBy?.length || 0} subscribers</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {serviceType === "fund" && (
          <div className="flex items-center justify-between text-xs mb-3">
            <span>AUM: ₹{AUM?.toLocaleString()}</span>
            <span>Clients: {NoOfClients}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <span className="text-sm font-medium">{authorName}</span>
          </div>
          
          {isFreeTrial && (
            <Badge variant="outline" className="text-green-600">
              Free Trial
            </Badge>
          )}
        </div>

        <Button className="w-full mt-3" disabled={!activated || !approvalStatus}>
          {!activated ? "Inactive" : !approvalStatus ? "Pending Approval" : "View Details"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ServiceSkeleton({ width }: { width?: string }) {
  return (
    <Card className={cn("animate-pulse", width)}>
      <CardHeader className="p-0">
        <div className="w-full h-48 bg-gray-300" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="h-6 bg-gray-300 rounded w-full" />
        <div className="h-3 bg-gray-300 rounded w-full" />
        <div className="h-3 bg-gray-300 rounded w-2/3" />
        <div className="h-10 bg-gray-300 rounded w-full" />
      </CardContent>
    </Card>
  );
}