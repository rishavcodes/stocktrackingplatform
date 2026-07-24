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
import { useRouter } from "next/navigation";

type VerifyBoxProps = { id: string; token: string };

export default function ApproveEventBox({ id, token }: VerifyBoxProps) {
  const { toast } = useToast();
  const router = useRouter();

  // console.log("this is the id on approval page", id);

  async function VerifyEvent() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/approveevent`,
        {
          method: "POST",
          body: JSON.stringify({ id: id }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        toast({
          title: "Event verified",
          description: "Event successfully verified",
          variant: "default",
        });
        router.push("/dashboard/admin/events/eventsforapproval")
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "error verifying event",
        variant: "destructive",
      });
    }
  }

  return (
    <AlertDialog>
      <Toaster />
      <AlertDialogTrigger className="bg-green w-fit px-5 py-1">
        Verify
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Verify Event</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-black ">Cancel</AlertDialogCancel>
          <AlertDialogAction className="" onClick={VerifyEvent}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
