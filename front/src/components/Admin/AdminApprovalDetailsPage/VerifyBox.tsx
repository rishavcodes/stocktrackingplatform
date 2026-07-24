"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

type VerifyBoxProps = { id: string; token: string };

export default function VerifyBox({ id, token }: VerifyBoxProps) {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  async function verifySP() {
    if (!type || !category) {
      toast({
        title: "Error",
        description: "Please select Type & Category",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      /** 1️⃣ Update type & category */
      const metaRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-provider-meta`,
        {
          method: "POST",
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id,
            type,
            category,
          }),
        }
      );

      const metaData = await metaRes.json();

      if (!metaData.success) {
        throw new Error("Meta update failed");
      }

      /** 2️⃣ Verify provider */
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/verifyserviceprovider`,
        {
          method: "POST",
          body: JSON.stringify({ id }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Provider verified & classified",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "Verification failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <Toaster />

      <AlertDialogTrigger className="bg-green-500 w-fit px-5 py-1 text-white rounded">
        Verify
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Verify & Classify Service Provider
          </AlertDialogTitle>
        </AlertDialogHeader>

        {/* TYPE */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border p-2 rounded mt-3"
        >
          <option value="">Select Type</option>
          <option value="Individual">Individual</option>
          <option value="Non Individual">Non Individual</option>
          <option value="sub profile">Sub Profile</option>
        </select>

        {/* CATEGORY */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border p-2 rounded mt-3"
        >
          <option value="">Select Category</option>
          <option value="Research Analyst">Research Analyst</option>
          <option value="Broker">Broker</option>
        </select>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="text-black">
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={verifySP}
            disabled={loading}
          >
            {loading ? "Processing..." : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
