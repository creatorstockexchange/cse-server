import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, errors, json, colorize } = format;

const isProduction = process.env.NODE_ENV === "production";

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const developmentFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const base = `${timestamp} ${level}: ${message}`;
    const maybeStack = stack ? `\n${stack}` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${base}${metaStr}${maybeStack}`;
  })
);

const logger = createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction ? productionFormat : developmentFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
  exitOnError: false,
});

export default logger;

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
