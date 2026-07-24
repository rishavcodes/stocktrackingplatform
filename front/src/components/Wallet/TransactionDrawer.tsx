"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import InfoIcon from "@/icons/InfoIcon";
import { transactionsType } from "@/app/dashboard/serviceprovider/services/transactions/page";

type TransactionDrawerProps = {
  transaction: transactionsType;
};

export default function TransactionDrawer({
  transaction,
}: TransactionDrawerProps) {
    // console.log(transaction)
  return (
    <Drawer shouldScaleBackground={true}>
      <DrawerTrigger>
        <InfoIcon className="w-5 h-5 cursor-pointer text-blue-500" />
      </DrawerTrigger>
      <DrawerContent className="p-6 bg-white dark:bg-gray-900 rounded-t-lg">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold">
            Transaction Details
          </DrawerTitle>
          <DrawerDescription className="flex flex-col gap-4 mt-5 text-sm text-left">
            <div>
              <strong>Purchased By:</strong>{" "}
              {transaction.orderdBy ? transaction.orderdBy.name : "N/A"}
            </div>
            <div>
              <strong>Service Name:</strong> {transaction.serviceName || "N/A"}
            </div>
            <div>
              <strong>Sub-total:</strong> {transaction.subtotal || "N/A"}
            </div>
            <div>
              <strong>GST:</strong> {transaction.gst || "N/A"}
            </div>
            <div>
              <strong>Total:</strong> {transaction.total || "N/A"}
            </div>
            <div>
              <strong>Purchase Date:</strong>{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(new Date(transaction.createdAt))}
            </div>
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          {/* Subscribers are verified-only now; manual orders awaiting
              verification live in the Leads section, not here. */}
          {(transaction.verifiedByRa ||
            transaction.paymentStatus === "verified") && (
            <span className="text-green-600 font-semibold">Verified</span>
          )}
          <DrawerClose>
            {/* <Button variant="outline">Cancel</Button> */}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
