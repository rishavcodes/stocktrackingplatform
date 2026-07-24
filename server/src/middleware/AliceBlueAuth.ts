import type { NextFunction, Request, Response } from "express";

/**
 * Middleware to verify Alice Blue user session token
 * This middleware checks for the Bearer token in the Authorization header
 * The actual token validation happens when making requests to Alice Blue API
 */
export const verifyAliceBlueSessionMiddleware = (
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

  // Attach userSession to request object for use in controllers
  (req as any).aliceBlueSession = userSession;

  return next();
};
