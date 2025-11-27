import type { Request } from "express";

interface AuthRequest extends Request {
    user?: { userId: string };
}

export default AuthRequest;