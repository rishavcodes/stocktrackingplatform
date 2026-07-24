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
import ConfirmationBox from "./ConfirmationBox";

type ConfirmationBoxProps = {
  id: string;
  token: string;
  WalletBalance: number;
};

export default function DeleteSPBox({
  id,
  token,
  WalletBalance,
}: ConfirmationBoxProps) {
  const { toast } = useToast();

  async function deleteSP() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deleteserviceprovider`,
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
          description: "SP deleted",
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
      <AlertDialogTrigger className="text-sm font-bold bg-red-600 text-white px-9 py-3 rounded-lg border border-white whitespace-nowrap ">
        Delete service provider
      </AlertDialogTrigger>
      {WalletBalance !== 0 ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Provider has ₹{WalletBalance} in his wallet, Please Settle to delete SP
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black ">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove SP! warning it will delete SP and all its contents
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black ">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="text-black " onClick={deleteSP}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
