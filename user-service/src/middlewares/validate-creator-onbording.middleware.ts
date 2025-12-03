import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import Send from "../utils/response.utils.js";

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodError = error as ZodError<any>;
        const errors = zodError.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return Send.error(res, { errors }, "Validation failed.");
      }
      return Send.error(res, null, "Validation error occurred.");
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return Send.error(res, { errors }, "Query validation failed.");
      }
      return Send.error(res, null, "Query validation error occurred.");
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return Send.error(res, { errors }, "Parameter validation failed.");
      }
      return Send.error(res, null, "Parameter validation error occurred.");
    }
  };
};

export const validateAll = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        return Send.error(res, { errors }, "Validation failed.");
      }
      return Send.error(res, null, "Validation error occurred.");
    }
  };
};