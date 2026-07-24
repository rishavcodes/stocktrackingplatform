"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChangeEvent, useEffect, useState, FormEvent, useCallback, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components";
import PencilIcon from "@/icons/PencilIcon";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import PdfIcon from "@/icons/PdfIcon";
import { Eye, Globe, Copy } from "lucide-react";

// Types
type UserProfile = {
  id: string;
  RegName: string;
  regNumber: string;
  description: string;
  number: number;
  email: string;
  profileUrl: string;
  disclaimer: string;
  gst?: string;
  hsnCode?: string;
  website?: string;
  refundPolicy: string;
  privacyPolicy: string;
  type: string;
  category: string;
  DOB: string;
  city: string;
  state: string;
  address1: string;
  address2: string;
  complianceOfficerName: string;
  complianceOfficerEmail: string;
  complianceOfficerNumber: string;
  investorCharter?: string;
  customSubdomain?: string | null;
  customSubdomainStatus?: "pending" | "active" | "disabled";
  socials?: {
    instagram: string;
    twitter: string;
    youtube: string;
    linkedin: string;
    facebook: string;
  };
};

function BrandedUrlCard({ subdomain }: { subdomain: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${subdomain}.tradeboxlive.com/dashboard`;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <section className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center flex-shrink-0">
        <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
          Your Branded Dashboard URL
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 dark:text-white truncate block hover:underline"
        >
          {url}
        </a>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/40 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
        {copied ? "Copied" : "Copy"}
      </button>
    </section>
  );
}

type FormData = UserProfile & {
  newPfp: File | null;
  prevUrl: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  facebook: string;
  newSignature: File | null;
  signature: string; 
}

// GST validation
const validateGST = (gst: string): boolean => {
  if (!gst?.trim()) return true;
  return gst.trim().length === 15;
};

// `userId` is set by the admin shell when an admin is editing a specific
// service provider's profile. When the SP edits their own profile through
// the dashboard, the prop is absent and we fall back to the session id.
// `hideToaster` lets the admin shell suppress this component's <Toaster />
// when the parent page already mounts one (avoids duplicate toasts).
export function MyProfile({
  userId,
  hideToaster,
}: {
  userId?: string;
  hideToaster?: boolean;
} = {}) {
  const { toast } = useToast();
  const { data: session } = useSession();
  const effectiveUserId = userId ?? session?.user?.id;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [investorCharterUrl, setInvestorCharterUrl] = useState<string>("");
const [investorCharterFile, setInvestorCharterFile] = useState<File | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [gstError, setGstError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  

  // Auto-save function
  const autoSaveProfile = useCallback(async () => {
    if (!formData || gstError || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    const payload = {
      id: formData.id,
      RegName: formData.RegName,
      email: formData.email,
      category: formData.type,
      description: formData.description,
      gst: formData.gst,
      hsnCode: formData.hsnCode,
      website: formData.website,
      disclaimer: formData.disclaimer,
      refundPolicy: formData.refundPolicy,
      privacyPolicy: formData.privacyPolicy,
      instagram: formData.instagram,
      youtube: formData.youtube,
      twitter: formData.twitter,
      linkedin: formData.linkedin,
      facebook: formData.facebook,
      number: Number(formData.number),
      complianceOfficerName: formData.complianceOfficerName,
      complianceOfficerEmail: formData.complianceOfficerEmail,
      complianceOfficerNumber: formData.complianceOfficerNumber,
    };

    const fd = new FormData();
    fd.append("data", JSON.stringify(payload));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
        {
          method: "POST",
          body: fd,
        }
      );

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        lastSavedDataRef.current = JSON.stringify(payload);
        
        toast({
          title: "Saved",
          description: "Changes saved automatically",
          variant: "default",
        });
      } else {
        throw new Error("Auto-save failed");
      }
    } catch (err) {
      console.error("Auto save failed", err);
      setSaveStatus('unsaved');
      toast({
        title: "Save Failed",
        description: "Failed to save changes automatically",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, gstError, hasUnsavedChanges, toast]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!effectiveUserId) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/getuserdata?id=${effectiveUserId}`
        );
        const json = await res.json();

        if (res.ok && json?.user) {
          const user = json.user;
          const initialData = {
            ...user,
            id: effectiveUserId,
            prevUrl: user.profileUrl,
            newPfp: null,
            newSignature: null,
            signature: user.signature || "",
            complianceOfficerName: user.complianceOfficerName || "",
            complianceOfficerEmail: user.complianceOfficerEmail || "",
            complianceOfficerNumber: user.complianceOfficerNumber || "",
            instagram: user.socials?.instagram || "",
            twitter: user.socials?.twitter || "",
            youtube: user.socials?.youtube || "",
            linkedin: user.socials?.linkedin || "",
            facebook: user.socials?.facebook || "",
            investorCharter: user.investorCharter || "",
            
          };
          setInvestorCharterUrl(user.investorCharter || "");
          setFormData(initialData);
          
          // Store initial data for comparison
          const { newPfp, newSignature, prevUrl, signature, ...dataToCompare } = initialData;
          lastSavedDataRef.current = JSON.stringify(dataToCompare);
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [effectiveUserId, toast]);

  // Handle input changes with debouncing
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "gst") {
      setGstError(
        value && !validateGST(value)
          ? "Invalid GST format. Please enter a valid 15-digit GST number"
          : ""
      );
    }

    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });

    // Mark that we have unsaved changes
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveProfile();
    }, 1500);
  };

  // Handle profile picture change (immediate save)
  const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData((prev) => (prev ? { ...prev, newPfp: file, profileUrl: url } : prev));
      
      // Auto-save profile picture immediately
      saveProfilePicture(file);
    }
  };

  // Handle signature upload (immediate save)
  const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => prev ? { ...prev, newSignature: file, signature: url } : prev);
      
      // Auto-save signature immediately
      saveSignature(file);
    }
  };

  // Remove signature
  const removeSignature = async () => {
    if (!formData) return;
    
    setFormData(prev => prev ? { ...prev, signature: "", newSignature: null } : prev);
    
    // Call API to remove signature
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", formData.id);
      fd.append("removeSignature", "true");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
        { method: "POST", body: fd }
      );
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Signature removed",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove signature",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to save profile picture immediately
  const saveProfilePicture = async (file: File) => {
    if (!formData) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    const fd = new FormData();
    fd.append("id", formData.id);
    fd.append("newPfp", file);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
        { method: "POST", body: fd }
      );
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile picture updated",
          variant: "default",
        });
        setSaveStatus('saved');
      }
    } catch (error) {
      setSaveStatus('unsaved');
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to save signature immediately
  const saveSignature = async (file: File) => {
    if (!formData) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    const fd = new FormData();
    fd.append("id", formData.id);
    fd.append("signature", file);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
        { method: "POST", body: fd }
      );
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Signature updated",
          variant: "default",
        });
        setSaveStatus('saved');
      }
    } catch (error) {
      setSaveStatus('unsaved');
      toast({
        title: "Error",
        description: "Failed to update signature",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle investor charter file (immediate save)
  const handleInvestorCharterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvestorCharterFile(file);
      saveInvestorCharter(file);
    }
  };

  // Remove investor charter
  // const removeInvestorCharter = () => {
  //   setInvestorCharterFile(null);

  // };

  // Save investor charter immediately
  const saveInvestorCharter = async (file: File) => {
    if (!formData) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    const fd = new FormData();
    fd.append("id", formData.id);
    fd.append("investorCharter", file);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
        { method: "POST", body: fd }
      );
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Investor charter uploaded",
          variant: "default",
        });
        setSaveStatus('saved');
      }
    } catch (error) {
      setSaveStatus('unsaved');
      toast({
        title: "Error",
        description: "Failed to upload investor charter",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit form (manual save)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!formData) return;

    // Validate GST
    if (formData.gst?.trim() && !validateGST(formData.gst)) {
      toast({
        title: "Error",
        description: "Please enter a valid GST number or leave it empty",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

  const data = {
    id: formData.id,
    RegName: formData.RegName,
    email: formData.email,
    category: formData.type,
    description: formData.description,
    gst: formData.gst,
    hsnCode: formData.hsnCode,
    website: formData.website,
    disclaimer: formData.disclaimer,
    refundPolicy: formData.refundPolicy,
    privacyPolicy: formData.privacyPolicy,
    prevUrl: formData.prevUrl,
    instagram: formData.instagram,
    youtube: formData.youtube,
    twitter: formData.twitter,
    linkedin: formData.linkedin,
    facebook: formData.facebook,
    number: Number(formData.number),
    complianceOfficerName: formData.complianceOfficerName,
    complianceOfficerEmail: formData.complianceOfficerEmail,
    complianceOfficerNumber: formData.complianceOfficerNumber,
  };

    const formDataToSend = new FormData();
    formDataToSend.append("data", JSON.stringify(data));

    // Attach files
    if (formData.newPfp) formDataToSend.append("newPfp", formData.newPfp);
    if (investorCharterFile) formDataToSend.append("investorCharter", investorCharterFile);
    if (formData.newSignature) formDataToSend.append("signature", formData.newSignature);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider`,
      { method: "POST", body: formDataToSend }
    );

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        toast({
          title: "Success",
          description: "Profile updated successfully",
          variant: "success",
        });
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      setSaveStatus('unsaved');
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500 dark:text-gray-400">
          Loading profile...
        </div>
      </div>
    );
  }

  // Remove investor charter
// Remove investor charter
const removeInvestorCharter = () => {
  if (!formData) return;
  
  // Clear both the URL and file
  setInvestorCharterUrl("");
  setInvestorCharterFile(null);
  
  // Mark that we have unsaved changes
  setHasUnsavedChanges(true);
  setSaveStatus('unsaved');
  
  toast({
    title: "Investor Charter Removed",
    description: "Click Save Changes to confirm removal",
    variant: "success",
  });
};
  return (
    <>
      {!hideToaster && <Toaster />}
      <form
        onSubmit={handleSubmit}
        className="dark:bg-blackShade dark:text-white/70 p-3 sm:p-6"
      >
        <div className="flex flex-col gap-6 sm:gap-8 max-w-7xl mx-auto">
          {/* Save status indicator */}

          {formData.customSubdomain && formData.customSubdomainStatus === "active" && (
            <BrandedUrlCard subdomain={formData.customSubdomain} />
          )}

          {/* Profile Section */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Profile Information
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your personal information and profile picture
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
              {/* Left Column - Avatar & Quick Stats */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  {/* Avatar */}
                  <div className="flex flex-col items-center">
                    <div className="relative group">
                      <Avatar className="h-40 w-40 ring-4 ring-green-500/20 transition-all duration-300 group-hover:ring-green-500/40">
                        <AvatarImage
                          src={formData.profileUrl}
                          alt="Profile"
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white text-4xl font-bold">
                          {formData.RegName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Change</span>
                      </div>
                    </div>

                    <label className="mt-6 w-full">
                      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-3 rounded-lg cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <PencilIcon className="w-4 h-4" />
                        <span>Change Photo</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                      />
                    </label>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                      JPG, PNG or GIF. Max 5MB
                    </p>
                  </div>

                  {/* Quick Info Cards */}
                  <div className="mt-8 space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700/30">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                        Registration Type
                      </div>
                      <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        {formData.type}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {formData.category}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700/30">
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                        Member Since
                      </div>
                      <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                        {new Date(formData.DOB).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div className="md:col-span-2">
                    <Input
                      title="Full Name"
                      type="text"
                      name="RegName"
                      value={formData.RegName}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      required={false}
                      disabled
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <Input
                      title="Email Address"
                      type="email"
                      name="email"
                      value={formData.email}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      required={false}
                      disabled
                    />
                  </div>

                  {/* Telegram Number Input */}
                  <div>
                    <Input
                      title="Number"
                      type="number"
                      name="number"
                      value={formData.number}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      required={false}
                      disabled
                    />
                  </div>

                  {/* Telegram Info Alert */}
                  <div className="md:col-span-2">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                            Important: Telegram Configuration
                          </h3>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Add your public Telegram username or phone (with country code, e.g., +91).
                            Ensure your DMs are open to receive notifications.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Display */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                      Registered Address
                    </label>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                            {formData.address1}
                            {formData.address2 && <>, {formData.address2}</>}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formData.city}, {formData.state}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Signature Upload */}
                  <div className="md:col-span-2 mt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Signature <span className="text-red-500">*</span>
                    </label>

                    {formData.signature ? (
                      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
                        <Image 
                          src={formData.signature} 
                          alt="Signature" 
                          width={120} 
                          height={60} 
                          className="object-contain border rounded-lg bg-white p-2"
                        />
                        <button
                          type="button"
                          onClick={removeSignature}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer w-full">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-xl text-center hover:border-blue-500 transition">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Upload Signature Image (PNG/JPG)</p>
                          <p className="text-xs text-gray-400 mt-1">Max size: 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSignatureChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Business Information */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Business Information
              </h2>
              <p className="text-sm text-blue-100">
                Configure your business details and legal information
              </p>
            </div>

            <div className="p-4 sm:p-8">
              {/* Business Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Business Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GST Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      GST Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="gst"
                        value={formData.gst || ""}
                        onChange={handleInputChange}
                        placeholder="22AAAAA0000A1Z5"
                        className={`w-full px-4 py-3.5 bg-white dark:bg-gray-900 border ${gstError
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          } rounded-lg focus:outline-none focus:ring-2 transition-all`}
                      />
                      {formData.gst && !gstError && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {gstError && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{gstError}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      15-character alphanumeric GST identification number
                    </p>
                  </div>

                  {/* HSN Code Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      HSN Code <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="hsnCode"
                        value={formData.hsnCode || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. 997152"
                        className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      HSN / SAC code used for GST invoicing
                    </p>
                  </div>

                  {/* Website Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Website <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="website"
                        value={formData.website || ""}
                        onChange={handleInputChange}
                        placeholder="https://yourwebsite.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Your business or portfolio website URL
                    </p>
                  </div>
                </div>
              </div>

              {/* Content & Policies Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Content & Policies
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* About Me */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <span>About Me</span>
                      <span className="text-xs text-gray-400 font-normal">
                        {formData.description?.length || 0}/1000
                      </span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      maxLength={1000}
                      placeholder="Tell your clients about your expertise, experience, and what makes your service unique..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This will be displayed on your public profile
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>
                        Disclaimer <span className="text-red-500">*</span>
                      </span>
                      <span className="text-xs text-gray-400 font-normal ml-auto">
                        {formData.disclaimer?.length || 0}/2000
                      </span>
                    </label>
                    <textarea
                      name="disclaimer"
                      value={formData.disclaimer}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      maxLength={2000}
                      placeholder="Add important disclaimers about risks, guarantees, and legal notices..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                    />
                  </div>

                  {/* Refund Policy */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span>Refund Policy</span>
                      <span className="text-xs text-gray-400 font-normal ml-auto">
                        {formData.refundPolicy?.length || 0}/2000
                      </span>
                    </label>
                    <textarea
                      name="refundPolicy"
                      value={formData.refundPolicy}
                      onChange={handleInputChange}
                      rows={5}
                      maxLength={2000}
                      placeholder="Describe your refund terms, conditions, and process..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />
                  </div>

                  {/* Privacy Policy */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Privacy Policy</span>
                      <span className="text-xs text-gray-400 font-normal ml-auto">
                        {formData.privacyPolicy?.length || 0}/3000
                      </span>
                    </label>
                    <textarea
                      name="privacyPolicy"
                      value={formData.privacyPolicy}
                      onChange={handleInputChange}
                      rows={6}
                      maxLength={3000}
                      placeholder="Explain how you collect, use, and protect user data..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Investor Charter Card */}
             {/* Investor Charter Card */}
<div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
  <div className="flex items-center gap-2 mb-6">
    <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
      Legal Documentation
    </h3>
  </div>

  <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
      <PdfIcon className="w-4 h-4 text-red-500" />
      <span>Investor Charter</span>
      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
        Required
      </span>
    </label>

    {/* Show existing investor charter */}
    {investorCharterUrl && !investorCharterFile ? (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700/30 rounded-xl p-5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
              <PdfIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Investor Charter.pdf
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Document uploaded • Click to view
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={investorCharterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </a>
            <button
              type="button"
              onClick={()=>removeInvestorCharter()}
              className="flex-shrink-0 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            </button>
          </div>
        </div>
      </div>
    ) : investorCharterFile ? (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700/30 rounded-xl p-5 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
              <PdfIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {investorCharterFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {(investorCharterFile.size / 1024).toFixed(2)} KB • PDF Document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeInvestorCharter}
            className="flex-shrink-0 sm:ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </div>
      </div>
    ) : (
      <label className="block cursor-pointer group">
        <div className="border-3 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-red-400 dark:group-hover:border-red-500 rounded-xl p-8 transition-all duration-300 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-900/50 group-hover:from-red-50/50 dark:group-hover:from-red-900/10">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PdfIcon className="w-8 h-8 text-red-500" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Upload Investor Charter
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              PDF only • Maximum file size: 5MB
            </p>
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={handleInvestorCharterChange}
        />
      </label>
    )}

    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4 mt-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            What is an Investor Charter?
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            The Investor Charter outlines investor rights, responsibilities, and grievance procedures.
            This document is required for regulatory compliance.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
            </div>
          </section>

          {/* Compliance Section */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Compliance Details
                  </h2>
                  <p className="text-sm text-emerald-100 mt-1">
                    Regulatory compliance officer information
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-8">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Why is this required?
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      SEBI regulations require designated compliance officers to handle client grievances and ensure regulatory adherence.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Compliance Officer Name */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>Officer Name</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="complianceOfficerName"
                      value={formData.complianceOfficerName}
                      onChange={handleInputChange}
                      placeholder="Full name"
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Compliance Officer Email */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span>Officer Email</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="complianceOfficerEmail"
                      value={formData.complianceOfficerEmail}
                      onChange={handleInputChange}
                      placeholder="officer@company.com"
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Compliance Officer Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>Officer Contact</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="complianceOfficerNumber"
                      value={formData.complianceOfficerNumber}
                      onChange={handleInputChange}
                      placeholder="+91 XXXXXXXXXX"
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                      This information will be publicly visible
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      Clients can use these details to reach your compliance officer for grievances, complaints, or regulatory queries.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Social Links Section */}
          {/* Social Links Section */}
<section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
  {/* Header */}
  <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-4 sm:p-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Social Media Links
        </h2>
        <p className="text-sm text-purple-100 mt-1">
          Connect your social media profiles
        </p>
      </div>
    </div>
  </div>

  <div className="p-4 sm:p-8">
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/30 rounded-xl p-5 mb-8">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
            Boost Your Profile Visibility
          </h4>
          <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
            Add your social media profiles to build trust with clients and grow your following. All fields are optional.
          </p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Instagram */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <div className="w-5 h-5 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
          <span>Instagram</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <span className="text-sm">@</span>
          </div>
          <input
            type="text"
            name="instagram"
            value={formData.instagram}
            onChange={handleInputChange}
            placeholder="username"
            className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
          />
        </div>
      </div>

      {/* YouTube */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <div className="w-5 h-5 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span>YouTube</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <span className="text-sm">@</span>
          </div>
          <input
            type="text"
            name="youtube"
            value={formData.youtube}
            onChange={handleInputChange}
            placeholder="channel"
            className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>
      </div>

      {/* Twitter/X */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <div className="w-5 h-5 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <span>Twitter / X</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <span className="text-sm">@</span>
          </div>
          <input
            type="text"
            name="twitter"
            value={formData.twitter}
            onChange={handleInputChange}
            placeholder="username"
            className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 transition-all"
          />
        </div>
      </div>

      {/* Facebook */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <span>Facebook</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <span className="text-sm">@</span>
          </div>
          <input
            type="text"
            name="facebook"
            value={formData.facebook}
            onChange={handleInputChange}
            placeholder="username"
            className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>
      </div>

      {/* LinkedIn */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <div className="w-5 h-5 bg-blue-700 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <span>LinkedIn</span>
        </label>
        <div className="relative">
          <input
            type="text"
            name="linkedin"
            value={formData.linkedin}
            onChange={handleInputChange}
            placeholder="profile-url"
            className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>
    </div>

    {/* Preview Card */}
    {(formData.instagram || formData.youtube || formData.twitter || formData.linkedin || formData.facebook) && (
      <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Your Connected Profiles
        </h4>
        <div className="flex flex-wrap gap-3">
          {formData.instagram && (
            <div className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="text-sm font-medium">@{formData.instagram}</span>
            </div>
          )}
          {formData.youtube && (
            <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="text-sm font-medium">@{formData.youtube}</span>
            </div>
          )}
          {formData.twitter && (
            <div className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg shadow-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-sm font-medium">@{formData.twitter}</span>
            </div>
          )}
          {formData.facebook && (
            <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-sm font-medium">@{formData.facebook}</span>
            </div>
          )}
          {formData.linkedin && (
            <div className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <span className="text-sm font-medium">{formData.linkedin}</span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
</section>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !!gstError}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-md transition-colors"
            >
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'unsaved' ? 'Save Changes' : 
               'All changes saved'}
            </button>
          </div>
        </div>
      </form>



    </>
  );
}

