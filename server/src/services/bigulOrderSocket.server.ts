import type { Socket } from "socket.io";
import { BigulOrderWS } from "./bigulOrder.ws.js";

/**
 * Socket.IO namespace handler for `/bigulorderlive`.
 *
 * Per-user: each connected client gets its own BigulOrderWS instance
 * authenticated with the user's access token.
 *
 * Events received:
 *   init  → { accessToken }
 *
 * Events emitted:
 *   order:init     → { ok: true }
 *   order:error    → { message }
 *   order:update   → order data from Bigul
 *   trade:update   → trade data from Bigul
 *   position:update → position data from Bigul
 */
export function handleBigulOrderSocket(socket: Socket): void {
  const clientId = socket.id;
  let orderWS: BigulOrderWS | null = null;

  console.log("[BigulOrderLive] client connected:", clientId);

  socket.on("init", (payload: unknown) => {
    const body =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken : "";

    if (!accessToken) {
      socket.emit("order:error", { message: "init requires accessToken" });
      return;
    }

    if (orderWS) {
      orderWS.disconnect();
      orderWS = null;
    }

    orderWS = new BigulOrderWS({
      accessToken,
      onOrder: (data) => socket.emit("order:update", data),
      onTrade: (data) => socket.emit("trade:update", data),
      onPosition: (data) => socket.emit("position:update", data),
      onConnectionChange: (status) => {
        if (status === "authenticated") {
          socket.emit("order:init", { ok: true });
        } else if (status === "auth_failed") {
          socket.emit("order:error", {
            message: "Bigul authentication failed. Token may be expired.",
          });
        } else if (status === "disconnected") {
          socket.emit("order:error", {
            message: "Bigul order WebSocket disconnected. Reconnecting...",
          });
        }
      },
    });

    orderWS.connect();
  });

  socket.on("disconnect", () => {
    console.log("[BigulOrderLive] client disconnected:", clientId);
    if (orderWS) {
      orderWS.disconnect();
      orderWS = null;
    }
  });
}
