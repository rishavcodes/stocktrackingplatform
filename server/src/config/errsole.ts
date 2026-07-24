/**
 * Errsole logger: MongoDB log storage, console capture, and web dashboard.
 * Dashboard is served at /errsole (protected by auth middleware in index.ts).
 */
import dotenv from "dotenv";
dotenv.config();

import errsole from "errsole";
import ErrsoleMongoDB from "errsole-mongodb";
import ErrsoleSQLite from "errsole-sqlite";
import os from "os";
import path from "path";

const APP_NAME = process.env.ERRSOLE_APP_NAME || "Tradebox";
const nodeEnv = process.env.NODE_ENV || "development";
const isLocal = nodeEnv === "local";
const mongoUrl = process.env.MONGOOSE_URL;

const ERRSOLE_DB_NAME = process.env.ERRSOLE_MONGO_DB_NAME || "tradebox_logs";
// errsole-mongodb accepts collectionPrefix (not in MongoClientOptions types)
const mongoStorageOptions = { collectionPrefix: APP_NAME } as Record<
  string,
  unknown
>;

if (isLocal) {
  // Local: SQLite (file on disk)
  const logsFile = path.join(os.tmpdir(), `${APP_NAME}.log.sqlite`);
  console.log("MONGOOSE_URL =", process.env.MONGOOSE_URL);
  console.log("NODE_ENV =", process.env.NODE_ENV);
  errsole.initialize({
    storage: new ErrsoleSQLite(logsFile),
    appName: APP_NAME,
    environmentName: nodeEnv,
    collectLogs: ["error", "info", "warn", "log"],
    enableConsoleOutput: true,
    enableDashboard: true,
  });
} else if (mongoUrl) {
  // Non-local (e.g. development, production, uat): MongoDB
  console.log("MONGOOSE_URL =", process.env.MONGOOSE_URL);
  console.log("NODE_ENV =", process.env.NODE_ENV);
  errsole.initialize({
    storage: new ErrsoleMongoDB(mongoUrl, ERRSOLE_DB_NAME, mongoStorageOptions),
    appName: APP_NAME,
    environmentName: nodeEnv,
    collectLogs: ["error", "info", "warn", "log"],
    enableConsoleOutput: true,
    enableDashboard: true,
  });
} else {
  // Fallback: SQLite when MONGOOSE_URL is not set
  const logsFile = path.join(os.tmpdir(), `${APP_NAME}.log.sqlite`);
  console.log("MONGOOSE_URL =", process.env.MONGOOSE_URL);
  console.log("NODE_ENV =", process.env.NODE_ENV);
  
  errsole.initialize({
    storage: new ErrsoleSQLite(logsFile),
    appName: APP_NAME,
    environmentName: nodeEnv,
    collectLogs: ["error", "info", "warn", "log"],
    enableConsoleOutput: true,
    enableDashboard: true,
  });
}

export default errsole;
