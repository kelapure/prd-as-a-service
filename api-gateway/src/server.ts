// API Gateway - HTTP endpoints for EvalPRD MCP tools

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import pino from "pino";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const MCP_SERVER_COMMAND = process.env.MCP_SERVER_COMMAND || "node";
const MCP_SERVER_ARGS = process.env.MCP_SERVER_ARGS?.split(" ") || ["../mcp-server/dist/index.js"];

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});

// Register CORS
await fastify.register(cors, {
  origin: ALLOWED_ORIGIN,
  credentials: true
});

// Register rate limiting
await fastify.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 60,
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000
});

// MCP Client connection
let mcpClient: Client | null = null;

async function connectToMCP() {
  logger.info({ command: MCP_SERVER_COMMAND, args: MCP_SERVER_ARGS }, "Connecting to MCP server");

  const transport = new StdioClientTransport({
    command: MCP_SERVER_COMMAND,
    args: MCP_SERVER_ARGS,
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      EVALPRD_MODEL: process.env.EVALPRD_MODEL || "gpt-4o",
      LOG_LEVEL: process.env.LOG_LEVEL || "info"
    }
  });

  const client = new Client({
    name: "evalprd-api-gateway",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  logger.info("Connected to MCP server");

  return client;
}

// Tool endpoint handler
async function callTool(toolName: string, args: any) {
  if (!mcpClient) {
    throw new Error("MCP client not connected");
  }

  const startTime = Date.now();

  try {
    const result = await mcpClient.callTool(
      {
        name: toolName,
        arguments: args
      },
      undefined,
      {
        timeout: 180000  // 180 seconds (3 minutes) for GPT-5 processing
      }
    );

    const latency = Date.now() - startTime;
    logger.info({ toolName, latency }, "Tool call completed");

    // Extract JSON from result
    if (result.content && Array.isArray(result.content) && result.content.length > 0) {
      const textContent = result.content.find((c: any) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text);
      }
    }

    throw new Error("No valid content in tool response");
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error({ toolName, latency, error: error.message }, "Tool call failed");
    throw error;
  }
}

// Routes
fastify.post("/api/evalprd/binary_score", async (request, reply) => {
  try {
    const result = await callTool("binary_score", request.body);
    return reply.send(result);
  } catch (error: any) {
    logger.error({ error: error.message }, "binary_score endpoint failed");
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post("/api/evalprd/fix_plan", async (request, reply) => {
  try {
    const result = await callTool("fix_plan", request.body);
    return reply.send(result);
  } catch (error: any) {
    logger.error({ error: error.message }, "fix_plan endpoint failed");
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post("/api/evalprd/agent_tasks", async (request, reply) => {
  try {
    const result = await callTool("agent_tasks", request.body);
    return reply.send(result);
  } catch (error: any) {
    logger.error({ error: error.message }, "agent_tasks endpoint failed");
    return reply.status(500).send({ error: error.message });
  }
});

// Health check
fastify.get("/health", async (request, reply) => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Start server
async function start() {
  try {
    // Connect to MCP server
    mcpClient = await connectToMCP();

    // Start Fastify
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
  if (mcpClient) {
    await mcpClient.close();
  }
  process.exit(0);
});

start();
