"use client";

import { Input } from "@/components";
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
import { ChangeEvent, useState } from "react";

type ConfirmationBoxProps = {
  id: string;
  email: string;
  name: string;
  token: string;
};

export default function RejectEventBox({
  id,
  email,
  name,
  token,
}: ConfirmationBoxProps) {
  const { toast } = useToast();

  const [reason, setReason] = useState<string>("");

  async function rejectEvent() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/rejectevent`,
        {
          method: "POST",
          body: JSON.stringify({
            id: id,
            email: email,
            name: name,
            reason: reason,
          }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Event disapproved",
          variant: "default",
        });
        window.location.pathname = `/dashboard/admin/events/eventsforapproval`;
      }

    } catch (error) {
      toast({
        title: "Error!",
        description: "error",
        variant: "destructive",
      });
    }
  }

  function handleReasonChangeInput(event: ChangeEvent<HTMLInputElement>) {
    setReason(event.target.value);
  }

  return (
    <div>
      <AlertDialog>
        <Toaster />
        <AlertDialogTrigger className="bg-red-500 w-fit px-5 py-1">
          Reject
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Event</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            title="Reason"
            type="text"
            value={reason}
            name="reason"
            onChange={handleReasonChangeInput}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black ">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="text-black " onClick={rejectEvent}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
