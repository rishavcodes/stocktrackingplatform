// Side-effect import — runs dotenv.config() synchronously before any other
// import below evaluates. Several helpers (multer-s3, S3 client, the Angel
// broker SDK, etc.) reference process.env at module load, so a deferred
// `dotenv.config()` further down used to crash with "bucket is required"
// the moment one of those modules was pulled into the first import batch.
import "dotenv/config";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import { connectToDB } from "./config/database";
import { initializeSmartAPISession } from "./config/smart-api";
import {
  updateLiveScoreCardDashboard,
  updateLiveScoreCardForSubscribed,
  updateLiveScoreCardForMarketplace,
} from "./controllers/ScoreCardController";
import { initMarketDataService } from "./helpers/marketData";
import {
  verifyAdminTokenMiddleware,
  verifyUserRATokenMiddleware,
} from "./middleware/AdminSecurity";
// Scorecard queue removed - tracking now handled by GlobalTradeTracker
import {
  freeTrialValidityStatusQueue,
  tradeboxplansValidityStatusQueue,
  validityStatusQueue,
} from "./queues/ValidityStatusQueue";
import AuthRoutes from "./routes/AuthRoutes";
import HealthCheck from "./routes/HealthCheck";
import HomeDataRoutes from "./routes/HomeDataRoutes";
import MarketplaceRoutes from "./routes/MarketplaceRoutes";
import MarketDataRoutes from "./routes/MarketDataRoutes";
import PostContentRoutes from "./routes/PostContentRoutes";
import ScoreCardRoutes from "./routes/ScoreCardRoutes";
import ScriptMasterRoutes from "./routes/ScriptMasterRoutes";
import ServicesRoutes from "./routes/ServicesRoutes";
import startCronJobs from "./scheduled-jobs/startCronJobs";
import { startWorkers, stopWorkers } from "./workers";
import { connection as redisConnection } from "./config/redisConnection";
import { stopMarketPriceFetcher } from "./services/MarketPriceFetcher";
import { angelWebSocket } from "./services/AngelWebSocket";
import errsole from "./config/errsole.js";

dotenv.config();

const port = process.env.PORT || 8080;
const app = express();

// Errsole log dashboard (first middleware per Errsole docs; protected by Basic Auth)
app.use("/errsole", errsole.expressProxyMiddleware());

app.use((req, res, next) => {
  // Skip helmet for the Errsole dashboard so its assets load properly
  if (req.path.startsWith("/errsole")) {
    return next();
  }
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "tradebox-9zetckbp0-tradeboxs-projects.vercel.app",
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", process.env.NEXTAUTH_URL || ""],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    frameguard: { action: "deny" },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  })(req, res, next);
});

// ✅ Explicit HSTS (use only if your app is HTTPS-only)
app.use((req, res, next) => {
  if (req.secure || process.env.NODE_ENV === "uat") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  next();
});

// Allow the apex domain and any `*.tradeboxlive.com` subdomain (for
// white-label broker marketplaces like `bigul.tradeboxlive.com`). Localhost
// ports stay permitted for dev. Unknown origins are rejected — the prior
// `!origin || allowedOrigins` check effectively allowed everything whenever
// NEXTAUTH_URL was set, which defeated CORS.
const ALLOWED_ORIGINS = [
  "https://stocktrackingplatform.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server, curl, healthchecks
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
// app.use(cors())
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));


app.use("/health", HealthCheck.routes);

app.use("/api/auth", AuthRoutes.routes);
app.use("/api/post", PostContentRoutes.routes);
app.use("/api/data", HomeDataRoutes.routes);
app.use("/api/scorecard", ScoreCardRoutes.routes);
app.use("/api/scripts", ScriptMasterRoutes.routes);
app.use("/api/services", ServicesRoutes.routes);
app.use("/api/marketplace", MarketplaceRoutes.routes);
app.use("/api/market-data", MarketDataRoutes.routes);

const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: "*" },
  perMessageDeflate: false,
});

// Temporary debug endpoint to verify outbound IP via NAT gateway
app.get("/debug/ip", async (req, res) => {
  try {
    const { data } = await axios.get("https://checkip.amazonaws.com");
    const ip = data.trim();
    console.log("Outbound IP:", ip);
    return res.json({ ip });
  } catch (error) {
    console.error("Failed to fetch outbound IP:", error);
    return res.status(500).json({ error: "Failed to get IP" });
  }
});

// Final upload-error handler. Multer surfaces wrong-type uploads as
// `MulterError` or plain `Error`, and the default Express handler renders
// them as text/html — the browser then can't read the body cross-origin and
// the client sees a generic "Failed to fetch". Convert these to JSON with
// CORS-aware status codes so the UI can show a useful toast.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  if (err && typeof err.message === "string" && /must be a \.pdf/i.test(err.message)) {
    return res.status(415).json({
      success: false,
      code: "UNSUPPORTED_FILE_TYPE",
      message: err.message,
    });
  }
  return next(err);
});

// Per-recipient notification push. Each client emits `join` with its
// user/provider id on connect; sendNotification() then routes new docs to
// `io.of("/notifications").to(id).emit("notification:new", doc)`.
// Failure mode: if the client never connects (e.g. disabled), the existing
// fetch-on-mount in the bell dropdown still surfaces notifications.
io.of("/notifications").on("connection", (socket) => {
  socket.on("join", (id: unknown) => {
    if (typeof id === "string" && id) {
      socket.join(id);
    }
  });
});

io.of("/scorecardlive/serviceproviderdashboard").on("connection", (socket) => {
  updateLiveScoreCardDashboard(socket);
});

io.of("/scorecardlive/forsubscribed").on("connection", (socket) => {
  updateLiveScoreCardForSubscribed(socket);
});

io.of("/scorecardlive/marketplace").on("connection", (socket) => {
  updateLiveScoreCardForMarketplace(socket);
});

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/monitor/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullMQAdapter(validityStatusQueue),
    new BullMQAdapter(tradeboxplansValidityStatusQueue),
    new BullMQAdapter(freeTrialValidityStatusQueue),
  ],
  serverAdapter: serverAdapter,
});

app.use("/monitor/queues", serverAdapter.getRouter());
initMarketDataService(server);
connectToDB().then(() => {
  server.listen(port, async () => {
    console.log("Server up and running on port :- " + port);
    await initializeSmartAPISession();
    startWorkers();
    startCronJobs();
  });
});

// Graceful shutdown — close all Redis connections so they don't leak on restart
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  try {
    stopMarketPriceFetcher();
    angelWebSocket.disconnect();
    await stopWorkers();
    const { closeScorecardPubSub } = await import("./services/ScorecardPubSub.js");
    await closeScorecardPubSub();
    await redisConnection.quit();
    console.log("All connections closed");
  } catch (err) {
    console.error("Error during shutdown:", err);
  }
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
