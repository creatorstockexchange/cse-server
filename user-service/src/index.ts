import "dotenv/config";
import { prisma } from "./db.js";
import clusterServer from "./bin.js";
import logger from "./utils/logger.js";

async function bootstrap() {
	// establish a Prisma connection before starting the server
	let attempts = 0;
	const maxAttempts = 3;
	const backoff = (n: number) => new Promise((res) => setTimeout(res, 1500 * n));

	while (attempts < maxAttempts) {
		try {
			await prisma.$connect();
			logger.info("Prisma connected to the database.");
			break;
		} catch (err) {
			attempts += 1;
			const msg = err instanceof Error ? err.message : String(err);
			logger.error(`Prisma connect attempt ${attempts} failed: ${msg}`);
			if (attempts >= maxAttempts) {
				throw err;
			}
			await backoff(attempts);
		}
	}

	clusterServer();
}

bootstrap().catch((err) => {
	logger.error("Fatal startup error:", err);
	process.exit(1);
});