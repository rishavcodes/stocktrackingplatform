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
import { Button } from "@/components/ui/button"; // Import Button

type ConfirmationBoxProps = { id: string; token: string };

export default function ConfirmationBox({ id, token }: ConfirmationBoxProps) {
  const { toast } = useToast();

  async function verifySP() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/approveserviceprovider`,
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
          title: "Provider verified",
          description: "Provider successfully verified",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "error verifying provider",
        variant: "destructive",
      });
    }
  }

  return (
    <div className=" flex items-center justify-center">
    <AlertDialog>
      <Toaster />
      <AlertDialogTrigger asChild>
        <Button className="bg-green-800 hover:bg-green-700 text-white">
          Approve
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve as service provider</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-black">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-green-600 hover:bg-green-700"
            onClick={verifySP}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}