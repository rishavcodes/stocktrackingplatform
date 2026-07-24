import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";
import cron from "node-cron";

// Market Data Types
interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string | null;
}

interface MarketData {
  nifty: MarketItem;
  sensex: MarketItem;
  dow: MarketItem;
  gold: MarketItem;
}

// Initial state
let marketData: MarketData = {
  nifty: { symbol: "NIFTY 50", price: 0, change: 0, changePercent: 0, lastUpdate: null },
  sensex: { symbol: "SENSEX", price: 0, change: 0, changePercent: 0, lastUpdate: null },
  dow: { symbol: "DOW JONES", price: 0, change: 0, changePercent: 0, lastUpdate: null },
  gold: { symbol: "GOLD", price: 0, change: 0, changePercent: 0, lastUpdate: null },
};

let wss: WebSocketServer | null = null;

// Function to fetch market data
const fetchMarketData = async () => {
  try {
    const symbols = ["^NSEI", "^BSESN", "^DJI", "GC=F"];
    const responses = await Promise.all(
      symbols.map((symbol) =>
        axios
          .get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
            timeout: 5000,
          })
          .catch((err) => {
            console.error(`Error fetching ${symbol}:`, err.message);
            return null;
          })
      )
    );

    const currentTime = new Date().toISOString();

    const processData = (response: any, symbol: string, name: string): MarketItem => {
      const result = response?.data?.chart?.result?.[0];
      if (!result) {
        return { symbol: name, price: 0, change: 0, changePercent: 0, lastUpdate: currentTime };
      }
      const meta = result.meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;
      return {
        symbol: name,
        price,
        change: price - meta.previousClose,
        changePercent: ((price - meta.previousClose) / meta.previousClose) * 100,
        lastUpdate: currentTime,
      };
    };

    marketData.nifty = processData(responses[0], "^NSEI", "NIFTY 50");
    marketData.sensex = processData(responses[1], "^BSESN", "SENSEX");
    marketData.dow = processData(responses[2], "^DJI", "DOW JONES");
    marketData.gold = processData(responses[3], "GC=F", "GOLD");

    // console.log("✅ Market data updated:", new Date().toLocaleTimeString());

    // Broadcast to clients
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "marketData", data: marketData }));
        }
      });
    }
  } catch (error: any) {
    console.error("❌ Error fetching market data:", error.message);
  }
};

// Expose current market data for REST API (e.g. marketplace hero section)
export const getMarketData = (): MarketData => ({ ...marketData });

// Initialize WebSocket + Cron job
export const initMarketDataService = (server: HTTPServer) => {
  // noServer + manual routing on the HTTP `upgrade` event.
  //
  // We cannot use `{ server, path: "/marketdata" }` here even though that
  // looks correct: ws@8 attaches its own `upgrade` listener that ABORTS
  // any handshake whose URL doesn't match `path` (replies 400 + destroys
  // the socket). Since socket.io's engine also attaches an `upgrade`
  // listener on the same server for `/socket.io/?EIO=4&transport=websocket`,
  // the ws handler races and kills socket.io's upgrade before it can
  // complete — surfacing in the browser as "WebSocket connection failed:
  // Invalid frame header" and in the backend as "Invalid WebSocket frame".
  //
  // With `noServer: true`, ws does NOT register its own listener. We
  // register one that ONLY handles `/marketdata` and ignores everything
  // else, leaving socket.io's listener free to handle its own paths.
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/marketdata") return;
    wss!.handleUpgrade(req, socket, head, (ws) => {
      wss!.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("🔗 Client connected");
    ws.send(JSON.stringify({ type: "marketData", data: marketData }));

    ws.on("message", (message: string) => {
      console.log(`📩 Received: ${message}`);
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
    ws.on("error", (err) => console.error("WebSocket error:", err.message));
  });

  // Fetch every 2s
  cron.schedule("*/2 * * * * *", () => fetchMarketData());

  // Initial fetch
  fetchMarketData();
};
