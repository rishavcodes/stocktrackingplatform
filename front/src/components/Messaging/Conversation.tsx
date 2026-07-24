"use client";

import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";

import Image from "next/image";
import { useSession } from "next-auth/react";

type allMessagesType = {
  _id: string;
  content: string;
  sender: string;
  receiver: string;
  createdAt: string;
};

export default function Conversation({ receiver }: { receiver: string }) {
  const session = useSession();

  const [message, setMessage] = useState({ content: "" });
  const [socket, setSocket] = useState<Socket | null>(null);

  const [allMessages, setAllMessages] = useState<allMessagesType[]>([]);

  useEffect(() => {
    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/messaginglive`
    );
    setSocket(socket);

    socket.on("connect", () => {
      socket.emit("details", {
        senderId: session.data?.user._id,
        receiverId: receiver,
      });
    });

    socket.on("getmessages", (data: allMessagesType[]) => {
      setAllMessages(data);
    });

    return () => {
      socket.close();
      socket.disconnect();

      // socket.off("scorecard", "");
    };
  }, [receiver]);

  async function handleMessage(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setMessage((prev) => ({ ...prev, [name]: value }));
  }

  async function sendMessage() {
    socket?.emit("message", {
      message: message.content,
      senderId: session.data?.user._id,
      receiverId: receiver,
    });

    setMessage({ content: "" });
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  return (
    <div className="bg-white dark:bg-black px-5 pt-5 w-full gap-5 flex flex-col-reverse h-[80vh] overflow-y-auto relative">
      <div className="flex items-center gap-5 absolute w-[95%] py-5">
        <input
          title={""}
          placeholder="Type a message"
          type={"text"}
          name={"content"}
          value={message.content}
          onChange={handleMessage}
          onKeyDown={handleKeyDown}
          className="py-3 border border-darkGrey/30 dark:border-darkGrey/70 pl-4 dark:bg-blackShade focus:outline-none w-full rounded-lg"
        />

        <Image
          src={"/images/messages/send.png"}
          alt={"send"}
          width={40}
          height={40}
          className="cursor-pointer"
          onClick={() => sendMessage()}
        />
      </div>
      <div className="flex flex-col justify-start gap-3 pb-28">
        {allMessages.map((msg) => (
          <div
            key={msg._id}
            className={`text-black dark:text-white rounded-lg w-fit px-3 py-2 ${
              msg.sender === session.data?.user._id
                ? "bg-blueShade/40 self-end"
                : "bg-green/40"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}
