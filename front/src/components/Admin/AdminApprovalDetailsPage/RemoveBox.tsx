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

type ConfirmationBoxProps = { id: string; token: string };

export default function RemoveBox({ id, token }: ConfirmationBoxProps) {
  const { toast } = useToast();

  async function rejectSP() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/removeserviceprovider`,
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
          title: "Success",
          description: "Provider verified status removed",
          variant: "default",
        });
      } else {
        toast({
          title: "Error!",
          description: "error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "error",
        variant: "destructive",
      });
    }
  }

  return (
    <AlertDialog>
      <Toaster />
      <AlertDialogTrigger>
       <button className="text-sm font-bold bg-red-600 text-white px-9 py-3 rounded-lg border border-white whitespace-nowrap">
      Remove Verification
        </button> 
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove service provider verification
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-black ">Cancel</AlertDialogCancel>
          <AlertDialogAction className="text-black " onClick={rejectSP}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
