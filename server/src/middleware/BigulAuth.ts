import type { NextFunction, Request, Response } from "express";

/**
 * Middleware to verify Bigul user session token (JWT from SSO).
 * Expects Bearer token in Authorization header; attaches it as bigulSession for order APIs.
 */
export const verifyBigulSessionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization header with Bearer token is required",
    });
  }

  const userSession = authHeader.replace("Bearer ", "");

  if (!userSession || userSession.trim().length === 0) {
    return res.status(401).json({
      success: false,
      message: "Invalid session token",
    });
  }

  (req as any).bigulSession = userSession;

  return next();
};
