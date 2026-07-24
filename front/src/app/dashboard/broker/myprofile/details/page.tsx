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

// Types
type UserProfile = {
  id: string;
  RegName: string;
  companyName?: string;
  regNumber: string;
  description: string;
  number: number;
  email: string;
  profileUrl: string;
  disclaimer: string;
  gst?: string;
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
  companyLogo?: string;
  certificate?: string;
  CompanyCertificate?: string;
  investorCharter: string;
  socials?: {
    instagram: string;
    twitter: string;
    youtube: string;
    linkedin: string;
  };
  lmsCommercial?: {
    enabled: boolean;
    commissionPercentage: number;
  };
  razorpayKey?: {
    razorpayKeyId: string;
    razorpayKeySecret: string;
  };
};

type FormData = UserProfile & {
  newPfp: File | null;
  prevUrl: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
  newSignature: File | null;
  signature: string;
  newCompanyLogo: File | null;
  newCertificate: File | null;
  newCompanyCertificate: File | null;
  commissionPercentage: number;
  lmsEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

// GST validation
const validateGST = (gst: string): boolean => {
  if (!gst?.trim()) return true;
  return gst.trim().length === 15;
};

export default function BrokerProfile() {
  const { toast } = useToast();
  const { data: session } = useSession();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [investorCharterFile, setInvestorCharterFile] = useState<File | null>(null);
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
      companyName: formData.companyName,
      email: formData.email,
      category: formData.category,
      description: formData.description,
      gst: formData.gst,
      website: formData.website,
      disclaimer: formData.disclaimer,
      refundPolicy: formData.refundPolicy,
      privacyPolicy: formData.privacyPolicy,
      instagram: formData.instagram,
      youtube: formData.youtube,
      twitter: formData.twitter,
      linkedin: formData.linkedin,
      number: Number(formData.number),
      complianceOfficerName: formData.complianceOfficerName,
      complianceOfficerEmail: formData.complianceOfficerEmail,
      complianceOfficerNumber: formData.complianceOfficerNumber,
      lmsCommercial: {
        enabled: formData.lmsEnabled,
        commissionPercentage: formData.commissionPercentage
      },
      razorpayKey: {
        razorpayKeyId: formData.razorpayKeyId,
        razorpayKeySecret: formData.razorpayKeySecret
      }
    };

    const fd = new FormData();
    fd.append("data", JSON.stringify(payload));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/broker`,
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
      if (!session?.user?.id) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/getuserdata?id=${session.user.id}`
        );
        const json = await res.json();

        if (res.ok && json?.user) {
          const user = json.user;
          const initialData = {
            ...user,
            id: session.user.id,
            prevUrl: user.profileUrl,
            newPfp: null,
            newSignature: null,
            newCompanyLogo: null,
            newCertificate: null,
            newCompanyCertificate: null,
            signature: user.signature || "",
            companyName: user.companyName || "",
            companyLogo: user.companyLogo || "",
            certificate: user.certificate || "",
            CompanyCertificate: user.CompanyCertificate || "",
            complianceOfficerName: user.complianceOfficerName || "",
            complianceOfficerEmail: user.complianceOfficerEmail || "",
            complianceOfficerNumber: user.complianceOfficerNumber || "",
            instagram: user.socials?.instagram || "",
            twitter: user.socials?.twitter || "",
            youtube: user.socials?.youtube || "",
            linkedin: user.socials?.linkedin || "",
            commissionPercentage: user.lmsCommercial?.commissionPercentage || 0,
            lmsEnabled: user.lmsCommercial?.enabled || false,
            razorpayKeyId: user.razorpayKey?.razorpayKeyId || "",
            razorpayKeySecret: user.razorpayKey?.razorpayKeySecret || "",
          };
          
          setFormData(initialData);
          
          // Store initial data for comparison
          const { newPfp, newSignature, newCompanyLogo, newCertificate, newCompanyCertificate, prevUrl, signature, ...dataToCompare } = initialData;
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
  }, [session, toast]);

  // Handle input changes with debouncing
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "gst") {
      setGstError(
        value && !validateGST(value)
          ? "Invalid GST format. Please enter a valid 15-digit GST number"
          : ""
      );
    }

    setFormData((prev) => {
      if (!prev) return prev;
      return { 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      };
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

  // Handle profile picture change
  const handleProfilePicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData((prev) => (prev ? { ...prev, newPfp: file, profileUrl: url } : prev));
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Handle company logo change
  const handleCompanyLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData((prev) => (prev ? { ...prev, newCompanyLogo: file, companyLogo: url } : prev));
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Handle certificate upload
  const handleCertificateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => (prev ? { ...prev, newCertificate: file } : prev));
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Handle company certificate upload
  const handleCompanyCertificateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => (prev ? { ...prev, newCompanyCertificate: file } : prev));
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Handle signature upload
  const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => prev ? { ...prev, newSignature: file, signature: url } : prev);
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Handle investor charter file
  const handleInvestorCharterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvestorCharterFile(file);
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
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

   // In the handleSubmit function, update the payload to:
const data = {
  id: formData.id,
  RegName: formData.RegName,
  companyName: formData.companyName,
  email: formData.email,
  category: formData.category, // Make sure this is included
  description: formData.description,
  gst: formData.gst,
  website: formData.website,
  disclaimer: formData.disclaimer,
  refundPolicy: formData.refundPolicy,
  privacyPolicy: formData.privacyPolicy,
  instagram: formData.instagram,
  youtube: formData.youtube,
  twitter: formData.twitter,
  linkedin: formData.linkedin,
  number: Number(formData.number),
  complianceOfficerName: formData.complianceOfficerName,
  complianceOfficerEmail: formData.complianceOfficerEmail,
  complianceOfficerNumber: formData.complianceOfficerNumber,
  lmsCommercial: {
    enabled: formData.lmsEnabled,
    commissionPercentage: formData.commissionPercentage
  },
  razorpayKey: {
    razorpayKeyId: formData.razorpayKeyId,
    razorpayKeySecret: formData.razorpayKeySecret
  }
};

    const formDataToSend = new FormData();
    formDataToSend.append("data", JSON.stringify(data));

    // Attach files
    if (formData.newPfp) formDataToSend.append("newPfp", formData.newPfp);
    if (formData.newCompanyLogo) formDataToSend.append("companyLogo", formData.newCompanyLogo);
    if (formData.newCertificate) formDataToSend.append("certificate", formData.newCertificate);
    if (formData.newCompanyCertificate) formDataToSend.append("CompanyCertificate", formData.newCompanyCertificate);
    if (investorCharterFile) formDataToSend.append("investorCharter", investorCharterFile);
    if (formData.newSignature) formDataToSend.append("signature", formData.newSignature);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/broker`,
        { method: "POST", body: formDataToSend }
      );

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        toast({
          title: "Success",
          description: "Profile updated successfully",
          variant: "default",
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

  return (
    <>
      <Toaster />
      <form
        onSubmit={handleSubmit}
        className="dark:bg-blackShade dark:text-white/70 p-6"
      >
        <div className="flex flex-col gap-8 max-w-7xl mx-auto">
          {/* Save status indicator */}
          <div className="flex justify-end">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              saveStatus === 'saved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              saveStatus === 'saving' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'unsaved' ? 'Unsaved changes' : 
               'All changes saved'}
            </div>
          </div>

          {/* Profile Section */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Broker Profile Information
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your broker firm information and profile details
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
              {/* Left Column - Avatar & Quick Stats */}
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                 
                  {/* Company Logo */}
                  <div className="flex flex-col items-center border-t pt-6">
                    <div className="relative group">
                      <div className="h-32 w-32 ring-4 ring-purple-500/20 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 group-hover:ring-purple-500/40">
                        {formData.companyLogo ? (
                          <Image
                            src={formData.companyLogo}
                            alt="Company Logo"
                            width={128}
                            height={128}
                            className="object-contain w-full h-full p-2"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                              {formData.companyName?.charAt(0).toUpperCase() || 'C'}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Change Logo</span>
                      </div>
                    </div>

                    <label className="mt-4 w-full">
                      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <PencilIcon className="w-4 h-4" />
                        <span>Change Company Logo</span>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                      />
                    </label>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Company/Brand Logo
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Name */}
                  <div>
                    <Input
                      title="Full Name"
                      type="text"
                      name="RegName"
                      value={formData.RegName}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <Input
                      title="Company Name"
                      type="text"
                      name="companyName"
                      value={formData.companyName || ""}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Email */}
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
                    />
                  </div>

                  {/* Contact Number */}
                  <div>
                    <Input
                      title="Contact Number"
                      type="number"
                      name="number"
                      value={formData.number}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Registration Number */}
                  <div>
                    <Input
                      title="SEBI Registration Number"
                      type="text"
                      name="regNumber"
                      value={formData.regNumber}
                      labelStyle="text-gray-700 dark:text-gray-200 font-semibold text-sm mb-2"
                      roundness="roundness-lg"
                      height="py-3.5"
                      onChange={handleInputChange}
                      disabled
                    />
                  </div>

                  {/* Broker Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Broker Type
                    </label>
                    <div className="px-4 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <span className="text-gray-900 dark:text-gray-100">{formData.type}</span>
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
                  {/* <div className="md:col-span-2 mt-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Digital Signature <span className="text-red-500">*</span>
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
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <div className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm">
                              Change
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleSignatureChange}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => prev ? { ...prev, signature: "", newSignature: null } : prev)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer w-full">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-xl text-center hover:border-blue-500 transition">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Upload Digital Signature Image (PNG/JPG)</p>
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
                  </div> */}
                </div>
              </div>
            </div>
          </section>

          {/* Business Information */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Brokerage Firm Details
              </h2>
              <p className="text-sm text-blue-100">
                Configure your brokerage business details and legal information
              </p>
            </div>

            <div className="p-8">
              {/* Business Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Business & Financial Details
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
                  </div>

                  {/* Razorpay Key ID */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Razorpay Key ID
                    </label>
                    <input
                      type="text"
                      name="razorpayKeyId"
                      value={formData.razorpayKeyId}
                      onChange={handleInputChange}
                      placeholder="rzp_test_XXXXXXXXXXXX"
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Razorpay Key Secret */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Razorpay Key Secret
                    </label>
                    <input
                      type="password"
                      name="razorpayKeySecret"
                      value={formData.razorpayKeySecret}
                      onChange={handleInputChange}
                      placeholder="••••••••••••••••••••"
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* LMS Commercial Settings */}
                {/* <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        LMS Commercial Settings
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configure commission settings for Learning Management System
                      </p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="lmsEnabled"
                        checked={formData.lmsEnabled}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.lmsEnabled && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Commission Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="commissionPercentage"
                          value={formData.commissionPercentage}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          %
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Percentage commission you&apos;ll earn from each course sale through your platform
                      </p>
                    </div>
                  )}
                </div> */}
              </div>

              {/* Content & Policies Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Brokerage Services & Policies
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* About Brokerage */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <span>About Our Brokerage</span>
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
                      placeholder="Describe your brokerage services, expertise, trading platforms, research offerings, and what makes you unique..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                    />
                  </div>

                  {/* Disclaimer */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Risk Disclosure & Disclaimer</span>
                      <span className="text-xs text-gray-400 font-normal ml-auto">
                        {formData.disclaimer?.length || 0}/2000
                      </span>
                    </label>
                    <textarea
                      name="disclaimer"
                      value={formData.disclaimer}
                      onChange={handleInputChange}
                      rows={4}
                      maxLength={2000}
                      placeholder="Add important risk disclosures, market risks, trading risks, and legal disclaimers..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                    />
                  </div>

                  {/* Refund Policy */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span>Refund & Cancellation Policy</span>
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
                      placeholder="Describe your brokerage fee refund terms, account closure policy, and cancellation procedures..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />
                  </div>

                  {/* Privacy Policy */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Privacy & Data Protection Policy</span>
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
                      placeholder="Explain how you collect, use, protect client data, KYC information, and trading data..."
                      className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Legal & Compliance Documents
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Personal Certificate */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <PdfIcon className="w-4 h-4 text-red-500" />
                      <span>Personal SEBI Certificate</span>
                    </label>
                    {formData.certificate ? (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <PdfIcon className="w-6 h-6 text-red-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Certificate uploaded</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg text-center hover:border-red-400 transition">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Upload Certificate</p>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleCertificateChange}
                          />
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Company Certificate */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <PdfIcon className="w-4 h-4 text-red-500" />
                      <span>Company SEBI Certificate</span>
                    </label>
                    {formData.CompanyCertificate ? (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <PdfIcon className="w-6 h-6 text-red-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Company Certificate uploaded</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg text-center hover:border-red-400 transition">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Upload Company Certificate</p>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleCompanyCertificateChange}
                          />
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Investor Charter */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <PdfIcon className="w-4 h-4 text-red-500" />
                      <span>Investor Charter</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                        Required
                      </span>
                    </label>
                    {investorCharterFile ? (
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700/30">
                        <div className="flex items-center gap-2">
                          <PdfIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{investorCharterFile.name}</span>
                        </div>
                      </div>
                    ) : formData.investorCharter ? (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <PdfIcon className="w-6 h-6 text-red-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Investor Charter uploaded</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg text-center hover:border-red-400 transition">
                          <p className="text-sm text-gray-600 dark:text-gray-300">Upload Investor Charter</p>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleInvestorCharterChange}
                          />
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Compliance Section */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    Compliance Details
                  </h2>
                  <p className="text-sm text-emerald-100 mt-1">
                    SEBI compliance officer information for brokerage
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      SEBI Compliance Requirement
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      SEBI regulations require all registered brokers to designate a compliance officer for handling client grievances and regulatory adherence.
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
                    <span>Compliance Officer Name</span>
                  </label>
                  <input
                    type="text"
                    name="complianceOfficerName"
                    value={formData.complianceOfficerName}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                {/* Compliance Officer Email */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <span>Compliance Officer Email</span>
                  </label>
                  <input
                    type="email"
                    name="complianceOfficerEmail"
                    value={formData.complianceOfficerEmail}
                    onChange={handleInputChange}
                    placeholder="compliance@brokerage.com"
                    className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>

                {/* Compliance Officer Number */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <span>Compliance Officer Contact</span>
                  </label>
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
          </section>

          {/* Social Links Section */}
          <section className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    Social Media & Marketing
                  </h2>
                  <p className="text-sm text-purple-100 mt-1">
                    Connect social media for client engagement
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

                {/* LinkedIn */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <span>LinkedIn</span>
                  </label>
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
          </section>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !!gstError}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isSaving ? 'Saving Changes...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}