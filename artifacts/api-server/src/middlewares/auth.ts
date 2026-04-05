import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

function extractKey(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey) {
    return xApiKey;
  }

  const xGoogApiKey = req.headers["x-goog-api-key"];
  if (typeof xGoogApiKey === "string" && xGoogApiKey) {
    return xGoogApiKey;
  }

  return null;
}

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const gatewayKey = process.env["GATEWAY_API_KEY"];

  if (!gatewayKey) {
    logger.error("GATEWAY_API_KEY is not configured");
    res.status(500).json({ error: "Gateway misconfigured" });
    return;
  }

  const providedKey = extractKey(req);

  if (!providedKey || providedKey !== gatewayKey) {
    logger.warn(
      { ip: req.ip, path: req.path },
      "Unauthorized request: invalid or missing API key",
    );
    res.status(401).json({
      error: "Unauthorized",
      message:
        "Invalid or missing API key. Accepted headers: Authorization: Bearer <key> | x-api-key: <key> | x-goog-api-key: <key>",
    });
    return;
  }

  next();
}
