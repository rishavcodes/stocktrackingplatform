'use client';

import { Input, LanguagesInput, MultiSelect } from "@/components";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
    CalendarDays,
    Clock,
    Globe,
    ImagePlus,
    Loader2,
    Mail,
    MapPin,
    Link as LinkIcon,
    IndianRupee,
    FileText,
    Tag,
    Users,
    Monitor,
    Building2,
    Zap,
    X,
} from "lucide-react";

export type eventDataProps = {
    title: string;
    eventEmail: string;
    scheduleDate: string;
    scheduleTime: string;
    link: string;
    location: string;
    description: string;
    disclaimer: string;
    eventType: string;
    image: File | null;
    language: string;
    eventCostType: string;
    price: number;
    targetAudience: "user" | "provider";
};

const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB

const initialEventData: eventDataProps = {
    title: "",
    scheduleDate: "",
    scheduleTime: "",
    link: "",
    location: "",
    eventEmail: "",
    description: "",
    disclaimer: "",
    eventType: "",
    image: null,
    language: "english",
    eventCostType: "Free",
    price: 0,
    targetAudience: "user",
};

export default function AdminCreateEvent() {
    const [categories, setCategories] = useState<string[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [eventCostType, setEventCostType] = useState("Free");
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();
    const session = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [eventData, SeteventData] = useState<eventDataProps>({ ...initialEventData });

    function PosteventChangehandler(
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value, type } = event.target;
        if (name === 'price') {
            SeteventData((prev) => ({ ...prev, [name]: parseFloat(value) }));
        } else {
            SeteventData((prev) => ({
                ...prev,
                [name]: type === "checkbox"
                    ? (event.target as HTMLInputElement).checked
                    : value,
            }));
        }
    }

    function eventImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.target;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.size > MAX_BANNER_SIZE) {
                toast({
                    title: "File too large",
                    description: "Banner image must be under 5 MB",
                    variant: "destructive",
                });
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            SeteventData((prev) => ({ ...prev, image: file }));
        }
    }

    function removeBanner() {
        setPreviewUrl("");
        SeteventData((prev) => ({ ...prev, image: null }));
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function eventCostTypeChangeHandler(event: ChangeEvent<HTMLInputElement>) {
        setEventCostType(event.target.value);
    }

    function resetForm() {
        SeteventData({ ...initialEventData });
        setPreviewUrl("");
        setCategories([]);
        setEventCostType("Free");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function PostSubmitHandler(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (eventData.eventType === "") {
            toast({ title: "No event type selected", description: "Please select Online, Offline, or Hybrid", variant: "destructive" });
            return;
        }
        if (categories.length === 0) {
            toast({ title: "No category selected", description: "Please select at least one category", variant: "destructive" });
            return;
        }
        if (!eventData.image) {
            toast({ title: "No banner selected", description: "Please upload a banner image", variant: "destructive" });
            return;
        }

        const combinedDateTime = new Date(`${eventData.scheduleDate}T${eventData.scheduleTime}`);
        const ISTOffset = 5.5 * 60;
        const utcDateTime = combinedDateTime.getTime() + (combinedDateTime.getTimezoneOffset() * 60000);
        const istDateTime = new Date(utcDateTime + (ISTOffset * 60000));
        const scheduledDateTime = istDateTime.toISOString();

        const data = {
            name: "Admin",
            email: session.data?.user.email,
            id: session.data?.user.id,
            type: "Admin",
            authorImage: session.data?.user.profileUrl || "NA",
            aboutAuthor: "Admin created event",
            title: eventData.title,
            location: eventData.location,
            category: categories,
            scheduledDateTime,
            description: eventData.description,
            disclaimer: eventData.disclaimer,
            link: eventData.link,
            eventEmail: eventData.eventEmail,
            eventType: eventData.eventType,
            language: eventData.language,
            eventCostType,
            price: eventData.price,
            isApproved: true,
            targetAudience: eventData.targetAudience,
        };

        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        formData.append("image", eventData.image);

        setSubmitting(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/createevent`,
                {
                    method: "POST",
                    body: formData,
                    headers: { Authorization: `Bearer ${session.data?.backendToken}` },
                }
            );
            if (response.status === 200) {
                toast({ title: "Event created", description: "Event has been published successfully", variant: "success" });
                resetForm();
            } else {
                toast({ title: "Error!", description: "There was an error creating the event", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error!", description: "There was an error creating the event", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    }

    const SectionTitle = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{label}</h3>
        </div>
    );

    const RadioOption = ({
        name, value, checked, onChange, icon: Icon, label, description,
    }: {
        name: string; value: string; checked: boolean;
        onChange: (e: ChangeEvent<HTMLInputElement>) => void;
        icon: React.ElementType; label: string; description?: string;
    }) => (
        <label
            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
                ${checked
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
        >
            <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`p-2 rounded-lg ${checked ? "bg-emerald-100 dark:bg-emerald-800/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                <Icon className={`h-4 w-4 ${checked ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`} />
            </div>
            <div>
                <div className={`text-sm font-medium ${checked ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-300"}`}>{label}</div>
                {description && <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>}
            </div>
            {checked && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
            )}
        </label>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
            <Toaster />

            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Event</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill in the details below to publish a new event.</p>
            </div>

            <form method="POST" onSubmit={PostSubmitHandler} className="max-w-7xl mx-auto space-y-6">

                {/* ── Banner Image ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={ImagePlus} label="Event Banner" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Upload a banner image for your event. Max file size: 5 MB.</p>

                    {previewUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <Image src={previewUrl} alt="event-preview" width={1280} height={720} className="w-full h-auto max-h-80 object-cover" />
                            <button
                                type="button"
                                onClick={removeBanner}
                                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 text-white text-xs rounded-lg">
                                {(eventData.image?.size ?? 0) > 1024 * 1024
                                    ? `${((eventData.image?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB`
                                    : `${Math.round((eventData.image?.size ?? 0) / 1024)} KB`}
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center gap-3 h-56 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                name="image"
                                onChange={eventImageChangeHandler}
                            />
                            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                                <ImagePlus className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Click to upload</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400"> or drag and drop</span>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG, WEBP up to 5 MB</span>
                        </label>
                    )}
                </div>

                {/* ── Basic Info ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={FileText} label="Basic Information" />
                    <div className="space-y-5">
                        <Input
                            title="Event Title"
                            type="text"
                            name="title"
                            value={eventData.title}
                            onChange={PosteventChangehandler}
                            labelStyle="text-sm font-medium text-gray-700 dark:text-gray-300"
                            roundness="rounded-lg"
                            height="py-2.5"
                            placeholder="Enter event title"
                            required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                <MultiSelect onChange={setCategories} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                                <LanguagesInput title="" name="language" onChange={SeteventData} value={eventData.language} width="w-full" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition resize-none"
                                value={eventData.description}
                                name="description"
                                onChange={PosteventChangehandler}
                                rows={6}
                                placeholder="Describe your event..."
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* ── Schedule ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={CalendarDays} label="Schedule" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" /> Date
                            </label>
                            <input
                                type="date"
                                name="scheduleDate"
                                min={new Date().toISOString().split("T")[0]}
                                value={eventData.scheduleDate}
                                onChange={PosteventChangehandler}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" /> Time
                            </label>
                            <input
                                type="time"
                                name="scheduleTime"
                                value={eventData.scheduleTime}
                                onChange={PosteventChangehandler}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Event Type ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={Monitor} label="Event Type" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <RadioOption
                            name="eventType" value="Online" checked={eventData.eventType === "Online"}
                            onChange={PosteventChangehandler} icon={Globe} label="Online" description="Virtual event"
                        />
                        <RadioOption
                            name="eventType" value="Offline" checked={eventData.eventType === "Offline"}
                            onChange={PosteventChangehandler} icon={Building2} label="Offline" description="In-person event"
                        />
                        <RadioOption
                            name="eventType" value="Hybrid" checked={eventData.eventType === "Hybrid"}
                            onChange={PosteventChangehandler} icon={Zap} label="Hybrid" description="Both online & offline"
                        />
                    </div>

                    {(eventData.eventType === "Online" || eventData.eventType === "Hybrid") && (
                        <div className="mt-5">
                            <Input
                                title="Meeting Link"
                                type="url"
                                name="link"
                                labelStyle="text-sm font-medium text-gray-700 dark:text-gray-300"
                                roundness="rounded-lg"
                                height="py-2.5"
                                placeholder="https://..."
                                onChange={PosteventChangehandler}
                                value={eventData.link}
                            />
                        </div>
                    )}

                    {(eventData.eventType === "Offline" || eventData.eventType === "Hybrid") && (
                        <div className="mt-5">
                            <Input
                                title="Venue / Location"
                                type="text"
                                name="location"
                                labelStyle="text-sm font-medium text-gray-700 dark:text-gray-300"
                                roundness="rounded-lg"
                                height="py-2.5"
                                placeholder="Enter event location"
                                onChange={PosteventChangehandler}
                                value={eventData.location}
                            />
                        </div>
                    )}
                </div>

                {/* ── Pricing & Audience ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={Tag} label="Pricing & Audience" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Cost Type */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Event Cost</label>
                            <div className="flex gap-3">
                                <RadioOption
                                    name="eventCostType" value="Free" checked={eventCostType === "Free"}
                                    onChange={eventCostTypeChangeHandler} icon={Tag} label="Free"
                                />
                                <RadioOption
                                    name="eventCostType" value="Paid" checked={eventCostType === "Paid"}
                                    onChange={eventCostTypeChangeHandler} icon={IndianRupee} label="Paid"
                                />
                            </div>
                        </div>

                        {/* Target Audience */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Target Audience</label>
                            <div className="flex gap-3">
                                <RadioOption
                                    name="targetAudience" value="user" checked={eventData.targetAudience === "user"}
                                    onChange={PosteventChangehandler} icon={Users} label="User"
                                />
                                <RadioOption
                                    name="targetAudience" value="provider" checked={eventData.targetAudience === "provider"}
                                    onChange={PosteventChangehandler} icon={Building2} label="Provider"
                                />
                            </div>
                        </div>
                    </div>

                    {eventCostType === "Paid" && (
                        <div className="mt-5 max-w-xs">
                            <Input
                                title="Price (₹)"
                                type="number"
                                name="price"
                                value={eventData.price}
                                labelStyle="text-sm font-medium text-gray-700 dark:text-gray-300"
                                roundness="rounded-lg"
                                height="py-2.5"
                                placeholder="0"
                                onChange={PosteventChangehandler}
                            />
                        </div>
                    )}
                </div>

                {/* ── Contact & Disclaimer ── */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                    <SectionTitle icon={Mail} label="Contact & Disclaimer" />
                    <div className="space-y-5">
                        <Input
                            title="Contact Email"
                            type="email"
                            name="eventEmail"
                            labelStyle="text-sm font-medium text-gray-700 dark:text-gray-300"
                            roundness="rounded-lg"
                            height="py-2.5"
                            placeholder="contact@example.com"
                            onChange={PosteventChangehandler}
                            value={eventData.eventEmail}
                            required
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Disclaimer *</label>
                            <textarea
                                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition resize-none"
                                value={eventData.disclaimer}
                                name="disclaimer"
                                required
                                onChange={PosteventChangehandler}
                                rows={4}
                                placeholder="Enter disclaimer for the event..."
                            />
                        </div>
                    </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center justify-between gap-4 pb-10">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Event"
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={resetForm}
                        disabled={submitting}
                        className="px-8 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                    >
                        Reset Form
                    </button>
                </div>
            </form>
        </div>
    );
}
