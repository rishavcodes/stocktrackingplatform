"use client";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { userType } from "@/lib/types";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import ImageCropDialog from "@/components/ImageCropDialog";
import EmailVerifyDialog from "@/components/EmailVerifyDialog";
import PanKycDialog from "@/components/PanKycDialog";
import {
  BadgeCheck,
  Building,
  Calendar,
  Camera,
  CreditCard,
  Hash,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";

type UserProfileForm = {
  name: string;
  number: number;
  profileUrl: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  newPfp: File | null;
};

interface EnrolledRA {
  id: string;
  name: string;
}

/* ---------- design tokens ---------- */
const editInputCls =
  "w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition";

/* ---------- small UI helpers ---------- */
function VerifiedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
      <BadgeCheck className="w-3 h-3" /> {label}
    </span>
  );
}

function DetailField({
  icon: Icon,
  label,
  pill,
  children,
}: {
  icon: typeof BadgeCheck;
  label: string;
  pill?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 shrink-0">
        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          {pill}
        </div>
        <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const userId = session?.user?.id || session?.user?._id;

  const { data, isLoading, mutate } = useSWR<{ data: userType }>(
    userId
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/userdetails?id=${userId}`
      : null,
    fetcher
  );

  const { data: billingData } = useSWR<{
    success: boolean;
    data: {
      orders: { soldBy: { name: string; id: string }; serviceName: string }[];
    };
  }>(
    userId
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${userId}`
      : null,
    fetcher
  );

  const enrolledRAs: EnrolledRA[] = useMemo(() => {
    const map = new Map<string, string>();
    billingData?.data?.orders?.forEach((o) => {
      if (o.soldBy?.id && o.soldBy?.name) {
        map.set(o.soldBy.id, o.soldBy.name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [billingData]);

  const subscriptionCount = billingData?.data?.orders?.length || 0;

  const [editing, setEditing] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  // Crop modal — holds the picked image's data URL + original filename/type
  // until the user confirms a crop.
  const [cropSrc, setCropSrc] = useState("");
  const [cropMeta, setCropMeta] = useState<{ name: string; type: string }>({
    name: "avatar.png",
    type: "image/png",
  });
  // Dedicated email-verification modal.
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  // Dedicated PAN-KYC modal.
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const [form, setForm] = useState<UserProfileForm>({
    name: "",
    number: 0,
    profileUrl: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    newPfp: null,
  });

  useEffect(() => {
    if (data?.data && !isChanged) {
      setForm({
        name: data.data.name || "",
        number: data.data.number || 0,
        profileUrl: data.data.profileUrl || "",
        address: data.data.address || "",
        city: data.data.city || "",
        state: data.data.state || "",
        pincode: data.data.pincode || "",
        newPfp: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setIsChanged(true);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: `Please select an image under 2MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    // Open the crop modal with the picked image instead of using it directly.
    const reader = new FileReader();
    reader.onload = () => {
      setCropMeta({ name: file.name, type: file.type });
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Allow re-picking the same file later (onChange won't fire otherwise).
    e.target.value = "";
  }

  // Crop confirmed — use the cropped File as the new profile picture.
  function handleCropped(file: File, previewUrl: string) {
    setForm((prev) => ({
      ...prev,
      newPfp: file,
      profileUrl: previewUrl,
    }));
    setIsChanged(true);
    setCropSrc("");
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  // Reset the form back to the last-saved server data and leave edit mode.
  function handleCancelEdit() {
    if (data?.data) {
      setForm({
        name: data.data.name || "",
        number: data.data.number || 0,
        profileUrl: data.data.profileUrl || "",
        address: data.data.address || "",
        city: data.data.city || "",
        state: data.data.state || "",
        pincode: data.data.pincode || "",
        newPfp: null,
      });
    }
    setIsChanged(false);
    setEditing(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const payload = {
      id: userId,
      name: form.name,
      number: String(form.number),
      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    if (form.newPfp) formData.append("newPfp", form.newPfp);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/user`,
        { method: "POST", body: formData }
      );

      const json = await res.json();

      if (res.ok) {
        await update({
          ...session,
          user: {
            ...session?.user,
            name: json.newData.name,
            number: json.newData.number,
            profileUrl: json.newData.profileUrl,
          },
        });

        toast({ title: "Profile updated successfully" });
        setIsChanged(false);
        setEditing(false);
        mutate();
      } else {
        throw new Error();
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const user = data?.data;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).getFullYear()
    : null;
  const startDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const initial = (form.name || user?.name || "U").charAt(0).toUpperCase();

  // Email field content — verified shows the address; unverified shows a
  // "Verify Email" button that opens the dedicated verification modal.
  const emailField = user?.emailVerified ? (
    <span className="truncate block">{user?.email || "—"}</span>
  ) : (
    <div className="flex flex-col gap-1.5">
      <span className="truncate">{user?.email || "—"}</span>
      <button
        type="button"
        onClick={() => setEmailModalOpen(true)}
        disabled={!user?.email}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50 w-fit"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Verify Email
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 md:py-4 pb-32">
      <Toaster />

      {/* Crop the picked profile photo before it becomes the avatar. */}
      {cropSrc && (
        <ImageCropDialog
          src={cropSrc}
          fileName={cropMeta.name}
          mimeType={cropMeta.type}
          onCancel={() => setCropSrc("")}
          onCropped={handleCropped}
        />
      )}

      {/* Dedicated email-verification modal. */}
      <EmailVerifyDialog
        open={emailModalOpen}
        userId={userId}
        email={user?.email}
        onClose={() => setEmailModalOpen(false)}
        onVerified={() => mutate()}
      />

      {/* Dedicated PAN-KYC modal. */}
      <PanKycDialog
        open={kycModalOpen}
        userId={userId}
        onClose={() => setKycModalOpen(false)}
        onCompleted={() => mutate()}
      />

      <form id="user-profile-form" onSubmit={handleSubmit}>
        {/* ============== COVER HEADER ============== */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden mb-5">
          {/* gradient cover band */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.18),_transparent_55%)]" />
          </div>

          <div className="px-5 md:px-7 pb-5 md:pb-6">
            {/* Top row: avatar (left) + actions (right) */}
            <div className="flex items-start justify-between gap-4">
              {/* Avatar */}
              <div className="relative -mt-12 sm:-mt-16 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={editing ? triggerFilePicker : undefined}
                  className={`relative group rounded-full ${editing ? "cursor-pointer" : "cursor-default"}`}
                  title={editing ? "Click to change photo" : undefined}
                >
                  <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-white dark:ring-gray-900 shadow-md">
                    {form.profileUrl ? (
                      <AvatarImage src={form.profileUrl} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 text-2xl font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  {editing && (
                    <div className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 shadow-md ring-2 ring-white dark:ring-gray-900 transition">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 mt-3 sm:mt-4">
                {!editing ? (
                  <>
                    {user?.pannumber ? (
                      <Button
                        key="kyc-status"
                        type="button"
                        variant="outline"
                        disabled
                        className="h-10 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 disabled:opacity-100 cursor-default"
                      >
                        <BadgeCheck className="w-4 h-4 mr-1.5" /> PAN Verified
                      </Button>
                    ) : (
                      <Button
                        key="kyc-status"
                        type="button"
                        onClick={() => setKycModalOpen(true)}
                        className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Complete KYC
                      </Button>
                    )}
                    <Button
                      key="edit"
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="h-10"
                    >
                      <Pencil className="w-4 h-4 mr-1.5" /> Edit Profile
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      key="cancel"
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="h-10"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Cancel
                    </Button>
                    <Button
                      key="save"
                      type="submit"
                      form="user-profile-form"
                      className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-1.5" /> Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Identity — name + member since on their own line below */}
            <div className="mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {form.name || user?.name || "Welcome"}
                </h1>
                {user?.emailVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Profile
                  </span>
                )}
              </div>
              {startDate && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  <Calendar className="w-4 h-4" /> Member Since: {startDate}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ============== PROFILE DETAILS ============== */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Profile details
            </h3>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* Full Name (locked) */}
            <DetailField icon={UserIcon} label="Full Name">
              <span className="truncate block">{user?.name || "—"}</span>
              {editing && (
                <span className="block text-[11px] font-normal text-gray-400 mt-1">
                  Name is locked — contact support to change
                </span>
              )}
            </DetailField>

            {/* Email */}
            <DetailField
              icon={Mail}
              label="Email"
              pill={
                user?.emailVerified ? (
                  <VerifiedPill label="Email Verified" />
                ) : undefined
              }
            >
              {emailField}
            </DetailField>

            {/* Date of birth (locked) */}
            <DetailField icon={Calendar} label="Date of birth">
              <span>{user?.dob || "—"}</span>
            </DetailField>

            {/* Number */}
            <DetailField
              icon={Phone}
              label="Number"
              pill={user?.number ? <VerifiedPill label="Number Verified" /> : undefined}
            >
              <span className="block">{user?.number || "—"}</span>
              {editing && (
                <span className="block text-[11px] font-normal text-gray-400 mt-1">
                  Verified at sign-up — can&apos;t be changed
                </span>
              )}
            </DetailField>

            {/* Gender (locked) */}
            <DetailField icon={Sparkles} label="Gender">
              <span className="capitalize">{user?.gender || "—"}</span>
            </DetailField>

            {/* PAN (locked) */}
            <DetailField icon={CreditCard} label="PAN">
              <span className="font-mono">{user?.pannumber || "—"}</span>
            </DetailField>

            {/* Address */}
            <DetailField icon={MapPin} label="Address">
              {editing ? (
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Flat / building / street"
                  className={editInputCls}
                />
              ) : (
                <span className="truncate block">{user?.address || "—"}</span>
              )}
            </DetailField>

            {/* City */}
            <DetailField icon={Building} label="City">
              {editing ? (
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Mumbai"
                  className={editInputCls}
                />
              ) : (
                <span>{user?.city || "—"}</span>
              )}
            </DetailField>

            {/* State */}
            <DetailField icon={MapPin} label="State">
              {editing ? (
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Maharashtra"
                  className={editInputCls}
                />
              ) : (
                <span>{user?.state || "—"}</span>
              )}
            </DetailField>

            {/* Pincode */}
            <DetailField icon={Hash} label="Pincode">
              {editing ? (
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  maxLength={6}
                  placeholder="000000"
                  className={`${editInputCls} font-mono`}
                />
              ) : (
                <span className="font-mono">{user?.pincode || "—"}</span>
              )}
            </DetailField>

            {/* Member Since (locked) */}
            {memberSince && (
              <DetailField icon={BadgeCheck} label="Member Since">
                <span>{String(memberSince)}</span>
              </DetailField>
            )}
          </div>
        </div>
      </form>

      {/* ============== STICKY SAVE BAR ============== */}
      {editing && isChanged && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              You have unsaved changes
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                type="button"
                onClick={handleCancelEdit}
                className="h-10"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="submit"
                form="user-profile-form"
                className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
