"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { updateUserKyc } from "@/lib/api/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CourseDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (details: { name: string; email: string }) => void;
}

export default function CourseDetailsModal({
  open,
  onClose,
  onComplete,
}: CourseDetailsModalProps) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!session?.user?.id) return;

    setLoading(true);
    try {
      await updateUserKyc({
        id: session.user.id,
        name: name.trim(),
        email: email.trim(),
      });

      // Update session JWT with new values
      await updateSession({
        RegName: name.trim(),
        email: email.trim(),
      });

      toast({ title: "Details saved successfully" });
      onComplete({ name: name.trim(), email: email.trim() });
    } catch (e: any) {
      toast({
        title: "Update Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            We need your name and email to proceed with this course purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-gray-500">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full border px-4 py-2 rounded"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your email"
              className="w-full border px-4 py-2 rounded"
              type="email"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-500 text-white py-3 rounded disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Proceed"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
