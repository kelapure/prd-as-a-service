FROM node:20-alpine AS base
WORKDIR /app

# Copy API Gateway
COPY api-gateway/package*.json api-gateway/tsconfig.json /app/api-gateway/
COPY api-gateway/src /app/api-gateway/src

# Copy MCP Server
COPY mcp-server/package*.json mcp-server/tsconfig.json /app/mcp-server/
COPY mcp-server/src /app/mcp-server/src

# Install and build MCP Server
RUN cd /app/mcp-server \
  && npm ci \
  && npm run build

# Install and build API Gateway
RUN cd /app/api-gateway \
  && npm ci \
  && npm run build

ENV NODE_ENV=production
EXPOSE 8080

# Start API (spawns MCP via stdio using relative ../mcp-server/dist path)
CMD ["node", "/app/api-gateway/dist/server.js"]
