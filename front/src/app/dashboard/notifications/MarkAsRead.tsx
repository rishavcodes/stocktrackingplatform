"use client";

import { mutate } from "swr";

async function ReadNotifications(id: string, role: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/readnotifications/all`,
    {
      method: "POST",
      body: JSON.stringify({ id, role }),
      headers: { "Content-type": "application/json" },
    }
  );

  if (response.status !== 200) {
    return false;
  }

  const rawRes = await response.json();

  return rawRes.success;
}

export default function MarkAsRead({ id, role }: { id: string; role: string }) {
  const handleMarkAsRead = async () => {
    await ReadNotifications(id, role);
    mutate(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotifications?id=${id}&role=${role}`,
    );
    window.dispatchEvent(new Event("notifications:unread-changed"));
  };

  return (
    <div
      className="bg-blue px-5 py-2 cursor-pointer rounded-md"
      onClick={handleMarkAsRead}
    >
      Mark all as Read
    </div>
  );
}
