import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import Fastify, { type FastifyInstance } from "fastify";
import { GoogleAuth } from "google-auth-library";
import { pathToFileURL } from "node:url";
import { fetch, File, FormData, type Response } from "undici";

dotenv.config();

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_SUPPORTING_FILES = 5;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".md", ".txt"]);
const DEFAULT_ALLOWED_ORIGIN = "http://localhost:3000";
const DEFAULT_RUNTIME_URL = "http://127.0.0.1:8092";

interface UploadedPart {
  fieldname: "prd" | "supporting_files";
  filename: string;
  mimetype: string;
  data: Buffer;
}

interface BuildServerOptions {
  runtimeFetch?: typeof fetch;
  now?: () => Date;
}

interface DailyCounter {
  day: string;
  count: number;
}

function extension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function safeFilename(filename: string): string {
  return filename.split(/[\\/]/).pop() || "upload";
}

function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function runtimeHeaders(runtimeUrl: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = process.env.INTERNAL_SERVICE_TOKEN?.trim();
  if (token) headers["x-internal-service-token"] = token;
  if (process.env.USE_GOOGLE_IDENTITY_TOKEN === "true") {
    const audience = process.env.PRD_JUDGE_RUNTIME_AUDIENCE || runtimeUrl;
    const client = await new GoogleAuth().getIdTokenClient(audience);
    headers.authorization = `Bearer ${await client.idTokenProvider.fetchIdToken(audience)}`;
  }
  return headers;
}

async function runtimeHealth(runtimeFetch: typeof fetch): Promise<Response> {
  const runtimeUrl = process.env.PRD_JUDGE_RUNTIME_URL || DEFAULT_RUNTIME_URL;
  return runtimeFetch(`${runtimeUrl}/health`, {
    headers: await runtimeHeaders(runtimeUrl),
    signal: AbortSignal.timeout(5_000),
  });
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const runtimeFetch = options.runtimeFetch || fetch;
  const now = options.now || (() => new Date());
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.length) throw new Error("ALLOWED_ORIGIN must contain at least one origin");
  const dailyLimit = Number(process.env.DAILY_RUN_LIMIT || 100);
  const evaluationsEnabled = process.env.EVALUATIONS_ENABLED !== "false";
  const requestTimeoutMs = Number(process.env.EVALUATION_TIMEOUT_MS || 150_000);
  let daily: DailyCounter = { day: now().toISOString().slice(0, 10), count: 0 };

  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body",
          "res.body",
        ],
        censor: "[redacted]",
      },
    },
    bodyLimit: MAX_TOTAL_BYTES + 1024 * 1024,
    requestIdHeader: "x-request-id",
  });

  await server.register(cors, {
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
  });
  await server.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 5),
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  });
  await server.register(multipart, {
    limits: {
      files: 1 + MAX_SUPPORTING_FILES,
      fileSize: MAX_TOTAL_BYTES,
      fields: 2,
      parts: 8,
    },
  });

  server.addHook("onSend", async (_request, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    return payload;
  });

  const healthHandler = async (_request: unknown, reply: any) => {
    try {
      const response = await runtimeHealth(runtimeFetch);
      const runtime = (await response.json()) as Record<string, unknown>;
      return reply.status(response.ok && runtime.configured ? 200 : 503).send({
        status: response.ok && runtime.configured ? "ok" : "degraded",
        gateway: "ok",
        runtime,
      });
    } catch {
      return reply.status(503).send({
        status: "degraded",
        gateway: "ok",
        runtime: { status: "unreachable" },
      });
    }
  };
  server.get("/health", healthHandler);
  server.get("/api/health", healthHandler);

  server.post("/api/prd-judge/evaluate", async (request, reply) => {
    if (!evaluationsEnabled) {
      return reply.status(503).send({
        error: "PRD Judge is temporarily unavailable while the public beta is paused.",
        retryable: true,
      });
    }
    const today = now().toISOString().slice(0, 10);
    if (daily.day !== today) daily = { day: today, count: 0 };
    if (daily.count >= dailyLimit) {
      return reply.status(503).send({
        error: "The public beta has reached its daily evaluation limit. Try again tomorrow.",
        retryable: true,
      });
    }

    const uploads: UploadedPart[] = [];
    let pastedText = "";
    let pastedFieldCount = 0;
    let totalBytes = 0;
    try {
      for await (const part of request.parts()) {
        if (part.type === "field") {
          if (part.fieldname !== "prd_text") {
            return reply.status(400).send({ error: `Unexpected form field ${part.fieldname}` });
          }
          pastedFieldCount += 1;
          if (pastedFieldCount > 1) {
            return reply.status(400).send({ error: "Provide prd_text only once." });
          }
          pastedText = String(part.value || "");
          continue;
        }
        if (part.fieldname !== "prd" && part.fieldname !== "supporting_files") {
          await part.toBuffer();
          return reply.status(400).send({ error: `Unexpected file field ${part.fieldname}` });
        }
        const filename = safeFilename(part.filename);
        const fileExtension = extension(filename);
        if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
          await part.toBuffer();
          return reply.status(400).send({
            error: "Unsupported file type. Use PDF, DOCX, Markdown, or TXT; legacy .doc is not supported.",
          });
        }
        const data = await part.toBuffer();
        totalBytes += data.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES) {
          return reply.status(413).send({ error: "Combined uploads exceed the 25 MB limit." });
        }
        uploads.push({
          fieldname: part.fieldname,
          filename,
          mimetype: part.mimetype || "application/octet-stream",
          data,
        });
      }
    } catch (error) {
      request.log.warn({ errorType: error instanceof Error ? error.name : "unknown" }, "Upload rejected");
      return reply.status(400).send({ error: "The upload could not be read within the beta limits." });
    }

    const primaryFiles = uploads.filter((upload) => upload.fieldname === "prd");
    const supportingFiles = uploads.filter((upload) => upload.fieldname === "supporting_files");
    if ((primaryFiles.length === 1) === Boolean(pastedText.trim())) {
      return reply.status(400).send({ error: "Provide exactly one PRD file or pasted PRD text." });
    }
    if (primaryFiles.length > 1 || supportingFiles.length > MAX_SUPPORTING_FILES) {
      return reply.status(400).send({ error: "Provide one PRD and no more than five supporting files." });
    }
    if (pastedText.length > 250_000) {
      return reply.status(413).send({ error: "Pasted PRD text exceeds 250,000 characters." });
    }
    totalBytes += Buffer.byteLength(pastedText, "utf8");
    if (totalBytes > MAX_TOTAL_BYTES) {
      return reply.status(413).send({ error: "Combined uploads exceed the 25 MB limit." });
    }

    const runtimeUrl = process.env.PRD_JUDGE_RUNTIME_URL || DEFAULT_RUNTIME_URL;
    const form = new FormData();
    if (pastedText.trim()) form.append("prd_text", pastedText);
    for (const upload of uploads) {
      form.append(
        upload.fieldname,
        new File([upload.data], upload.filename, { type: upload.mimetype }),
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    reply.raw.once("close", () => {
      clearTimeout(timeout);
      controller.abort();
    });
    const startedAt = now().getTime();
    let upstream: Response;
    try {
      upstream = await runtimeFetch(`${runtimeUrl}/evaluate`, {
        method: "POST",
        body: form,
        headers: await runtimeHeaders(runtimeUrl),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      request.log.warn({ errorType: error instanceof Error ? error.name : "unknown" }, "Judge runtime unavailable or timed out");
      return reply.status(503).send({
        error: "The approved PRD Judge model is temporarily unavailable or took too long to respond.",
        retryable: true,
      });
    }

    if (!upstream.ok || !upstream.body) {
      clearTimeout(timeout);
      const payload = (await upstream.json().catch(() => ({}))) as { detail?: string };
      return reply.status(upstream.status || 502).send({
        error: payload.detail || "The PRD Judge runtime rejected the evaluation.",
        retryable: upstream.status >= 500,
      });
    }

    daily.count += 1;
    const requestOrigin = request.headers.origin;
    const responseOrigin = requestOrigin
      ? (allowedOrigins.includes(requestOrigin) ? requestOrigin : undefined)
      : allowedOrigins[0];
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      ...(responseOrigin ? { "Access-Control-Allow-Origin": responseOrigin, Vary: "Origin" } : {}),
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    });
    reply.raw.write(sse("progress", { phase: "uploading", message: "Upload received securely" }));

    try {
      const reader = upstream.body.getReader();
      let eventTail = "";
      let sawComplete = false;
      let sawError = false;
      while (!reply.raw.destroyed) {
        const { done, value } = await reader.read();
        if (done) break;
        const markerText = eventTail + Buffer.from(value).toString("utf8");
        sawComplete ||= markerText.includes("event: complete");
        sawError ||= markerText.includes("event: error");
        eventTail = markerText.slice(-64);
        reply.raw.write(Buffer.from(value));
      }
      if (!reply.raw.destroyed) reply.raw.end();
      clearTimeout(timeout);
      const eventFacts = {
        durationMs: now().getTime() - startedAt,
        primaryExtension: primaryFiles.length ? extension(primaryFiles[0].filename) : "paste",
        supportingFileCount: supportingFiles.length,
        totalBytes,
      };
      if (sawComplete && !sawError) {
        request.log.info(eventFacts, "Ephemeral PRD evaluation completed");
      } else {
        request.log.warn(eventFacts, "Ephemeral PRD evaluation failed before completion");
      }
    } catch (error) {
      clearTimeout(timeout);
      request.log.warn({ errorType: error instanceof Error ? error.name : "unknown" }, "Evaluation stream ended early");
      if (!reply.raw.destroyed) {
        reply.raw.write(
          sse("error", {
            code: "stream_failed",
            message: "The evaluation stream ended before a validated report was returned.",
            retryable: true,
          }),
        );
        reply.raw.end();
      }
    }
  });

  return server;
}

async function start(): Promise<void> {
  const server = await buildServer();
  await server.listen({ port: Number(process.env.PORT || 8080), host: "0.0.0.0" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch((error) => {
    process.stderr.write(`Failed to start API gateway: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
