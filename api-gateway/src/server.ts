// API Gateway - HTTP endpoints for EvalPRD evaluation tools

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import pino from "pino";
import dotenv from "dotenv";

// Direct evaluation imports
import { evaluateBinaryScore } from "./evaluators/binaryScore.js";
import { evaluateFixPlan } from "./evaluators/fixPlan.js";
import { evaluateAgentTasks } from "./evaluators/agentTasks.js";

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3001";

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});

// Register CORS with additional headers for SSE
await fastify.register(cors, {
  origin: ALLOWED_ORIGIN,
  credentials: true,
  exposedHeaders: ["Content-Type", "Cache-Control", "Connection"]
});

// Register rate limiting
await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 60,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000
});

// Streaming Routes using Server-Sent Events
fastify.post("/api/evalprd/binary_score", async (request, reply) => {
  const { prd_text } = request.body as { prd_text?: string };

  if (!prd_text) {
    return reply.status(400).send({ error: "prd_text is required" });
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true"
  });

  try {
    const result = await evaluateBinaryScore(
      { prd_text },
      (delta, accumulated) => {
        reply.raw.write(`data: ${JSON.stringify({ type: "delta", delta, accumulated: accumulated.length })}\n\n`);
      }
    );

    reply.raw.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
    reply.raw.end();
  } catch (error: any) {
    logger.error({ error: error.message }, "binary_score streaming failed");
    reply.raw.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    reply.raw.end();
  }
});

fastify.post("/api/evalprd/fix_plan", async (request, reply) => {
  const { prd_text } = request.body as { prd_text?: string };

  if (!prd_text) {
    return reply.status(400).send({ error: "prd_text is required" });
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true"
  });

  try {
    const result = await evaluateFixPlan(
      { prd_text },
      (delta, accumulated) => {
        reply.raw.write(`data: ${JSON.stringify({ type: "delta", delta, accumulated: accumulated.length })}\n\n`);
      }
    );

    reply.raw.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
    reply.raw.end();
  } catch (error: any) {
    logger.error({ error: error.message }, "fix_plan streaming failed");
    reply.raw.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    reply.raw.end();
  }
});

fastify.post("/api/evalprd/agent_tasks", async (request, reply) => {
  const { prd_text } = request.body as { prd_text?: string };

  if (!prd_text) {
    return reply.status(400).send({ error: "prd_text is required" });
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true"
  });

  try {
    const result = await evaluateAgentTasks(
      { prd_text },
      (delta, accumulated) => {
        reply.raw.write(`data: ${JSON.stringify({ type: "delta", delta, accumulated: accumulated.length })}\n\n`);
      }
    );

    reply.raw.write(`data: ${JSON.stringify({ type: "done", result })}\n\n`);
    reply.raw.end();
  } catch (error: any) {
    logger.error({ error: error.message }, "agent_tasks streaming failed");
    reply.raw.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    reply.raw.end();
  }
});

// Health check
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    logger.info({ port: PORT }, "API Gateway started");
  } catch (error) {
    logger.error({ error }, "Failed to start API Gateway");
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await fastify.close();
  process.exit(0);
});

start();
