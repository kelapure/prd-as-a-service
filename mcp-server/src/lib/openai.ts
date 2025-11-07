// OpenAI Responses API wrapper with structured outputs

import OpenAI from "openai";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: Number(process.env.OPENAI_MAX_RETRIES) || 1,
  timeout: Number(process.env.REQUEST_TIMEOUT_MS) || 180000
});

export interface StructuredCallOptions {
  model: string;
  system: string;
  user: string;
  outputSchema: any;
  temperature?: number;
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
  }, "Starting OpenAI structured call");

  try {
    const response = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "evalprd_output",
          strict: true,
          schema: outputSchema
        }
      }
    });

    const latency = Date.now() - startTime;
    const usage = response.usage;

    logger.info({
      requestId,
      latency,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens
    }, "OpenAI structured call completed");

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      logger.error({ requestId, content, parseError }, "Failed to parse JSON response");
      throw new Error(`Invalid JSON from OpenAI: ${parseError}`);
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error({
      requestId,
      latency,
      error: error.message,
      errorType: error.constructor.name,
      statusCode: error.status
    }, "OpenAI structured call failed");

    // Re-throw with more context
    if (error.status === 429) {
      throw new Error("OpenAI rate limit exceeded");
    } else if (error.status >= 500) {
      throw new Error(`OpenAI server error: ${error.status}`);
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("OpenAI authentication failed");
    } else {
      throw new Error(`OpenAI call failed: ${error.message}`);
    }
  }
}
