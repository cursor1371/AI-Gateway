import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getProviderConfig(provider: "openai" | "anthropic" | "gemini"): {
  baseUrl: string;
  apiKey: string;
} {
  const baseUrlKey = `AI_INTEGRATIONS_${provider.toUpperCase()}_BASE_URL`;
  const apiKeyKey = `AI_INTEGRATIONS_${provider.toUpperCase()}_API_KEY`;
  const baseUrl = (process.env[baseUrlKey] ?? "").replace(/\/$/, "");
  const apiKey = process.env[apiKeyKey] ?? "";
  return { baseUrl, apiKey };
}

async function proxyRequest(
  req: Request,
  res: Response,
  targetUrl: string,
  authHeaderName: string,
  authHeaderValue: string,
): Promise<void> {
  const method = req.method;

  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (!val) continue;
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "transfer-encoding" ||
      lower === "content-length"
    ) {
      continue;
    }
    headers[key] = Array.isArray(val) ? val.join(", ") : val;
  }
  headers[authHeaderName] = authHeaderValue;

  let body: Buffer | string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = (req.headers["content-type"] ?? "").toLowerCase();
    if (contentType.includes("application/json")) {
      body = JSON.stringify(req.body);
      if (!headers["content-type"]) {
        headers["content-type"] = "application/json";
      }
    } else {
      body = req.body as string;
    }
  }

  logger.info({ method, targetUrl }, "Proxying AI request");

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    res.status(upstream.status);

    upstream.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (
        lower === "transfer-encoding" ||
        lower === "connection" ||
        lower === "content-encoding" ||
        lower === "content-length"
      )
        return;
      res.setHeader(key, val);
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const isEventStream = contentType.includes("text/event-stream");

    if (isEventStream && upstream.body) {
      res.flushHeaders();
      const reader = upstream.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    } else {
      const buf = await upstream.arrayBuffer();
      res.end(Buffer.from(buf));
    }
  } catch (err) {
    logger.error({ err, targetUrl }, "Proxy upstream error");
    if (!res.headersSent) {
      res
        .status(502)
        .json({ error: "Bad Gateway", message: "Upstream request failed" });
    }
  }
}

function getQueryString(req: Request): string {
  const idx = req.url.indexOf("?");
  return idx >= 0 ? req.url.slice(idx) : "";
}

router.all("/v1/chat/completions", async (req: Request, res: Response) => {
  const { baseUrl, apiKey } = getProviderConfig("openai");
  const targetUrl = `${baseUrl}/chat/completions${getQueryString(req)}`;
  await proxyRequest(req, res, targetUrl, "Authorization", `Bearer ${apiKey}`);
});

router.all("/v1/responses", async (req: Request, res: Response) => {
  const { baseUrl, apiKey } = getProviderConfig("openai");
  const targetUrl = `${baseUrl}/responses${getQueryString(req)}`;
  await proxyRequest(req, res, targetUrl, "Authorization", `Bearer ${apiKey}`);
});

router.all("/v1/messages", async (req: Request, res: Response) => {
  const { baseUrl, apiKey } = getProviderConfig("anthropic");
  const targetUrl = `${baseUrl}/v1/messages${getQueryString(req)}`;
  await proxyRequest(req, res, targetUrl, "x-api-key", apiKey);
});

router.all(
  /^\/v1beta\/models\/[^/]+:(generateContent|streamGenerateContent)$/,
  async (req: Request, res: Response) => {
    const { baseUrl, apiKey } = getProviderConfig("gemini");
    const suffix = req.path.replace(/^\/v1beta/, "");
    const targetUrl = `${baseUrl}${suffix}${getQueryString(req)}`;
    await proxyRequest(req, res, targetUrl, "x-goog-api-key", apiKey);
  },
);

export default router;
