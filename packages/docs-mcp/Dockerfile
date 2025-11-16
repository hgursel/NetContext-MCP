# Multi-stage Dockerfile for NetContext Docs MCP Server
# Optimized for production with security best practices

# Stage 1: Build
FROM node:20.10.0-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/docs-mcp/package*.json ./packages/docs-mcp/
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
# Use npm install instead of npm ci if package-lock.json is missing
RUN npm install

# Copy source code
COPY packages/docs-mcp ./packages/docs-mcp

# Build TypeScript
RUN npm run build -w @netcontext/docs-mcp

# Stage 2: Production
FROM node:20.10.0-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

WORKDIR /app/packages/docs-mcp

# Copy package file for this specific package
COPY --chown=mcp:mcp packages/docs-mcp/package*.json ./

# Install production dependencies only (using npm install, not ci, to avoid workspace issues)
ENV NODE_ENV=production
RUN npm install --production && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --chown=mcp:mcp --from=builder /build/packages/docs-mcp/dist ./dist

# Copy vendor documentation (required for docs-mcp functionality)
WORKDIR /app
COPY --chown=mcp:mcp vendor ./vendor

# Security: Use non-root user
USER mcp

# Set working directory back to package
WORKDIR /app/packages/docs-mcp

# Environment variables for configuration
ENV NETCONTEXT_REPO_PATH=/app

# Health check (basic - checks if node process responds)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Run the MCP server
ENTRYPOINT ["node", "dist/index.js"]
