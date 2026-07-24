import { Input } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { ChangeEvent, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

type NumberContactProps = {
  plan: string;
  targetId: string;
  targetname: string;
  targetEmail: string;
};

export default function NumberContact({
  plan,
  targetId,
  targetname,
  targetEmail,
}: NumberContactProps) {
  const session = useSession();
  const { update } = useSession();
  const { toast } = useToast();
  const [contact, setContact] = useState({ number: 0 });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setContact({ number: Number(event.target.value) });
  }

  async function contactedEvent() {
    const reqData = {
      initiatingId: session.data?.user._id,
      initiatingname: session.data?.user.RegName,
      number: contact.number,
      email: session.data?.user.email,
      plan,
      targetId,
      targetname,
      targetEmail,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/servicepage/contact`,
      {
        method: "POST",
        body: JSON.stringify(reqData),
        headers: { "Content-type": "application/json" },
      }
    );

    if (res.status === 200) {
      toast({
        description: "Notified service provider he will contact you ASAP",
        variant: "default",
      });

      const formData = new FormData();
      const newdata = {
        id: session.data?.user._id,
        number: contact.number,
      };
      formData.append("data", JSON.stringify(newdata));
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/user`,
        { method: "POST", body: formData }
      );

      await update({
        ...session,
        user: {
          ...session.data?.user,
          number: contact.number,
        },
      });
    } else {
      toast({
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer bg-blueShade/60 w-fit px-5 py-2 mx-auto rounded-xl">
        Contact
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Please add your contact number</DialogTitle>
          <DialogDescription className="pt-5">
            <Input
              title={"Contact Number"}
              type={"number"}
              name={"number"}
              value={contact.number}
              height="py-2"
              onChange={handleChange}
            />

            <div
              className="cursor-pointer bg-blueShade/60 w-fit px-5 py-2 mx-auto rounded-xl text-white mt-5"
              onClick={contactedEvent}
            >
              Contact
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
