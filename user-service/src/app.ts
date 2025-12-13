import express from "express";
import authMiddleware from "./middlewares/authentication.middleware.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import client from "prom-client";
import { prometheusMiddleware } from "./middlewares/prometheus.middleware.js";
import { requestLogger } from "./middlewares/logging.middleware.js";
import logger from "./utils/logger.js";
import authRoutes from "./routes/auth.routes.js";
import depositRoutes from "./routes/deposit.routes.js";
import ipoRoutes from "./routes/ipo.routes.js";

import { port, corsOrigin } from "./config.js";

const app = express();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(prometheusMiddleware);

// request logging (after metrics so prometheus metrics are measured too)
app.use(requestLogger);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

// authenticated routes
app.use(authMiddleware);
app.use("/deposit", depositRoutes);
app.use("/ipo", ipoRoutes);

app.use("/metrics", async (req, res) => {
  const metrics = await client.register.metrics();
  res.set("Content-Type", client.register.contentType);
  res.end(metrics);
});

export async function startServer() {
  app.listen(port);
  logger.info("Server listening", { port });
}
