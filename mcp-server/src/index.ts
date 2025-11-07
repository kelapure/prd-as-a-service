#!/usr/bin/env node

// MCP Server Bootstrap - Registers tools and starts HTTP server

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pino from "pino";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import tools
import binaryScoreTool from "./tools/binary_score.js";
import fixPlanTool from "./tools/fix_plan.js";
import agentTasksTool from "./tools/agent_tasks.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  logger.error("OPENAI_API_KEY is required");
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: "evalprd-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
const tools = [binaryScoreTool, fixPlanTool, agentTasksTool];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info({ toolName: name }, "Tool call received");

  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    const result = await tool.handler((args || {}) as any);
    logger.info({ toolName: name }, "Tool call completed");
    return result;
  } catch (error: any) {
    logger.error({ toolName: name, error: error.message }, "Tool call failed");
    throw error;
  }
});

// Error handler
server.onerror = (error) => {
  logger.error({ error }, "Server error");
};

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started on stdio transport");
}

main().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
