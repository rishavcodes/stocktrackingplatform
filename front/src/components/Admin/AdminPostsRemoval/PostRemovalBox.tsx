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

import { useToast } from "@/components/ui/use-toast";
import { TrashIcon } from "lucide-react";

type ConfirmationBoxProps = {
  id: string;
  type: string;
  position?: string;
  token: string;
};

export default function PostRemovalBox({
  id,
  type,
  position = "left-2",
  token,
}: ConfirmationBoxProps) {
  const { toast } = useToast();

  async function removePost() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/${type}`,
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
          description: "Post Removed",
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
      <AlertDialogTrigger
        className={`bg-red-500 top-2 ${position} z-20 w-10 h-10 p-2 absolute`}
      >
        <TrashIcon className=" cursor-pointer bg-red-500" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deleting post</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-black">Cancel</AlertDialogCancel>
          <AlertDialogAction className="text-black" onClick={removePost}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
