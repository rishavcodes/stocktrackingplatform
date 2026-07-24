import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import InfoIcon from "@/icons/InfoIcon";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";

type CustomersMoreInfoProps = { _id: string };

type DataProps = { title: string; author: string };

export default function CustomersMoreInfo({ _id }: CustomersMoreInfoProps) {
  const session = useSession();

  const { toast } = useToast();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/customerdetails?id=${_id}`;

  const { data } = useSWR<{
    data: DataProps[];
  }>(url, (url: string) => fetcher(url, { headers }));

  async function deleteCustomer(id: string) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deletecustomer`,
        {
          method: "POST",
          body: JSON.stringify({ id }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${session.data?.backendToken}`,
          },
        }
      );

      if (res.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });

        return;
      }

      toast({
        title: "Success",
        description: "User deleted",
        variant: "default",
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger>
        <InfoIcon className="w-5 h-5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer Data</DialogTitle>
          <DialogDescription>
            <div className="flex flex-col gap-3 mt-5">
              {data?.data.map((user, idx) => (
                <div key={user.title + idx}>
                  <div>Plan Name : {user.title}</div>
                  <div>Plan Author : {user.author}</div>
                </div>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div
            className="bg-red-500 px-3 py-2 rounded-xl cursor-pointer w-fit"
            onClick={() => deleteCustomer(_id)}
          >
            Delete User
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
