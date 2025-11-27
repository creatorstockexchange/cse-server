import type { Response } from "express";
import statusCode from "./statusCode.utils.js";

class Send {
    static success(res: Response, data: any, message = "success") {
        res.status(statusCode.OK).json({
            ok: true,
            message,
            data
        });
        return;
    }

    static error(res: Response, data: any, message = "error") {
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({
            ok: false,
            message,
            data,
        });
        return;
    }

    static notFound(res: Response, data: any, message = "not found") {
        res.status(statusCode.NOT_FOUND).json({
            ok: false,
            message,
            data,
        });
        return;
    }

    static unauthorized(res: Response, data: any, message = "unauthorized") {
        res.status(statusCode.UNAUTHORIZED).json({
            ok: false,
            message,
            data,
        });
        return;
    }

    static validationErrors(res: Response, errors: Record<string, string[]>) {
        res.status(statusCode.UNAUTHORIZED).json({
            ok: false,
            message: "Validation error",
            errors,
        });
        return;
    }

    static forbidden(res: Response, data: any, message = "forbidden") {
        res.status(statusCode.FORBIDDEN).json({
            ok: false,
            message,
            data,
        });
        return;
    }

    static badRequest(res: Response, data: any, message = "bad request") {
        res.status(statusCode.BAD_REQUEST).json({
            ok: false,
            message,
            data,
        });
        return;
    }
}

export default Send;