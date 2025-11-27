const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "your-default-jwt-secret";

export {
    port,
    corsOrigin,
    JWT_SECRET
};