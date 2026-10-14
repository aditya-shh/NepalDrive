
import type { Request, Response } from "express";
import app from "../server.ts";

export default async function handler(
  req: Request,
  res: Response
) {
  try {
    return app(req, res);
  } catch (error) {
    console.error(
      "[SERVERLESS_INITIALIZATION_ERROR]",
      error
    );

    if (!res.headersSent) {
      return res.status(503).json({
        success: false,
        error: "DATABASE_UNAVAILABLE",
        message: "Service temporarily unavailable."
      });
    }
  }
}
