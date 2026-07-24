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
import { LogOut } from "lucide-react";

export default function TradeExitConfirmationBox({
	id,
	name,
	pnl,
	pnlpercentage,
	ltp,
	isDropdownItem = false,
}: {
	id: string;
	name: string;
	pnl: string;
	pnlpercentage: string;
	ltp: number;
	isDropdownItem?: boolean;
}) {
	const { toast } = useToast();

	const date = new Date();

	async function closeTradeManually(
		tradeid: string,
		tradepnl: string,
		tradename: string,
		tradepnlpercentage: number,
		ltp: number,
	) {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/changestatus/manually`,
			{
				method: "POST",
				body: JSON.stringify({
					id: tradeid,
					pnl: tradepnl,
					pnlpercentage: tradepnlpercentage,
					ltp,
					exitDate: date.toLocaleString(),
				}),
				headers: { "Content-type": "application/json" },
			},
		);

		if (response.status !== 200) {
			toast({
				title: "Error",
				description: "Failed to exit trade please try again",
				variant: "destructive",
			});
			return;
		}

		toast({
			title: "Exited",
			description: `Exited ${tradename} at ${
				Number(pnl) >= 0 ? "profit" : "loss"
			} of ${pnl}`,
			variant: "default",
		});
	}

	return (
		<AlertDialog>
			<Toaster />
			<AlertDialogTrigger className={isDropdownItem
				? "w-full flex items-center px-2 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
				: "bg-green-600 p-2 rounded-full text-white"
			}>
				<LogOut className={isDropdownItem ? "w-4 h-4 mr-2" : "h-4 w-4"} />
				{isDropdownItem && "Exit Trade"}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Exit Trade Manually</AlertDialogTitle>
					<AlertDialogDescription className="text-black dark:text-white text-[15px]">
						Do you want to exit <b>{name}</b> at{" "}
  <span
    className={`font-semibold ${
      Number(pnl) >= 0 ? "text-green-600" : "text-red-600"
    }`}
  >
    {pnlpercentage} ({Number(pnl) >= 0 ? "+" : ""}{pnl})
  </span>{" "}
  {Number(pnl) >= 0 ? "profit" : "loss"}?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel className="text-black dark:text-white dark:bg-black">
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						className="text-black"
						onClick={() =>
							closeTradeManually(
								id,
								pnl,
								name,
								Number(pnlpercentage.split("%")[0]),
								ltp,
							)
						}
					>
						Continue
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
