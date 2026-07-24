// pages/events/[id].tsx
"use client";
import ShareIcon from "@/icons/ShareIcon";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AnimatePresence } from "framer-motion";
import { ShareCard } from "@/components";
import { APEX_DOMAIN, buildProductUrl } from "@/lib/customDomain";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useSpSubdomain } from "@/hooks/useSpSubdomain";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import ActionButtons from "@/app/view/services/ActionButtons";
import ActionButtonsForEvents from "../../ActionButtonsForEvent";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthModal from "@/components/Modal/AuthModal";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  ArrowLeft,
  CheckCircle,
  Tag,
  User,
  FileText,
  Shield,
  ExternalLink,
  Monitor,
  Building
} from "lucide-react";

type Props = {
  params: { id: string };
};

type Event = {
  _id: string;
  title: string;
  description: string;
  schedule: string;
  location: string;
  category: string[];
  image?: string;
  tags: string[];
  disclaimer: string;
  eventType: string;
  eventCostType: string;
  price: number;
  registeredUsers: string[];
  NoOfRegistration: number;
  authorData: {
    id: string;
    email: string;
    name: string;
    authorImage: string;
    type: string;
    aboutAuthor: string;
  };
  targetAudience?: "user" | "provider";
};

type SPType = {
  [key: string]: string | number | undefined;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EventDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  const [id, setId] = useState<string>("");
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  const [isVisible, setIsVisible] = useState<string>("");
  const session = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [coupon, setCoupon] = useState<string>("");
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [spData, setSpData] = useState<SPType | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEventTypeModalOpen, setIsEventTypeModalOpen] = useState(false);
  const [selectedEventMode, setSelectedEventMode] = useState<"online" | "offline" | null>(null);
  const [eventcount ,setEventcount]= useState(100)
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
    
  }, [params]);

  const { data, error } = useSWR(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/eventdetails/?id=${id}`,
    fetcher
  );

  const fetchSpData = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
      );

      if (res.status === 200) {
        const response = await res.json();
        setSpData(response.data);
        
      } else {
        console.log("Failed to sp details");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const event: Event | null = data?.event || null;
  const authorSpId = event?.authorData?.id;
  useEnforceSubdomainOwnership(authorSpId);
  useCanonicalUrl();
  const sp = useSpSubdomain(authorSpId);
  const shareUrl = id
    ? sp?.customSubdomainStatus === "active" && sp.customSubdomain
      ? buildProductUrl("events", id, sp)
      : `https://${hostname || APEX_DOMAIN}/view/events/details/${id}`
    : "";

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (session.data?.user) {
        try { 
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/checkregistration`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: session.data.user.id,
                eventId: id,
                
              }),
              
            }
          );
             console.log(id)
          if (!response.ok) {
            throw new Error("Failed to check registration status");
          }

          const data = await response.json();
          setIsRegistered(data.isRegistered);
          setSelectedEventMode(data.registrationMode);
        } catch (error) {
          console.error("Error checking registration status:", error);
        }
      }
    };

    if (session.data?.user) {
      setIsLoggedIn(true);
      checkRegistrationStatus();
    }
    if (event?.authorData?.id) {
      fetchSpData(event?.authorData?.id);
    }
  }, [session,id]);

  const handleCouponChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCoupon(event.target.value);
  };

  const applyCoupon = async () => {
    const eventId = event?._id;
    const price = event?.price;
    const couponCode = coupon;
    try { 
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/applycouponforevent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ couponCode, eventId, price }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      const data = await response.json();
      setDiscountedPrice(data.discountedPrice);
      toast({
        title: "Coupon Applied",
        description: `Coupon code discount applied successfully`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Invalid Coupon",
        description: "The coupon code is invalid or has expired",
        variant: "destructive",
      });
    }
  };

  const handleLoginModal = () => {
    router.push(`/auth/user/signin?mode=learning&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`,);
  };

  const handleEventTypeSelection = (mode: "online" | "offline") => {
    setSelectedEventMode(mode);
    setIsEventTypeModalOpen(false);
    // Proceed with registration after mode selection
    handleRegister(mode);
  };

  
  
  const handleRegister = async (eventMode?: "online" | "offline") => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }

    // For hybrid events, show mode selection modal if mode is not provided
    if (event?.eventType === "Hybrid" && !eventMode) {
      setIsEventTypeModalOpen(true);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/registerforevent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: session.data?.user.id,
            name: session.data?.user.RegName,
            email: session.data?.user.email,
            phone: session.data?.user.number,
            eventId: id,
            eventMode: eventMode || (event?.eventType === "Online" ? "online" : 
                      event?.eventType === "Offline" ? "offline" : "online") // Default for non-hybrid
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to register");
      }
      if (response.status === 200) {
        toast({
          title: "Registration Successful",
          description: eventMode ? 
            `You have successfully registered for the ${eventMode} event!` : 
            "You have successfully registered for the event!",
          variant: "default",
        });
      }

      setIsRegistered(true);
    } catch (error) {
      console.error("Error registering:", error);
      toast({
        title: "Registration Failed",
        description: "There was an error processing your registration",
        variant: "destructive",
      });
    }
  };

  console.log("this is the events details" ,event);
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.schedule);
  const currentDate = new Date();
  const isPastEvent = eventDate < currentDate;
  const date = eventDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = eventDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  function renderContent(content: string) {
    return { __html: content.replace(/\n/g, "<br />") };
  }

  const finalPrice = discountedPrice ? discountedPrice : event.price;
  const gstAmount = finalPrice * 0.18;
  const totalPrice = finalPrice + gstAmount;


const callbackUrl = `/view/events/details/${id}`;
const disclaimerText = event.disclaimer || "";
const isLongDisclaimer = disclaimerText.length > 100;

const displayedDisclaimer =
  showFullDisclaimer || !isLongDisclaimer
    ? disclaimerText
    : disclaimerText.slice(0, 100) + "...";



  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Main Event Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-8">
            {/* Event Header with Image */}
            <div className="relative">
              {event.image && (
                <div className="h-80 w-full overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              {/* Event Info Overlay */}
              
            </div>
            <div className={`${event.image ? ' bottom-10 left-0 right-0 p-8 text-white' : 'p-8'}`}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {event.category.map((tag) => (
                    <span
                      key={tag}
                      className=""
                    >
                      
                    </span>
                  ))}
                  {event.targetAudience === "provider" && (
                    <span className="px-3 py-1 bg-yellow-500/90 text-black text-sm font-medium rounded-full">
                      For Research Analysts Only
                    </span>
                  )}
                  {/* Event Type Badge */}
                  <span className={`px-3 py-1 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30 ${
                    event.eventType === "Online" ? "bg-blue-500/90" :
                    event.eventType === "Offline" ? "bg-green-500/90" :
                    "bg-purple-500/90" // Hybrid
                  }`}>
                    {event.eventType}
                    {event.eventType === "Hybrid" && " Event"}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl text-black font-bold mb-4 leading-tight">
                  {event.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                    <Users className="w-4 h-4" />
                    <span>{eventcount+event.NoOfRegistration || 100} Attending</span>
                  </div>
                  <div className="flex items-center gap-2 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                    <Calendar className="w-4 h-4" />
                    <span>{date}</span>
                  </div>
                  <div className="flex items-center gap-2 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4" />
                    <span>{time}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>

            {/* Event Content */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* About Event */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                      <FileText className="w-6 h-6 text-blue-500" />
                      About This Event
                    </h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      <div
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={renderContent(event.description)}
                      />
                    </div>
                  </div>

                  {/* About Expert */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <User className="w-6 h-6 text-purple-500" />
                      About The Expert
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg">
                        <AvatarImage
                          src={event.authorData.authorImage}
                          alt={event.authorData.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl">
                          {event.authorData.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <h3 className="text-2xl font-bold  text-gray-900 dark:text-white mb-2">
                          {event.authorData.name}
                        </h3>
                        
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          {event.authorData.aboutAuthor}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Disclaimer */}
               <div>
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
    <Shield className="w-6 h-6 text-amber-500" />
    Disclaimer
  </h2>

  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6">
    <div
      className="text-amber-800 dark:text-amber-200 leading-relaxed break-words overflow-wrap-anywhere"
      dangerouslySetInnerHTML={renderContent(displayedDisclaimer)}
    />

    {isLongDisclaimer && (
      <button
      
        onClick={() => setShowFullDisclaimer((prev) => !prev)}
        className="mt-3 text-amber-600 dark:text-amber-400 font-medium text-sm"
      >
        {showFullDisclaimer ? "See less" : "See more"}
      </button>
    )}
  </div>
</div>


                </div>

                {/* Registration Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/50 sticky top-8">
                    {/* Price Section */}
                    <div className="text-center mb-6">
                      {event.eventCostType === "Free" ? (
                        <div className="space-y-2">
                          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                            FREE
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            No registration fee required
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                              ₹{finalPrice}
                            </span>
                            {discountedPrice && (
                              <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                                ₹{event.price}
                              </span>
                            )}
                          </div>
                          {event.eventCostType === "Paid" && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              + ₹{gstAmount.toFixed(2)} GST = ₹{totalPrice.toFixed(2)} Total
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Coupon Section */}
                    {/* {event.eventCostType === "Paid" && !isRegistered && (
                      <div className="mb-6">
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="Enter coupon code"
                            value={coupon}
                            onChange={handleCouponChange}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                          />
                          <button
                            onClick={applyCoupon}
                            disabled={isSubscribing}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )} */}

                    {/* Registration Button */}
                    <div className="space-y-4">
                      {isPastEvent ? (
                        <div className="text-center py-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                          <div className="text-gray-500 dark:text-gray-400 font-medium">
                            Registration Closed
                          </div>
                          <div className="text-sm text-gray-400 dark:text-gray-500">
                            This event has already occurred
                          </div>
                        </div>
                      ) : isRegistered ? (
                        <div className="text-center py-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-xl border border-green-200 dark:border-green-800/50">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                          <div className="font-semibold">Registered</div>
                          <div className="text-sm">
                            {selectedEventMode ? `You're registered for ${selectedEventMode} mode` : "You're all set for this event!"}

                          </div>
                        </div>
                      ) : !isLoggedIn ? (
                        <Button
                          onClick={handleLoginModal}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300"
                        >
                          Login to Register
                        </Button>
                      ) : event.eventCostType === "Paid" ? (
                        <ActionButtonsForEvents
                          category={event.authorData.type}
                          authorid={event.authorData.id}
                          eventName={event.title}
                          authorName={event.authorData.name}
                          authorEmail={event.authorData.email}
                          eventId={event._id}
                          description={event.description}
                          price={Number(totalPrice.toFixed(2))}
                          authorLogo={event.authorData.authorImage}
                          sellerName={event.authorData.name}
                          sellerId={event.authorData.id}
                          setIsRegistered={setIsRegistered}
                          handleRegister={() => handleRegister()}
                          transactionType={"event"}
                          serviceProviderId={event.authorData.id}
                        />
                      ) : ( 
                        <Button
                          onClick={() => handleRegister()}
                          className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105"
                        >
                          Click To Register
                        </Button>
                      )}
                    </div>

                    {/* Share Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Share Event</span>
                        <div className="relative">
                          <button
                            onClick={() => setIsVisible(id)}
                            onMouseEnter={() => setIsVisible(id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </button>
                          <AnimatePresence>
                            {id === isVisible && (
                              <div className="absolute top-full right-0 mt-2 z-10">
                                <ShareCard
                                  title={`${event.title} - `}
                                  separator="Read more at :-"
                                  url={shareUrl}
                                  hashtags={event.tags}
                                />
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        

        {/* Event Type Selection Modal for Hybrid Events */}
        <Dialog open={isEventTypeModalOpen} onOpenChange={setIsEventTypeModalOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold text-gray-900 dark:text-white">
                Select Event Mode
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                This is a hybrid event. Please choose how you&apos;d like to attend.
              </p>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Online Option */}
              <button
                onClick={() => handleEventTypeSelection("online")}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Monitor className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Join Online</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Attend virtually from anywhere
                    </p>
                  </div>
                </div>
              </button>

              {/* Offline Option */}
              <button
                onClick={() => handleEventTypeSelection("offline")}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-500 transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Attend In-Person</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Join physically at {event.location}
                    </p>
                  </div>
                </div>
              </button>
            </div>  
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsEventTypeModalOpen(false)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default EventDetailPage;