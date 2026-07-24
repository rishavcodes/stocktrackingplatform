// config/logger.ts — Winston logger; also streams to Errsole when winston-errsole is used
import winston from "winston";
// Ensure Errsole is initialized before adding its transport (needed for log storage/dashboard)
import "./errsole.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WinstonErrsole = require("winston-errsole");

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new WinstonErrsole(),
  ],
});
