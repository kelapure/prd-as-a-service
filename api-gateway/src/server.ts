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
import { hashString } from "./lib/util.js";

// Auth and payment routes
import { registerAuthRoutes } from "./routes/auth.js";
import { registerEvaluationRoutes } from "./routes/evaluations.js";
import { registerPaymentRoutes } from "./routes/payments.js";

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT = Number(process.env.PORT) || 8080;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3001";

// Create Fastify instance with body size limit
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  },
  bodyLimit: 100 * 1024 * 1024, // 100MB limit for large PRDs
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id'
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

// Register auth and payment routes
await registerAuthRoutes(fastify);
await registerEvaluationRoutes(fastify);
await registerPaymentRoutes(fastify);

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to safely write SSE error response
function writeSSEError(reply: any, requestId: string, error: any, endpoint: string): void {
  try {
    // Check if stream is already destroyed
    if (reply.raw.destroyed || reply.raw.closed) {
      logger.warn({ requestId, endpoint, error: error?.message }, "Cannot write SSE error: stream already destroyed");
      return;
    }

    if (!reply.raw.headersSent) {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true"
      });
    }
    const errorMessage = error?.message || String(error) || "Unknown error";
    reply.raw.write(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`);
    reply.raw.end();
  } catch (writeError: any) {
    logger.error({
      requestId,
      endpoint,
      writeError: writeError?.message,
      originalError: error?.message,
      streamDestroyed: reply.raw.destroyed,
      streamClosed: reply.raw.closed
    }, "Failed to write SSE error response");
    try {
      if (!reply.raw.destroyed && !reply.raw.closed) {
        reply.raw.end();
      }
    } catch {
      // Stream already closed, ignore
    }
  }
}

// Handle body parsing errors with raw body support for webhooks
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req: any, body, done) => {
  // Store raw body for webhook signature verification
  req.rawBody = body;
  try {
    const json = JSON.parse(body as string);
    done(null, json);
  } catch (err: any) {
    const requestId = generateRequestId();
    logger.error({
      requestId,
      endpoint: req.url,
      method: req.method,
      error: {
        message: err?.message,
        stack: err?.stack,
        name: err?.name
      }
    }, "JSON body parsing failed");
    done(err, undefined);
  }
});

// Global error handler for unhandled errors
fastify.setErrorHandler(async (error, request, reply) => {
  const requestId = request.id || generateRequestId();
  const endpoint = request.url || "unknown";
  const origin = request.headers.origin || "unknown";

  logger.error({
    requestId,
    endpoint,
    method: request.method,
    url: request.url,
    origin,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: (error as any).code,
      statusCode: (error as any).statusCode
    }
  }, "Unhandled error in Fastify");

  // If headers not sent and this is an SSE endpoint, try to send SSE error
  if (!reply.raw.headersSent && endpoint.includes("/api/evalprd/")) {
    writeSSEError(reply, requestId, error, endpoint);
  } else if (!reply.raw.headersSent) {
    reply.status(error.statusCode || 500).send({
      error: error.message || "Internal server error",
      requestId
    });
  }
});

// Streaming Routes using Server-Sent Events
fastify.post("/api/evalprd/binary_score", async (request, reply) => {
  const requestId = generateRequestId();
  const endpoint = "/api/evalprd/binary_score";
  const origin = request.headers.origin || "unknown";
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let clientDisconnected = false;
  let onClose: (() => void) | null = null;
  let onError: ((err: Error) => void) | null = null;

  try {
    // Log request metadata
    const bodySize = request.body ? JSON.stringify(request.body).length : 0;
    const bodyHash = request.body ? hashString(JSON.stringify(request.body)) : "none";
    
    logger.info({
      requestId,
      endpoint,
      method: request.method,
      origin,
      bodySize,
      bodyHash,
      contentType: request.headers["content-type"]
    }, "binary_score request received");

    // Validate request body exists
    if (!request.body) {
      logger.warn({ requestId, endpoint }, "Request body is null or undefined");
      return reply.status(400).send({ error: "Request body is required", requestId });
    }

    // Validate Content-Type
    const contentType = request.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      logger.warn({ requestId, endpoint, contentType }, "Invalid Content-Type");
      return reply.status(400).send({ error: "Content-Type must be application/json", requestId });
    }

    // Extract prd_text with type assertion
    const { prd_text } = request.body as { prd_text?: string };

    if (!prd_text) {
      logger.warn({ requestId, endpoint }, "prd_text is missing from request body");
      return reply.status(400).send({ error: "prd_text is required", requestId });
    }

    // Set SSE headers with error handling
    try {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "X-Accel-Buffering": "no"  // Disable nginx buffering (App Engine)
      });
      // Force headers to be sent immediately to bypass load balancer buffering
      if (typeof reply.raw.flushHeaders === 'function') {
        reply.raw.flushHeaders();
      }
    } catch (headerError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: headerError?.message,
          stack: headerError?.stack
        }
      }, "Failed to write SSE headers");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Track if client disconnected
    onClose = () => {
      clientDisconnected = true;
      logger.info({ requestId, endpoint }, "Client disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    onError = (err: Error) => {
      clientDisconnected = true;
      logger.warn({ requestId, endpoint, error: err?.message }, "Stream error, client likely disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    reply.raw.once("close", onClose);
    reply.raw.once("error", onError);

    // Send immediate "start" event to establish connection
    try {
      reply.raw.write(`data: {"type":"start"}\n\n`);
      logger.info({ requestId, endpoint }, "Sent initial start event");
    } catch (startError: any) {
      logger.error({ requestId, endpoint, error: startError?.message }, "Failed to send start event");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Send heartbeat every 5s as data events to keep connection alive
    // Reduced from 10s to ensure App Engine doesn't timeout long-running requests
    heartbeatInterval = setInterval(() => {
      try {
        if (!reply.raw.destroyed && !clientDisconnected) {
          reply.raw.write(`data: {"type":"heartbeat"}\n\n`);
        } else {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
        }
      } catch (heartbeatError: any) {
        logger.warn({ requestId, endpoint, error: heartbeatError?.message }, "Heartbeat write failed");
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    }, 5000);

    // Evaluate PRD
    logger.info({ requestId, endpoint }, "About to call evaluateBinaryScore");
    let progressCallCount = 0;
    let sseWriteSuccessCount = 0;
    let sseWriteSkipCount = 0;
    const result = await evaluateBinaryScore(
      { prd_text },
      (delta, accumulated) => {
        progressCallCount++;
        if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
          logger.info({
            requestId,
            endpoint,
            progressCallCount,
            deltaLength: delta.length,
            accumulatedLength: accumulated.length,
            streamDestroyed: reply.raw.destroyed,
            clientDisconnected
          }, "onProgress called");
        }
        try {
          if (!reply.raw.destroyed && !clientDisconnected) {
            // CRITICAL FIX: Only send delta, not accumulated, to avoid massive payloads
            // Frontend can accumulate deltas locally if needed
            const sseEvent = `data: ${JSON.stringify({ type: "delta", delta })}\n\n`;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseEventSize: sseEvent.length, accumulatedLength: accumulated.length }, "About to write SSE delta");
            }
            reply.raw.write(sseEvent);
            // Force socket flush to bypass App Engine buffering
            const socket = (reply.raw as any).socket || (reply.raw as any).connection;
            if (socket && typeof socket.uncork === 'function') {
              socket.cork();
              socket.uncork();
            }
            sseWriteSuccessCount++;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount }, "SSE delta written and flushed successfully");
            }
          } else {
            sseWriteSkipCount++;
            if (sseWriteSkipCount === 1 || sseWriteSkipCount % 100 === 0) {
              logger.warn({
                requestId,
                endpoint,
                progressCallCount,
                sseWriteSkipCount,
                destroyed: reply.raw.destroyed,
                disconnected: clientDisconnected
              }, "Skipped SSE write - stream destroyed or client disconnected");
            }
          }
        } catch (writeError: any) {
          logger.error({ requestId, endpoint, progressCallCount, error: writeError?.message, stack: writeError?.stack }, "Delta write failed with exception");
        }
      }
    );
    logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount, sseWriteSkipCount }, "evaluateBinaryScore completed");

    // Check if client disconnected during evaluation
    if (clientDisconnected || reply.raw.destroyed) {
      logger.warn({ requestId, endpoint }, "Client disconnected during evaluation, skipping final result");
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Try to send error event if stream is still writable
      try {
        if (!reply.raw.destroyed && !reply.raw.closed) {
          writeSSEError(reply, requestId, new Error("Client disconnected during evaluation"), endpoint);
        }
      } catch {
        // Stream already closed, ignore
      }
      return;
    }

    // Clear heartbeat and send final result
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Serialize result to JSON with error handling
    let resultJson: string;
    try {
      resultJson = JSON.stringify({ type: "done", result });
    } catch (stringifyError: any) {
      // Try to get result size for logging (might fail if result has circular refs)
      let resultSize = 0;
      try {
        resultSize = result ? JSON.stringify(result).length : 0;
      } catch {
        resultSize = -1; // Indicates we couldn't measure size
      }
      
      logger.error({
        requestId,
        endpoint,
        error: {
          message: stringifyError?.message,
          stack: stringifyError?.stack,
          name: stringifyError?.name
        },
        resultSize
      }, "Failed to stringify result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, new Error(`Failed to serialize result: ${stringifyError?.message || "Unknown error"}`), endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
      return;
    }

    // Write final result with error handling
    try {
      // Clean up listeners
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);

      if (!reply.raw.destroyed && !clientDisconnected) {
        reply.raw.write(`data: ${resultJson}\n\n`);
        reply.raw.end();
        logger.info({ requestId, endpoint }, "binary_score request completed successfully");
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Stream already destroyed or client disconnected, cannot write final result");
        // Try to end stream safely even if destroyed
        try {
          if (!reply.raw.destroyed && !reply.raw.closed) {
            reply.raw.end();
          }
        } catch {
          // Stream already closed, ignore
        }
      }
    } catch (writeError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: writeError?.message,
          stack: writeError?.stack,
          name: writeError?.name
        }
      }, "Failed to write final result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, writeError, endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
    }

  } catch (error: any) {
    // Clear heartbeat if set
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Clean up listeners if they were set
    try {
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
    } catch {
      // Listeners might not have been set if error occurred early
    }

    // Log full error details
    logger.error({
      requestId,
      endpoint,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: (error as any)?.code,
        statusCode: (error as any)?.statusCode
      }
    }, "binary_score streaming failed");

    // Write SSE error response only if stream is not destroyed
    if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
      writeSSEError(reply, requestId, error, endpoint);
    } else {
      logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
    }
  }
});

fastify.post("/api/evalprd/fix_plan", async (request, reply) => {
  const requestId = generateRequestId();
  const endpoint = "/api/evalprd/fix_plan";
  const origin = request.headers.origin || "unknown";
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let clientDisconnected = false;
  let onClose: (() => void) | null = null;
  let onError: ((err: Error) => void) | null = null;

  try {
    // Log request metadata
    const bodySize = request.body ? JSON.stringify(request.body).length : 0;
    const bodyHash = request.body ? hashString(JSON.stringify(request.body)) : "none";
    
    logger.info({
      requestId,
      endpoint,
      method: request.method,
      origin,
      bodySize,
      bodyHash,
      contentType: request.headers["content-type"]
    }, "fix_plan request received");

    // Validate request body exists
    if (!request.body) {
      logger.warn({ requestId, endpoint }, "Request body is null or undefined");
      return reply.status(400).send({ error: "Request body is required", requestId });
    }

    // Validate Content-Type
    const contentType = request.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      logger.warn({ requestId, endpoint, contentType }, "Invalid Content-Type");
      return reply.status(400).send({ error: "Content-Type must be application/json", requestId });
    }

    // Extract prd_text with type assertion
    const { prd_text } = request.body as { prd_text?: string };

    if (!prd_text) {
      logger.warn({ requestId, endpoint }, "prd_text is missing from request body");
      return reply.status(400).send({ error: "prd_text is required", requestId });
    }

    // Set SSE headers with error handling
    try {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "X-Accel-Buffering": "no"  // Disable nginx buffering (App Engine)
      });
      // Force headers to be sent immediately to bypass load balancer buffering
      if (typeof reply.raw.flushHeaders === 'function') {
        reply.raw.flushHeaders();
      }
    } catch (headerError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: headerError?.message,
          stack: headerError?.stack
        }
      }, "Failed to write SSE headers");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Track if client disconnected
    onClose = () => {
      clientDisconnected = true;
      logger.info({ requestId, endpoint }, "Client disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    onError = (err: Error) => {
      clientDisconnected = true;
      logger.warn({ requestId, endpoint, error: err?.message }, "Stream error, client likely disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    reply.raw.once("close", onClose);
    reply.raw.once("error", onError);

    // Send immediate "start" event to establish connection
    try {
      reply.raw.write(`data: {"type":"start"}\n\n`);
      logger.info({ requestId, endpoint }, "Sent initial start event");
    } catch (startError: any) {
      logger.error({ requestId, endpoint, error: startError?.message }, "Failed to send start event");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Send heartbeat every 5s as data events to keep connection alive
    // Reduced from 10s to ensure App Engine doesn't timeout long-running requests
    heartbeatInterval = setInterval(() => {
      try {
        if (!reply.raw.destroyed && !clientDisconnected) {
          reply.raw.write(`data: {"type":"heartbeat"}\n\n`);
        } else {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
        }
      } catch (heartbeatError: any) {
        logger.warn({ requestId, endpoint, error: heartbeatError?.message }, "Heartbeat write failed");
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    }, 5000);

    // Evaluate PRD
    logger.info({ requestId, endpoint }, "About to call evaluateFixPlan");
    let progressCallCount = 0;
    let sseWriteSuccessCount = 0;
    let sseWriteSkipCount = 0;
    const result = await evaluateFixPlan(
      { prd_text },
      (delta, accumulated) => {
        progressCallCount++;
        if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
          logger.info({
            requestId,
            endpoint,
            progressCallCount,
            deltaLength: delta.length,
            accumulatedLength: accumulated.length,
            streamDestroyed: reply.raw.destroyed,
            clientDisconnected
          }, "onProgress called");
        }
        try {
          if (!reply.raw.destroyed && !clientDisconnected) {
            // CRITICAL FIX: Only send delta, not accumulated, to avoid massive payloads
            // Frontend can accumulate deltas locally if needed
            const sseEvent = `data: ${JSON.stringify({ type: "delta", delta })}\n\n`;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseEventSize: sseEvent.length, accumulatedLength: accumulated.length }, "About to write SSE delta");
            }
            reply.raw.write(sseEvent);
            // Force socket flush to bypass App Engine buffering
            const socket = (reply.raw as any).socket || (reply.raw as any).connection;
            if (socket && typeof socket.uncork === 'function') {
              socket.cork();
              socket.uncork();
            }
            sseWriteSuccessCount++;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount }, "SSE delta written and flushed successfully");
            }
          } else {
            sseWriteSkipCount++;
            if (sseWriteSkipCount === 1 || sseWriteSkipCount % 100 === 0) {
              logger.warn({
                requestId,
                endpoint,
                progressCallCount,
                sseWriteSkipCount,
                destroyed: reply.raw.destroyed,
                disconnected: clientDisconnected
              }, "Skipped SSE write - stream destroyed or client disconnected");
            }
          }
        } catch (writeError: any) {
          logger.error({ requestId, endpoint, progressCallCount, error: writeError?.message, stack: writeError?.stack }, "Delta write failed with exception");
        }
      }
    );
    logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount, sseWriteSkipCount }, "evaluateFixPlan completed");

    // Check if client disconnected during evaluation
    if (clientDisconnected || reply.raw.destroyed) {
      logger.warn({ requestId, endpoint }, "Client disconnected during evaluation, skipping final result");
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Try to send error event if stream is still writable
      try {
        if (!reply.raw.destroyed && !reply.raw.closed) {
          writeSSEError(reply, requestId, new Error("Client disconnected during evaluation"), endpoint);
        }
      } catch {
        // Stream already closed, ignore
      }
      return;
    }

    // Clear heartbeat and send final result
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Serialize result to JSON with error handling
    let resultJson: string;
    try {
      resultJson = JSON.stringify({ type: "done", result });
    } catch (stringifyError: any) {
      // Try to get result size for logging (might fail if result has circular refs)
      let resultSize = 0;
      try {
        resultSize = result ? JSON.stringify(result).length : 0;
      } catch {
        resultSize = -1; // Indicates we couldn't measure size
      }
      
      logger.error({
        requestId,
        endpoint,
        error: {
          message: stringifyError?.message,
          stack: stringifyError?.stack,
          name: stringifyError?.name
        },
        resultSize
      }, "Failed to stringify result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, new Error(`Failed to serialize result: ${stringifyError?.message || "Unknown error"}`), endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
      return;
    }

    // Write final result with error handling
    try {
      // Clean up listeners
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);

      if (!reply.raw.destroyed && !clientDisconnected) {
        reply.raw.write(`data: ${resultJson}\n\n`);
        reply.raw.end();
        logger.info({ requestId, endpoint }, "fix_plan request completed successfully");
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Stream already destroyed or client disconnected, cannot write final result");
        // Try to end stream safely even if destroyed
        try {
          if (!reply.raw.destroyed && !reply.raw.closed) {
            reply.raw.end();
          }
        } catch {
          // Stream already closed, ignore
        }
      }
    } catch (writeError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: writeError?.message,
          stack: writeError?.stack,
          name: writeError?.name
        }
      }, "Failed to write final result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, writeError, endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
    }

  } catch (error: any) {
    // Clear heartbeat if set
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Clean up listeners if they were set
    try {
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
    } catch {
      // Listeners might not have been set if error occurred early
    }

    // Log full error details
    logger.error({
      requestId,
      endpoint,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: (error as any)?.code,
        statusCode: (error as any)?.statusCode
      }
    }, "fix_plan streaming failed");

    // Write SSE error response only if stream is not destroyed
    if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
      writeSSEError(reply, requestId, error, endpoint);
    } else {
      logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
    }
  }
});

fastify.post("/api/evalprd/agent_tasks", async (request, reply) => {
  const requestId = generateRequestId();
  const endpoint = "/api/evalprd/agent_tasks";
  const origin = request.headers.origin || "unknown";
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let clientDisconnected = false;
  let onClose: (() => void) | null = null;
  let onError: ((err: Error) => void) | null = null;

  try {
    // Log request metadata
    const bodySize = request.body ? JSON.stringify(request.body).length : 0;
    const bodyHash = request.body ? hashString(JSON.stringify(request.body)) : "none";
    
    logger.info({
      requestId,
      endpoint,
      method: request.method,
      origin,
      bodySize,
      bodyHash,
      contentType: request.headers["content-type"]
    }, "agent_tasks request received");

    // Validate request body exists
    if (!request.body) {
      logger.warn({ requestId, endpoint }, "Request body is null or undefined");
      return reply.status(400).send({ error: "Request body is required", requestId });
    }

    // Validate Content-Type
    const contentType = request.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      logger.warn({ requestId, endpoint, contentType }, "Invalid Content-Type");
      return reply.status(400).send({ error: "Content-Type must be application/json", requestId });
    }

    // Extract prd_text with type assertion
    const { prd_text } = request.body as { prd_text?: string };

    if (!prd_text) {
      logger.warn({ requestId, endpoint }, "prd_text is missing from request body");
      return reply.status(400).send({ error: "prd_text is required", requestId });
    }

    // Set SSE headers with error handling
    try {
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
        "X-Accel-Buffering": "no"  // Disable nginx buffering (App Engine)
      });
      // Force headers to be sent immediately to bypass load balancer buffering
      if (typeof reply.raw.flushHeaders === 'function') {
        reply.raw.flushHeaders();
      }
    } catch (headerError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: headerError?.message,
          stack: headerError?.stack
        }
      }, "Failed to write SSE headers");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Track if client disconnected
    onClose = () => {
      clientDisconnected = true;
      logger.info({ requestId, endpoint }, "Client disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    onError = (err: Error) => {
      clientDisconnected = true;
      logger.warn({ requestId, endpoint, error: err?.message }, "Stream error, client likely disconnected");
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    reply.raw.once("close", onClose);
    reply.raw.once("error", onError);

    // Send immediate "start" event to establish connection
    try {
      reply.raw.write(`data: {"type":"start"}\n\n`);
      logger.info({ requestId, endpoint }, "Sent initial start event");
    } catch (startError: any) {
      logger.error({ requestId, endpoint, error: startError?.message }, "Failed to send start event");
      return reply.status(500).send({ error: "Failed to initialize stream", requestId });
    }

    // Send heartbeat every 5s as data events to keep connection alive
    // Reduced from 10s to ensure App Engine doesn't timeout long-running requests
    heartbeatInterval = setInterval(() => {
      try {
        if (!reply.raw.destroyed && !clientDisconnected) {
          reply.raw.write(`data: {"type":"heartbeat"}\n\n`);
        } else {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
        }
      } catch (heartbeatError: any) {
        logger.warn({ requestId, endpoint, error: heartbeatError?.message }, "Heartbeat write failed");
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    }, 5000);

    // Evaluate PRD
    logger.info({ requestId, endpoint }, "About to call evaluateAgentTasks");
    let progressCallCount = 0;
    let sseWriteSuccessCount = 0;
    let sseWriteSkipCount = 0;
    const result = await evaluateAgentTasks(
      { prd_text },
      (delta, accumulated) => {
        progressCallCount++;
        if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
          logger.info({
            requestId,
            endpoint,
            progressCallCount,
            deltaLength: delta.length,
            accumulatedLength: accumulated.length,
            streamDestroyed: reply.raw.destroyed,
            clientDisconnected
          }, "onProgress called");
        }
        try {
          if (!reply.raw.destroyed && !clientDisconnected) {
            // CRITICAL FIX: Only send delta, not accumulated, to avoid massive payloads (60KB+ for agent_tasks)
            // Frontend can accumulate deltas locally if needed
            const sseEvent = `data: ${JSON.stringify({ type: "delta", delta })}\n\n`;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseEventSize: sseEvent.length, accumulatedLength: accumulated.length }, "About to write SSE delta");
            }
            reply.raw.write(sseEvent);
            // Force socket flush to bypass App Engine buffering
            const socket = (reply.raw as any).socket || (reply.raw as any).connection;
            if (socket && typeof socket.uncork === 'function') {
              socket.cork();
              socket.uncork();
            }
            sseWriteSuccessCount++;
            if (progressCallCount <= 5 || progressCallCount % 100 === 0) {
              logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount }, "SSE delta written and flushed successfully");
            }
          } else {
            sseWriteSkipCount++;
            if (sseWriteSkipCount === 1 || sseWriteSkipCount % 100 === 0) {
              logger.warn({
                requestId,
                endpoint,
                progressCallCount,
                sseWriteSkipCount,
                destroyed: reply.raw.destroyed,
                disconnected: clientDisconnected
              }, "Skipped SSE write - stream destroyed or client disconnected");
            }
          }
        } catch (writeError: any) {
          logger.error({ requestId, endpoint, progressCallCount, error: writeError?.message, stack: writeError?.stack }, "Delta write failed with exception");
        }
      }
    );
    logger.info({ requestId, endpoint, progressCallCount, sseWriteSuccessCount, sseWriteSkipCount }, "evaluateAgentTasks completed");

    // Check if client disconnected during evaluation
    if (clientDisconnected || reply.raw.destroyed) {
      logger.warn({ requestId, endpoint }, "Client disconnected during evaluation, skipping final result");
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Try to send error event if stream is still writable
      try {
        if (!reply.raw.destroyed && !reply.raw.closed) {
          writeSSEError(reply, requestId, new Error("Client disconnected during evaluation"), endpoint);
        }
      } catch {
        // Stream already closed, ignore
      }
      return;
    }

    // Clear heartbeat and send final result
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Serialize result to JSON with error handling
    let resultJson: string;
    try {
      resultJson = JSON.stringify({ type: "done", result });
    } catch (stringifyError: any) {
      // Try to get result size for logging (might fail if result has circular refs)
      let resultSize = 0;
      try {
        resultSize = result ? JSON.stringify(result).length : 0;
      } catch {
        resultSize = -1; // Indicates we couldn't measure size
      }
      
      logger.error({
        requestId,
        endpoint,
        error: {
          message: stringifyError?.message,
          stack: stringifyError?.stack,
          name: stringifyError?.name
        },
        resultSize
      }, "Failed to stringify result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, new Error(`Failed to serialize result: ${stringifyError?.message || "Unknown error"}`), endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
      return;
    }

    // Write final result with error handling
    try {
      // Clean up listeners
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);

      if (!reply.raw.destroyed && !clientDisconnected) {
        reply.raw.write(`data: ${resultJson}\n\n`);
        reply.raw.end();
        logger.info({ requestId, endpoint }, "agent_tasks request completed successfully");
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Stream already destroyed or client disconnected, cannot write final result");
        // Don't call writeSSEError if stream is destroyed - it will fail anyway
      }
    } catch (writeError: any) {
      logger.error({
        requestId,
        endpoint,
        error: {
          message: writeError?.message,
          stack: writeError?.stack,
          name: writeError?.name
        }
      }, "Failed to write final result");
      // Clean up listeners before trying to write error
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
      // Only write error if stream is not destroyed
      if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
        writeSSEError(reply, requestId, writeError, endpoint);
      } else {
        logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
      }
    }

  } catch (error: any) {
    // Clear heartbeat if set
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    // Clean up listeners if they were set
    try {
      if (onClose) reply.raw.removeListener("close", onClose);
      if (onError) reply.raw.removeListener("error", onError);
    } catch {
      // Listeners might not have been set if error occurred early
    }

    // Log full error details
    logger.error({
      requestId,
      endpoint,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: (error as any)?.code,
        statusCode: (error as any)?.statusCode
      }
    }, "agent_tasks streaming failed");

    // Write SSE error response only if stream is not destroyed
    if (!reply.raw.destroyed && !reply.raw.closed && !clientDisconnected) {
      writeSSEError(reply, requestId, error, endpoint);
    } else {
      logger.warn({ requestId, endpoint, clientDisconnected, streamDestroyed: reply.raw.destroyed }, "Skipping SSE error write: stream already destroyed or client disconnected");
    }
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
