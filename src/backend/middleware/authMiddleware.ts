import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AuthUserPayload } from "../services/jwtService";

// Augment Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware: Requires a valid JWT Access Token in Authorization header.
 * Header format: Authorization: Bearer <access_token>
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  
  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({
      success: false,
      code: "TOKEN_MISSING",
      message: "Authentication required. Authorization header missing."
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      code: "TOKEN_FORMAT_INVALID",
      message: "Authorization header must be formatted as 'Bearer <token>'."
    });
  }

  const token = parts[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED_OR_INVALID",
      message: "JWT access token is expired, invalid, or malformed."
    });
  }

  // Attach payload to Express Request
  req.user = payload;
  next();
}

/**
 * Middleware: Optional JWT authentication (attaches user if valid token exists, doesn't block if absent)
 */
export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const payload = verifyAccessToken(parts[1]);
      if (payload) {
        req.user = payload;
      }
    }
  }
  next();
}

/**
 * Middleware: Restrict route access to specific roles ('doctor', 'patient')
 */
export function requireRole(allowedRoles: Array<"doctor" | "patient">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "User is not authenticated."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: "FORBIDDEN",
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}.`
      });
    }

    next();
  };
}
