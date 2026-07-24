import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Trash } from "lucide-react";

export default function TradeDeleteConfirmationBox({
  id,
  name,
  isDropdownItem = false,
}: {
  id: string;
  name: string;
  isDropdownItem?: boolean;
}) {
  const { toast } = useToast();

  async function deleteTrade() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/deletetrade`,
        {
          method: "POST",
          body: JSON.stringify({ id }),
          headers: { "Content-type": "application/json" },
        }
      );

      if (response.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to delete trade please try again",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Deleted",
        description: `Deleted ${name}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to exit trade please try again",
        variant: "destructive",
      });
      return;
    }
  }

  return (
    <AlertDialog>
      <Toaster />
      <AlertDialogTrigger className={isDropdownItem
        ? "w-full flex items-center px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
        : "bg-red-600 p-2 rounded-full text-white"
      }>
        <Trash className={isDropdownItem ? "w-4 h-4 mr-2" : "h-4 w-4"} />
        {isDropdownItem && "Delete Trade"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trade </AlertDialogTitle>
          <AlertDialogDescription className="text-black dark:text-white text-[15px]">
            Do you want to delete {name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-black dark:text-white dark:bg-black">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-black"
            onClick={() => deleteTrade()}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
