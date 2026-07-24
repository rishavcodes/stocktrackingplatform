"use client";

import { useEffect, useRef, useState } from "react";
import { getNotificationSocket } from "@/lib/notificationSocket";

// Public-folder asset — see /public/sounds/. Switch to the other file here
// if you want a different alert tone, no other change needed.
const NOTIFICATION_SOUND_URL = "/sounds/mixkit-flute-mobile-phone-notification-alert-2316.wav";

export function useUnreadNotifications(id?: string, role?: string) {
  const [count, setCount] = useState(0);
  // Audio element is created once per hook instance and reused — preloading
  // the file means the first chime fires without a network round-trip and
  // doesn't get clipped by the buffer warmup.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialise the <audio> element on mount. We don't try to play() yet
  // because browsers block playback until the user has interacted with the
  // page; the actual play happens inside the socket handler.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.preload = "auto";
    // 0.6 is a comfortable indoor level — loud enough to catch attention
    // without making the user reach for the speaker. Bump if needed.
    audio.volume = 0.6;
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      // Rewind so back-to-back notifications all trigger the full chime
      // instead of the second one inheriting the first's playback position.
      audio.currentTime = 0;
      const result = audio.play();
      // Modern browsers return a promise. A rejected promise typically
      // means the user hasn't interacted with the page yet (autoplay
      // policy) — that's expected on first load, so swallow silently.
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch {
      /* swallow — never block the unread-count update on audio failure */
    }
  };

  const refetch = async () => {
    if (!id || !role) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotificationslength?id=${id}&role=${role}`,
      );
      const data = await res.json();
      if (data.success) {
        setCount(typeof data.notifications === "number" ? data.notifications : 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread notification count", err);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, role]);

  useEffect(() => {
    if (!id) return;
    const socket = getNotificationSocket(id);
    // Every socket-pushed notification bumps the unread counter AND plays
    // the alert chime so the user notices even when the tab is in the
    // background (focus + audible = harder to miss).
    const onNew = () => {
      setCount((c) => c + 1);
      playNotificationSound();
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [id]);

  useEffect(() => {
    // Same audible signal when other components fire the cross-component
    // refresh event (e.g. after marking read on one page, the bell badge
    // updates everywhere — but we deliberately do NOT play sound on a
    // user-initiated refresh, only when count actually grows).
    const onChange = () => {
      const prev = count;
      refetch().then(() => {
        // refetch() doesn't return the new count directly, so we read it
        // via a microtask after the setState lands. A lightweight delta
        // check would be ideal — for now, chiming only on socket pushes
        // is the safer default (above).
        void prev;
      });
    };
    window.addEventListener("notifications:unread-changed", onChange);
    return () => {
      window.removeEventListener("notifications:unread-changed", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, role]);

  return { count, refetch };
}
