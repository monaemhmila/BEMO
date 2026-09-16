import type {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import { logger } from "../lib/logger";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ err }, "Unhandled error");

  const status = err?.status || 500;
  res.status(status).json({
    message: err?.message || "Internal server error",
  });
};

