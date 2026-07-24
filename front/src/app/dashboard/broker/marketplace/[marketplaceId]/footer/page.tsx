"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Facebook,
  Globe2,
  ImagePlus,
  Instagram,
  Linkedin,
  Loader2,
  Plus,
  Save,
  Trash2,
  Twitter,
  Upload,
  Youtube,
  Download,
  Phone,
  Mail,
  FileText,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { Textarea } from "@/components/ui/textarea";
import type { FooterConfig, FooterSection, FAQCategory, FAQItem } from "@/components/Marketplace/types";

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  socials: {
    facebook: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    threads: "",
    youtube: "",
  },
  appLinks: {
    googlePlay: "",
    appStore: "",
    webApp: "",
  },
  sections: [
    { title: "About", links: [{ label: "", url: "" }] },
    { title: "Partner With Us", links: [{ label: "", url: "" }] },
  ],
  support: {
    phone: "",
    email: "",
    queryLink: "",
  },
  copyrightText: "",
  poweredByVisible: true,
};

export default function FooterSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const marketplaceId = params.marketplaceId as string;
  const { data: session } = useSession();
  const { toast } = useToast();

  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [banners, setBanners] = useState<{ imageUrl: string; ctaLink: string }[]>([]);
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [isUploadingBanners, setIsUploadingBanners] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [marketplaceName, setMarketplaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");

  // Fetch marketplace data
  useEffect(() => {
    const fetchMarketplace = async () => {
      if (!session?.backendToken || !marketplaceId) return;

      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.backendToken}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch marketplace");

        const result = await response.json();
        if (result.success && result.data) {
          setMarketplaceName(result.data.name || "");
          setBanners(
            (result.data.banners || []).map((b: any) => ({
              imageUrl: b.imageUrl || b,
              ctaLink: b.ctaLink || "",
            }))
          );
          if (result.data.faqs?.length > 0) {
            setFaqCategories(result.data.faqs);
          }
          if (result.data.footerConfig) {
            const config = result.data.footerConfig;
            setFooterConfig({
              socials: {
                facebook: config.socials?.facebook || "",
                instagram: config.socials?.instagram || "",
                linkedin: config.socials?.linkedin || "",
                twitter: config.socials?.twitter || "",
                threads: config.socials?.threads || "",
                youtube: config.socials?.youtube || "",
              },
              appLinks: {
                googlePlay: config.appLinks?.googlePlay || "",
                appStore: config.appLinks?.appStore || "",
                webApp: config.appLinks?.webApp || "",
              },
              sections: config.sections?.length > 0 ? config.sections : DEFAULT_FOOTER_CONFIG.sections,
              support: {
                phone: config.support?.phone || "",
                email: config.support?.email || "",
                queryLink: config.support?.queryLink || "",
              },
              copyrightText: config.copyrightText || "",
              poweredByVisible: config.poweredByVisible !== false,
            });
            lastSavedDataRef.current = JSON.stringify(config);
          }
        }
      } catch (err) {
        console.error("Failed to fetch marketplace:", err);
        toast({
          title: "Error",
          description: "Failed to load marketplace details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketplace();
  }, [session?.backendToken, marketplaceId, toast]);

  // Auto-save function
  const saveFooterConfig = useCallback(async () => {
    if (!session?.backendToken || !hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ footerConfig }),
        }
      );

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveStatus("saved");
        lastSavedDataRef.current = JSON.stringify(footerConfig);
        toast({
          title: "Saved",
          description: "Footer settings saved successfully",
        });
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("unsaved");
      toast({
        title: "Save Failed",
        description: "Failed to save footer settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [session?.backendToken, marketplaceId, footerConfig, hasUnsavedChanges, toast]);

  // Trigger auto-save on changes
  const handleChange = useCallback(
    (updater: (prev: FooterConfig) => FooterConfig) => {
      setFooterConfig((prev) => {
        const next = updater(prev);
        setHasUnsavedChanges(true);
        setSaveStatus("unsaved");

        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        return next;
      });

      // Schedule auto-save (has to be outside setFooterConfig)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        setHasUnsavedChanges(true); // ensure flag is set before save fires
      }, 1500);
    },
    []
  );

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      const timeout = setTimeout(() => {
        saveFooterConfig();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [footerConfig, hasUnsavedChanges, isSaving, saveFooterConfig]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Banner upload handler
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !session?.backendToken) return;

    const remaining = 10 - banners.length;
    if (remaining <= 0) {
      toast({ title: "Limit Reached", description: "Maximum 10 banners allowed", variant: "destructive" });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);

    setIsUploadingBanners(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append("banners", file));

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}/banners`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.backendToken}` },
          body: formData,
        }
      );

      const result = await response.json();
      if (result.success) {
        setBanners(result.data.banners);
        toast({ title: "Uploaded", description: `${filesToUpload.length} banner(s) uploaded` });
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Banner upload failed:", err);
      toast({ title: "Upload Failed", description: err.message || "Failed to upload banners", variant: "destructive" });
    } finally {
      setIsUploadingBanners(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  // Banner delete handler
  const handleBannerDelete = async (imageUrl: string) => {
    if (!session?.backendToken) return;

    setDeletingBanner(imageUrl);
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}/banners`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ imageUrl }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setBanners(result.data.banners);
        toast({ title: "Deleted", description: "Banner removed" });
      } else {
        throw new Error(result.message || "Delete failed");
      }
    } catch (err: any) {
      console.error("Banner delete failed:", err);
      toast({ title: "Delete Failed", description: err.message || "Failed to delete banner", variant: "destructive" });
    } finally {
      setDeletingBanner(null);
    }
  };

  // FAQ save function
  const [isSavingFaqs, setIsSavingFaqs] = useState(false);
  const faqSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveFaqs = useCallback(
    async (categories: FAQCategory[]) => {
      if (!session?.backendToken) return;
      setIsSavingFaqs(true);
      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.backendToken}`,
            },
            body: JSON.stringify({ faqs: categories }),
          }
        );
        if (response.ok) {
          toast({ title: "Saved", description: "FAQs saved successfully" });
        } else {
          throw new Error("Save failed");
        }
      } catch (err) {
        console.error("FAQ save failed:", err);
        toast({ title: "Save Failed", description: "Failed to save FAQs", variant: "destructive" });
      } finally {
        setIsSavingFaqs(false);
      }
    },
    [session?.backendToken, marketplaceId, toast]
  );

  const triggerFaqAutoSave = useCallback(
    (updated: FAQCategory[]) => {
      if (faqSaveTimeoutRef.current) clearTimeout(faqSaveTimeoutRef.current);
      faqSaveTimeoutRef.current = setTimeout(() => saveFaqs(updated), 2000);
    },
    [saveFaqs]
  );

  useEffect(() => {
    return () => {
      if (faqSaveTimeoutRef.current) clearTimeout(faqSaveTimeoutRef.current);
    };
  }, []);

  // FAQ management helpers
  const addFaqCategory = () => {
    const updated = [...faqCategories, { category: "", icon: "❓", items: [{ question: "", answer: "" }] }];
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  const removeFaqCategory = (catIdx: number) => {
    const updated = faqCategories.filter((_, i) => i !== catIdx);
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  const updateFaqCategory = (catIdx: number, field: "category" | "icon", value: string) => {
    const updated = faqCategories.map((c, i) => (i === catIdx ? { ...c, [field]: value } : c));
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  const addFaqItem = (catIdx: number) => {
    const updated = faqCategories.map((c, i) =>
      i === catIdx ? { ...c, items: [...c.items, { question: "", answer: "" }] } : c
    );
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  const removeFaqItem = (catIdx: number, itemIdx: number) => {
    const updated = faqCategories.map((c, i) =>
      i === catIdx ? { ...c, items: c.items.filter((_, qi) => qi !== itemIdx) } : c
    );
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  const updateFaqItem = (catIdx: number, itemIdx: number, field: "question" | "answer", value: string) => {
    const updated = faqCategories.map((c, i) =>
      i === catIdx
        ? { ...c, items: c.items.map((item, qi) => (qi === itemIdx ? { ...item, [field]: value } : item)) }
        : c
    );
    setFaqCategories(updated);
    triggerFaqAutoSave(updated);
  };

  // Banner CTA link update
  const ctaSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCtaChange = (imageUrl: string, ctaLink: string) => {
    const updated = banners.map((b) =>
      b.imageUrl === imageUrl ? { ...b, ctaLink } : b
    );
    setBanners(updated);

    // Auto-save CTA links with debounce
    if (ctaSaveTimeoutRef.current) clearTimeout(ctaSaveTimeoutRef.current);
    ctaSaveTimeoutRef.current = setTimeout(async () => {
      if (!session?.backendToken) return;
      try {
        await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}/banners`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.backendToken}`,
            },
            body: JSON.stringify({ banners: updated }),
          }
        );
        toast({ title: "Saved", description: "Banner links saved" });
      } catch (err) {
        console.error("CTA save failed:", err);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (ctaSaveTimeoutRef.current) clearTimeout(ctaSaveTimeoutRef.current);
    };
  }, []);

  // Social media update helper
  const updateSocial = (key: string, value: string) => {
    handleChange((prev) => ({
      ...prev,
      socials: { ...prev.socials, [key]: value },
    }));
  };

  // App links update helper
  const updateAppLink = (key: string, value: string) => {
    handleChange((prev) => ({
      ...prev,
      appLinks: { ...prev.appLinks, [key]: value },
    }));
  };

  // Support update helper
  const updateSupport = (key: string, value: string) => {
    handleChange((prev) => ({
      ...prev,
      support: { ...prev.support, [key]: value },
    }));
  };

  // Section management
  const addSection = () => {
    handleChange((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), { title: "", links: [{ label: "", url: "" }] }],
    }));
  };

  const removeSection = (sectionIdx: number) => {
    handleChange((prev) => ({
      ...prev,
      sections: (prev.sections || []).filter((_, i) => i !== sectionIdx),
    }));
  };

  const updateSectionTitle = (sectionIdx: number, title: string) => {
    handleChange((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s, i) => (i === sectionIdx ? { ...s, title } : s)),
    }));
  };

  const addLink = (sectionIdx: number) => {
    handleChange((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s, i) =>
        i === sectionIdx ? { ...s, links: [...s.links, { label: "", url: "" }] } : s
      ),
    }));
  };

  const removeLink = (sectionIdx: number, linkIdx: number) => {
    handleChange((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s, i) =>
        i === sectionIdx ? { ...s, links: s.links.filter((_, li) => li !== linkIdx) } : s
      ),
    }));
  };

  const updateLink = (sectionIdx: number, linkIdx: number, field: "label" | "url", value: string) => {
    handleChange((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s, i) =>
        i === sectionIdx
          ? {
              ...s,
              links: s.links.map((l, li) => (li === linkIdx ? { ...l, [field]: value } : l)),
            }
          : s
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/broker/marketplace/my-marketplaces")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Marketplace Customization</h1>
            <p className="text-sm text-muted-foreground">{marketplaceName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              saveStatus === "saved"
                ? "bg-green-100 text-green-700"
                : saveStatus === "saving"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved"}
          </span>
          <Button onClick={saveFooterConfig} disabled={isSaving || !hasUnsavedChanges} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Hero Banners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Hero Banners</CardTitle>
              <CardDescription>
                Upload up to 10 banner images for the marketplace hero carousel ({banners.length}/10)
              </CardDescription>
            </div>
            {banners.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanners}
              >
                {isUploadingBanners ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-1" />
                )}
                Upload Banner
              </Button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleBannerUpload}
            />
          </div>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => bannerInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload banner images (max 10)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Required size: <span className="font-semibold">1920 x 600 px</span> (16:5 ratio) &middot; JPG/PNG &middot; Max 10MB each
              </p>
              <p className="text-xs text-muted-foreground">
                Banners display at 16:5 aspect ratio. Upload exact dimensions to avoid cropping.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((banner, idx) => (
                <div key={banner.imageUrl} className="rounded-lg overflow-hidden border">
                  <div className="relative group">
                    <img
                      src={banner.imageUrl}
                      alt={`Banner ${idx + 1}`}
                      className="w-full aspect-[16/6] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleBannerDelete(banner.imageUrl)}
                        disabled={deletingBanner === banner.imageUrl}
                      >
                        {deletingBanner === banner.imageUrl ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Remove
                      </Button>
                    </div>
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="p-2">
                    <Label className="text-xs text-muted-foreground">Call to Action URL</Label>
                    <Input
                      placeholder="https://... (redirect link when banner is clicked)"
                      value={banner.ctaLink || ""}
                      onChange={(e) => handleCtaChange(banner.imageUrl, e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              ))}

              {/* Upload placeholder card */}
              {banners.length < 10 && (
                <div
                  className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors aspect-[16/6]"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {isUploadingBanners ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add Banner</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {banners.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Required size: <span className="font-semibold">1920 x 600 px</span> (16:5 ratio) &middot; JPG/PNG &middot; Max 10MB each. Upload exact dimensions to avoid cropping.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social Media Links</CardTitle>
          <CardDescription>Add your social media profile URLs</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "facebook", label: "Facebook", Icon: Facebook, placeholder: "https://facebook.com/..." },
            { key: "instagram", label: "Instagram", Icon: Instagram, placeholder: "https://instagram.com/..." },
            { key: "linkedin", label: "LinkedIn", Icon: Linkedin, placeholder: "https://linkedin.com/company/..." },
            { key: "twitter", label: "Twitter / X", Icon: Twitter, placeholder: "https://x.com/..." },
            { key: "threads", label: "Threads", Icon: Globe2, placeholder: "https://threads.com/@..." },
            { key: "youtube", label: "YouTube", Icon: Youtube, placeholder: "https://youtube.com/..." },
          ].map(({ key, label, Icon, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" /> {label}
              </Label>
              <Input
                placeholder={placeholder}
                value={(footerConfig.socials as any)?.[key] || ""}
                onChange={(e) => updateSocial(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* App Download Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Download Our App</CardTitle>
          <CardDescription>Add links to your mobile and web apps</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" /> Google Play
            </Label>
            <Input
              placeholder="https://play.google.com/store/apps/..."
              value={footerConfig.appLinks?.googlePlay || ""}
              onChange={(e) => updateAppLink("googlePlay", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" /> App Store
            </Label>
            <Input
              placeholder="https://apps.apple.com/..."
              value={footerConfig.appLinks?.appStore || ""}
              onChange={(e) => updateAppLink("appStore", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Globe2 className="h-4 w-4" /> Web App
            </Label>
            <Input
              placeholder="https://..."
              value={footerConfig.appLinks?.webApp || ""}
              onChange={(e) => updateAppLink("webApp", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Link Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Custom Sections</CardTitle>
              <CardDescription>Add up to 4 link sections (e.g. About, Partner With Us)</CardDescription>
            </div>
            {(footerConfig.sections?.length || 0) < 4 && (
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" /> Add Section
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {footerConfig.sections?.map((section, sectionIdx) => (
            <div key={sectionIdx} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <Label className="text-sm mb-1 block">Section Title</Label>
                  <Input
                    placeholder="e.g. About, Partner With Us"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sectionIdx, e.target.value)}
                    maxLength={50}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeSection(sectionIdx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <div key={linkIdx} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        placeholder="e.g. About Us"
                        value={link.label}
                        onChange={(e) => updateLink(sectionIdx, linkIdx, "label", e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">URL</Label>
                      <Input
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) => updateLink(sectionIdx, linkIdx, "url", e.target.value)}
                        maxLength={500}
                      />
                    </div>
                    {section.links.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeLink(sectionIdx, linkIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {section.links.length < 10 && (
                <Button variant="ghost" size="sm" onClick={() => addLink(sectionIdx)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Link
                </Button>
              )}
            </div>
          ))}

          {(!footerConfig.sections || footerConfig.sections.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sections added yet. Click &quot;Add Section&quot; to create one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Support</CardTitle>
          <CardDescription>Contact information displayed in the footer</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4" /> Phone Number
            </Label>
            <Input
              placeholder="e.g. 9090491913"
              value={footerConfig.support?.phone || ""}
              onChange={(e) => updateSupport("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" /> Email
            </Label>
            <Input
              placeholder="e.g. support@example.com"
              value={footerConfig.support?.email || ""}
              onChange={(e) => updateSupport("email", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" /> Raise a Query URL
            </Label>
            <Input
              placeholder="https://..."
              value={footerConfig.support?.queryLink || ""}
              onChange={(e) => updateSupport("queryLink", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Footer Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm">Copyright Text</Label>
            <Input
              placeholder={`© ${new Date().getFullYear()} Your Company. All rights reserved.`}
              value={footerConfig.copyrightText || ""}
              onChange={(e) =>
                handleChange((prev) => ({ ...prev, copyrightText: e.target.value }))
              }
              maxLength={200}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Show &quot;Powered By TradeBox&quot;</Label>
              <p className="text-xs text-muted-foreground">Display TradeBox branding in the footer</p>
            </div>
            <Switch
              checked={footerConfig.poweredByVisible !== false}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, poweredByVisible: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" /> FAQ Section
              </CardTitle>
              <CardDescription>
                Add FAQ categories and questions displayed on your marketplace page ({faqCategories.length}/15 categories)
                {isSavingFaqs && <span className="ml-2 text-yellow-600">Saving...</span>}
              </CardDescription>
            </div>
            {faqCategories.length < 15 && (
              <Button variant="outline" size="sm" onClick={addFaqCategory}>
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {faqCategories.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No custom FAQs added. Default FAQs will be shown on your marketplace.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={addFaqCategory}>
                <Plus className="h-4 w-4 mr-1" /> Add FAQ Category
              </Button>
            </div>
          ) : (
            faqCategories.map((cat, catIdx) => (
              <div key={catIdx} className="border rounded-lg p-4 space-y-4">
                {/* Category header */}
                <div className="flex items-center gap-3">
                  <div className="w-16 space-y-1">
                    <Label className="text-xs text-muted-foreground">Icon</Label>
                    <Input
                      placeholder="💡"
                      value={cat.icon || ""}
                      onChange={(e) => updateFaqCategory(catIdx, "icon", e.target.value)}
                      maxLength={10}
                      className="text-center"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Category Name</Label>
                    <Input
                      placeholder="e.g. Platform Understanding, Subscription & Pricing"
                      value={cat.category}
                      onChange={(e) => updateFaqCategory(catIdx, "category", e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive mt-5"
                    onClick={() => removeFaqCategory(catIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Questions in this category */}
                <div className="space-y-3 pl-2">
                  {cat.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Question {itemIdx + 1}</Label>
                            <Input
                              placeholder="Enter the question"
                              value={item.question}
                              onChange={(e) => updateFaqItem(catIdx, itemIdx, "question", e.target.value)}
                              maxLength={500}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Answer</Label>
                            <Textarea
                              placeholder="Enter the answer"
                              value={item.answer}
                              onChange={(e) => updateFaqItem(catIdx, itemIdx, "answer", e.target.value)}
                              maxLength={2000}
                              rows={2}
                            />
                          </div>
                        </div>
                        {cat.items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive shrink-0 mt-5"
                            onClick={() => removeFaqItem(catIdx, itemIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {cat.items.length < 20 && (
                  <Button variant="ghost" size="sm" onClick={() => addFaqItem(catIdx)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Question
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
