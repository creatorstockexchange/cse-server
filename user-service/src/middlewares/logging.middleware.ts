import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.utils.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  const { method, originalUrl } = req;
  const ip = req.ip || req.connection?.remoteAddress || "unknown";

  res.on("finish", () => {
    const [sec, nano] = process.hrtime(start);
    const durationMs = (sec * 1e3 + nano / 1e6).toFixed(2);
    const { statusCode } = res;

    logger.info("HTTP request", {
      method,
      url: originalUrl,
      status: statusCode,
      durationMs,
      ip,
      userAgent: req.headers["user-agent"],
    });
  });

  next();
}
