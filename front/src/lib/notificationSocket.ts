"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton socket client for the `/notifications` namespace. Each tab opens
 * at most one connection; `getNotificationSocket(userId)` is safe to call
 * from multiple components (the dropdown, the full notifications page) — the
 * second caller gets back the same socket. The user-id room is re-joined on
 * every (re)connect so a temporary disconnect doesn't silently break push.
 */
export function getNotificationSocket(userId: string): Socket {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  if (!socket) {
    // socket.io-client caches one engine.io Manager per backend origin
    // (keyed by origin + "/socket.io", NOT by namespace), and the FIRST
    // io() call to that origin wins the transport config for every other
    // namespace that multiplexes over it. Since this notification singleton
    // is mounted in the dashboard layout, it often opens that shared Manager
    // before the scorecard live-tracking socket does. It must therefore stay
    // polling-first: pinning websocket-first here made the scorecard inherit
    // a websocket-first Manager with no fallback, surfacing "Live tracking is
    // offline — websocket error" on first navigation. `tryAllTransports`
    // falls back to the next transport if one fails (defaults to false).
    socket = io(`${base}/notifications`, {
      transports: ["polling", "websocket"],
      tryAllTransports: true,
      autoConnect: true,
      reconnection: true,
    });
  }
  const join = () => socket?.emit("join", userId);
  if (socket.connected) {
    join();
  } else {
    socket.once("connect", join);
  }
  socket.on("reconnect", join);
  return socket;
}

export function closeNotificationSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
