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

export default function ApproveServiceBox({ id, token }: VerifyBoxProps) {
  const { toast } = useToast();
  const router = useRouter();

  // console.log("this is the id on approval page", id);

  async function VerifyService() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/approveservice`,
        {
          method: "POST",
          body: JSON.stringify({ id: id }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Parse the response JSON to get the actual message
      const data = await response.json();

      if (response.status === 200) {
        toast({
          title: "Service verified",
          description: data.message || "Service has been successfully verified",
          variant: "default",
        });
        router.push("/dashboard/admin/services/allservices");
      } else {
        // Handle different error status codes
       let errorMessage = "An error occurred while verifying the service";
        
        if (data.error && data.error.errorMessage) {
          // Use the specific error message from the nested error object
          errorMessage = `${data.message}: ${data.error.errorMessage}`;
        } else if (data.message) {
          // Use the main message if no nested error
          errorMessage = data.message;
        } else if (response.status === 404) {
          errorMessage = "Service not found";
        } else if (response.status === 401) {
          errorMessage = "Unauthorized access";
        } else if (response.status === 500) {
          errorMessage = "Server error occurred";
        }

        toast({
          title: "Error Verifying Service",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "error verifying service",
        variant: "destructive",
      });
    }
  }

  return (
    <>
    <Toaster />
      <AlertDialog>
        <Toaster />
        <AlertDialogTrigger className="bg-green-600 rounded-md w-fit px-5 py-1">
          Verify
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Service</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black ">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600" onClick={VerifyService}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
