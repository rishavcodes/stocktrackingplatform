import { Calendar, Clock, MapPin, Users, Tag } from "lucide-react";

interface EventCardProps {
  id: string;
  date: string;
  time: string;
  category: string[];
  title: string;
  author: string;
  authorId: string;
  description: string;
  email: string;
  link?: string;
  location?: string;
  tags: string[];
  eventType: string;
  authorImage?: string;
  NoOfRegistration?: number;
  price: number;
  eventCostType?: string;
  couponCode?: {
    code: string;
    discount: number;
    validUntil: string;
  };
  targetAudience?: "user" | "provider";
  image?: string;
  className?: string;
}

export function EventCard({
  id,
  date,
  time,
  category,
  title,
  author,
  authorId,
  description,
  email,
  link,
  location,
  tags,
  eventType,
  authorImage,
  NoOfRegistration,
  price,
  eventCostType,
  couponCode,
  targetAudience,
  // image,
}: EventCardProps) {
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Event Image */}
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
        <Tag className="w-12 h-12 text-gray-400" />
      </div>
      
      {/* Date and Time */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{time}</span>
        </div>
      </div>
      
      {/* Location */}
      {location && (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
      )}
      
      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {description}
      </p>
      
      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        {category.slice(0, 3).map((cat, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
          >
            {cat}
          </span>
        ))}
        {category.length > 3 && (
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
            +{category.length - 3}
          </span>
        )}
      </div>
      
      {/* Event Details */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {authorImage && (
            <img
              src={authorImage}
              alt={author}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">{author}</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          {NoOfRegistration !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{NoOfRegistration}</span>
            </div>
          )}
          
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            price > 0 
              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {price > 0 ? `$${price}` : 'Free'}
          </div>
        </div>
      </div>
      
      {/* Event Type and Target Audience */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span className="capitalize">{eventType}</span>
        <span className="capitalize">{targetAudience}</span>
      </div>
      
      {/* Coupon Code */}
      {couponCode && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            Use code: <strong>{couponCode.code}</strong> for {couponCode.discount}% off
          </p>
        </div>
      )}
    </div>
  );
}