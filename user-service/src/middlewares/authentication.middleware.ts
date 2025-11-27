import jwt from "jsonwebtoken";

import type { Response, NextFunction } from "express";
import { JWT_SECRET } from "../config.js";
import statusCode from "../utils/statusCode.utils.js";
import AuthRequest from "../types/authRequest.type.js";

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    
    if (!token) {
        return res.status(statusCode.UNAUTHORIZED).json({
            success: false,
            message: "Unauthorized",
            error: {
                message: "No token provided"
            },
            data: null,
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (typeof decoded === "string" || !decoded) {
            return res.status(statusCode.UNAUTHORIZED).json({
                success: false,
                message: "Unauthorized",
                error: {
                    message: "Invalid token"
                },
                data: null,
            });
        }

        req.user = decoded as { userId: string };
        next();
    } catch (error) {
        return res.status(statusCode.UNAUTHORIZED).json({
            success: false,
            message: "Unauthorized",
            error: {
                message: "Invalid token"
            },
            data: null,
        });
    }
};

export default authMiddleware;
