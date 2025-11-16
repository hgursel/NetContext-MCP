# Multi-stage Dockerfile for NetContext Network MCP Server
# Optimized for production with security best practices

# Stage 1: Build
FROM node:20.10.0-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/network-mcp/package*.json ./packages/network-mcp/
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
# Use npm install instead of npm ci if package-lock.json is missing
RUN npm install

# Copy source code
COPY packages/network-mcp ./packages/network-mcp

# Build TypeScript
RUN npm run build -w @netcontext/network-mcp

# Stage 2: Production
FROM node:20.10.0-alpine AS production

# Install OpenSSH client for SSH2 library
RUN apk add --no-cache openssh-client

# Security: Run as non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

# Create directory for SSH keys (to be mounted as volume)
RUN mkdir -p /home/mcp/.ssh && \
    chown -R mcp:mcp /home/mcp/.ssh && \
    chmod 700 /home/mcp/.ssh

WORKDIR /app/packages/network-mcp

# Copy package file for this specific package
COPY --chown=mcp:mcp packages/network-mcp/package*.json ./

# Install production dependencies only (using npm install, not ci, to avoid workspace issues)
ENV NODE_ENV=production
RUN npm install --production && \
    npm cache clean --force

# Copy built artifacts from builder
COPY --chown=mcp:mcp --from=builder /build/packages/network-mcp/dist ./dist

# Security: Use non-root user
USER mcp

# Environment variables for configuration
ENV DEVICE_USERNAME=admin \
    DEVICE_PORT=22 \
    SSH_TIMEOUT=10000 \
    SSH_VERIFY_HOST_KEY=false

# Health check (basic - checks if node process responds)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)"

# Run the MCP server
ENTRYPOINT ["node", "dist/index.js"]
