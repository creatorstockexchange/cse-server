import cluster from "cluster";
import os from "os";
import { startServer } from "./app.js";
import logger from "./utils/logger.utils.js";

const numberOfCores = os.cpus().length;

const clusterServer = () => {
  if (cluster.isPrimary) {
    logger.info(`Primary ${process.pid} is running`);
    logger.info(`Number of CPU cores: ${numberOfCores}`);
    logger.info(`Server started on port ${process.env.PORT || 5000}`);

    for (let i = 0; i < numberOfCores; i++) {
      cluster.fork();
    }
  } else {
    logger.info(`Worker ${process.pid} started`);
    startServer();
  }
};

export default clusterServer;