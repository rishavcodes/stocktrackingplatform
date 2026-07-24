"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "..";
import { ChangeEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "../ui/use-toast";

type documentDataProps = {
  name: string;
  document: File | null;
};

export default function UploadDocumentInput({
  index,
  title,
}: {
  index: number;
  title: string;
}) {
  const session = useSession();

  const { toast } = useToast();

  const [documentData, setDocumentData] = useState<documentDataProps>({
    name: "",
    document: null,
  });

  function DataChangeHandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setDocumentData((prev) => ({ ...prev, [name]: value }));
  }

  function newDocumentFileHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;

    if (files && files?.length > 0) {
      const file = files[0];
      //   const url = URL.createObjectURL(file);
      setDocumentData((prev) => ({ ...prev, document: file }));
    }
  }

  async function handleSubmit() {
    const data = {
      name: documentData.name,
      id: session.data?.user._id,
      RegName: session.data?.user.RegName,
      email: session.data?.user.email,
      index,
    };

    const formData = new FormData();

    formData.append("data", JSON.stringify(data));

    if (documentData.document) {
      formData.append("document", documentData.document);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/serviceprovider/document`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.status !== 200) {
        toast({
          title: "Error!",
          description: "Error updating document",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Document Updated",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error!",
        description: "Error updating document",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger className="mt-5 px-20 py-2 max-ss:mx-5 cursor-pointer w-fit border border-darkGrey">
        {title}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update {title}</DialogTitle>
          <DialogDescription className="flex flex-col gap-5">
            <Input
              title={"Name of Document"}
              type={"text"}
              name={"name"}
              height="py-2"
              onChange={DataChangeHandler}
            />

            <label className="flex flex-col justify-center cursor-pointer items-center gap-2 border p-20">
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                name="document"
                onChange={newDocumentFileHandler}
              />

              <div className="flex flex-col justify-center items-center gap-1">
                <div className="whitespace-nowrap">
                  {documentData.document?.name === undefined
                    ? "Upload Document"
                    : documentData.document?.name}
                </div>
              </div>
            </label>

            <div
              className="mt-5 bg-green px-7 py-2 w-fit cursor-pointer dark:text-black"
              onClick={() => handleSubmit()}
            >
              Upload
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
