// Anthropic Claude API wrapper with structured outputs
// https://www.claude.com/blog/structured-outputs-on-the-claude-developer-platform

import Anthropic from "@anthropic-ai/sdk";
import pino from "pino";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

if (!process.env.ANTHROPIC_API_KEY) {
  logger.fatal("ANTHROPIC_API_KEY environment variable is not set");
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: Number(process.env.ANTHROPIC_MAX_RETRIES) || 1,
  timeout: Number(process.env.REQUEST_TIMEOUT_MS) || 180000,
  defaultHeaders: {
    "anthropic-beta": "structured-outputs-2025-11-13"
  }
});

logger.info("Anthropic client initialized successfully");

export interface StructuredCallOptions {
  model: string;
  system: string;
  user: string;
  outputSchema: any;
  temperature?: number;
}

export interface StreamingCallOptions {
  model: string;
  system: string;
  user: string;
  outputSchema: any;
  temperature?: number;
  onProgress?: (delta: string, accumulated: string) => void;
}

export async function callStructured(options: StructuredCallOptions): Promise<any> {
  const { model, system, user, outputSchema, temperature = 0.2 } = options;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  logger.info({
    requestId,
    model,
    temperature,
    userMessageLength: user.length
  }, "Starting Claude structured call");

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      temperature,
      system,
      messages: [
        { role: "user", content: user }
      ],
      // Claude structured outputs (beta feature - requires anthropic-beta header)
      output_format: {
        type: "json_schema",
        schema: outputSchema
      }
    } as any);

    const latency = Date.now() - startTime;
    const usage = response.usage;

    logger.info({
      requestId,
      latency,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens
    }, "Claude structured call completed");

    // Extract text content from Claude response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected content type from Claude");
    }

    try {
      return JSON.parse(content.text);
    } catch (parseError) {
      logger.error({ requestId, content: content.text, parseError }, "Failed to parse JSON response");
      throw new Error(`Invalid JSON from Claude: ${parseError}`);
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error({
      requestId,
      latency,
      error: error.message,
      errorType: error.constructor.name,
      statusCode: error.status
    }, "Claude structured call failed");

    // Re-throw with more context
    if (error.status === 429) {
      throw new Error("Claude rate limit exceeded");
    } else if (error.status >= 500) {
      throw new Error(`Claude server error: ${error.status}`);
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Claude authentication failed");
    } else {
      throw new Error(`Claude call failed: ${error.message}`);
    }
  }
}

export async function callStructuredStream(options: StreamingCallOptions): Promise<any> {
  const { model, system, user, outputSchema, temperature = 0.2, onProgress } = options;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  logger.info({
    requestId,
    model,
    temperature,
    userMessageLength: user.length
  }, "Starting Claude streaming structured call");

  let accumulated = "";

  try {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 16000,
      temperature,
      system,
      messages: [
        { role: "user", content: user }
      ],
      // Claude structured outputs with streaming (beta feature - requires anthropic-beta header)
      output_format: {
        type: "json_schema",
        schema: outputSchema
      }
    } as any);

    let usage: any = null;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta.type === 'text_delta' ? event.delta.text : "";
        if (delta) {
          accumulated += delta;
          if (onProgress) {
            onProgress(delta, accumulated);
          }
        }
      } else if (event.type === 'message_delta') {
        // Capture usage stats
        if (event.usage) {
          usage = event.usage;
        }
      }
    }

    const latency = Date.now() - startTime;

    logger.info({
      requestId,
      latency,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens
    }, "Claude streaming structured call completed");

    if (!accumulated) {
      throw new Error("No content in streaming response");
    }

    try {
      return JSON.parse(accumulated);
    } catch (parseError) {
      logger.error({ requestId, accumulated, parseError }, "Failed to parse JSON response");
      throw new Error(`Invalid JSON from Claude: ${parseError}`);
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error({
      requestId,
      latency,
      error: error.message,
      errorType: error.constructor.name,
      statusCode: error.status
    }, "Claude streaming call failed");

    // Re-throw with more context
    if (error.status === 429) {
      throw new Error("Claude rate limit exceeded");
    } else if (error.status >= 500) {
      throw new Error(`Claude server error: ${error.status}`);
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Claude authentication failed");
    } else {
      throw new Error(`Claude call failed: ${error.message}`);
    }
  }
}

