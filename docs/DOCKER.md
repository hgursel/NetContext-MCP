# Docker Deployment Guide

Complete guide for deploying NetContext MCP servers using Docker.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Building Images](#building-images)
- [Running Containers](#running-containers)
- [Configuration](#configuration)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- docker-compose 1.29+ (optional, for multi-container setup)
- SSH keys for network device access

### Basic Usage

```bash
# 1. Clone and navigate to the repository
cd /path/to/NetContext/MCP

# 2. Build both MCP servers
docker-compose build

# 3. Configure environment (copy and edit)
cp .env.docker.example .env

# 4. Run the services
docker-compose up -d

# 5. Check status
docker-compose ps
docker-compose logs -f
```

---

## Architecture

### Multi-Stage Build Design

Both MCP servers use optimized multi-stage builds:

```
┌─────────────────────────────────────────────┐
│ Stage 1: Builder (node:20.10.0-alpine)      │
│ - Install build dependencies                │
│ - Compile TypeScript                        │
│ - Generate dist/ artifacts                  │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ Stage 2: Production (node:20.10.0-alpine)   │
│ - Copy only dist/ and dependencies          │
│ - Run as non-root user (uid 1001)           │
│ - Minimal attack surface                    │
└─────────────────────────────────────────────┘
```

**Benefits**:
- **Small images**: Production stage ~150MB vs ~500MB single-stage
- **Security**: Non-root user, minimal dependencies
- **Fast deployments**: Cached layers for quick rebuilds

### Container Communication

```
┌──────────────────────────────────────────────────┐
│                 Host System                      │
│                                                  │
│  ┌────────────────┐      ┌──────────────────┐   │
│  │  Docs MCP      │      │  Network MCP     │   │
│  │  Container     │◄────►│  Container       │   │
│  └────────────────┘      └──────────────────┘   │
│         │                        │               │
│         │                        │               │
│         ▼                        ▼               │
│  ┌────────────────┐      ┌──────────────────┐   │
│  │ vendor/ volume │      │ SSH keys volume  │   │
│  └────────────────┘      └──────────────────┘   │
│                                                  │
│                          │                       │
│                          ▼                       │
│                  Network Devices                 │
└──────────────────────────────────────────────────┘
```

---

## Building Images

### Build Individual Services

```bash
# Docs MCP Server
docker build -f packages/docs-mcp/Dockerfile -t netcontext/docs-mcp:latest .

# Network MCP Server
docker build -f packages/network-mcp/Dockerfile -t netcontext/network-mcp:latest .
```

### Build with docker-compose

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build docs-mcp

# Build with no cache (force fresh build)
docker-compose build --no-cache
```

### Build Arguments and Tags

```bash
# Tag with specific version
docker build -f packages/docs-mcp/Dockerfile \
  -t netcontext/docs-mcp:0.1.0 \
  -t netcontext/docs-mcp:latest \
  .

# Multi-platform build (ARM64 + AMD64)
docker buildx build --platform linux/amd64,linux/arm64 \
  -f packages/docs-mcp/Dockerfile \
  -t netcontext/docs-mcp:latest \
  .
```

---

## Running Containers

### Using docker-compose (Recommended)

```bash
# Start services in background
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f docs-mcp
docker-compose logs -f network-mcp

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart network-mcp
```

### Using Docker CLI Directly

#### Docs MCP Server

```bash
docker run -d \
  --name netcontext-docs-mcp \
  --restart unless-stopped \
  -v $(pwd)/vendor:/app/vendor:ro \
  -e NETCONTEXT_REPO_PATH=/app \
  -i \
  netcontext/docs-mcp:latest
```

#### Network MCP Server

```bash
docker run -d \
  --name netcontext-network-mcp \
  --restart unless-stopped \
  -v ~/.ssh:/home/mcp/.ssh:ro \
  -e DEVICE_USERNAME=admin \
  -e DEVICE_PRIVATE_KEY=/home/mcp/.ssh/id_rsa \
  -e SSH_VERIFY_HOST_KEY=false \
  -i \
  netcontext/network-mcp:latest
```

### Interactive Mode (Development/Testing)

```bash
# Run docs-mcp interactively
docker run -it --rm \
  -v $(pwd)/vendor:/app/vendor:ro \
  netcontext/docs-mcp:latest

# Run network-mcp with shell access
docker run -it --rm \
  --entrypoint /bin/sh \
  -v ~/.ssh:/home/mcp/.ssh:ro \
  netcontext/network-mcp:latest
```

---

## Configuration

### Environment Variables

#### Docs MCP Server

| Variable | Default | Description |
|----------|---------|-------------|
| `NETCONTEXT_REPO_PATH` | `/app` | Path to vendor documentation |
| `NODE_ENV` | `production` | Node environment |

#### Network MCP Server

| Variable | Default | Description |
|----------|---------|-------------|
| `DEVICE_USERNAME` | `admin` | SSH username for devices |
| `DEVICE_PASSWORD` | - | SSH password (optional) |
| `DEVICE_PRIVATE_KEY` | - | Path to SSH private key |
| `DEVICE_PORT` | `22` | SSH port |
| `SSH_TIMEOUT` | `10000` | SSH connection timeout (ms) |
| `SSH_VERIFY_HOST_KEY` | `false` | Enable host key verification |
| `NODE_ENV` | `production` | Node environment |

### Volume Mounts

#### Required Volumes

```yaml
# Docs MCP
volumes:
  - ./vendor:/app/vendor:ro  # Vendor documentation (read-only)

# Network MCP
volumes:
  - ~/.ssh:/home/mcp/.ssh:ro  # SSH keys (read-only)
```

#### Optional Volumes

```yaml
# Custom vendor documentation location
volumes:
  - /path/to/custom/vendor:/app/vendor:ro

# Specific SSH key file
volumes:
  - /path/to/id_rsa:/home/mcp/.ssh/id_rsa:ro
```

### Docker Compose Environment File

Create `.env` in the project root:

```bash
# Copy example
cp .env.docker.example .env

# Edit configuration
vim .env
```

Example `.env`:

```bash
DEVICE_USERNAME=admin
DEVICE_PASSWORD=SecurePassword123
DEVICE_PORT=22
SSH_KEY_PATH=~/.ssh
SSH_TIMEOUT=15000
SSH_VERIFY_HOST_KEY=true
```

---

## Security Best Practices

### 1. Non-Root User Execution

Both containers run as user `mcp` (uid 1001), not root:

```dockerfile
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp
USER mcp
```

**Benefit**: Limits damage if container is compromised.

### 2. Read-Only Volume Mounts

```yaml
volumes:
  - ./vendor:/app/vendor:ro  # :ro = read-only
  - ~/.ssh:/home/mcp/.ssh:ro
```

**Benefit**: Prevents container from modifying host files.

### 3. Minimal Base Image

Uses `node:20.10.0-alpine` (not `node:20` or `node:latest`):

**Benefits**:
- Smaller attack surface
- Fewer CVEs
- Faster downloads

### 4. No Exposed Ports

MCP uses stdio transport (not HTTP):

```dockerfile
# No EXPOSE directive
# No network ports opened
```

**Benefit**: Cannot be accessed over network.

### 5. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s \
  CMD node -e "process.exit(0)"
```

**Benefit**: Auto-restart on failure.

### 6. Secret Management

**Don't**:
```bash
# ❌ NEVER hardcode credentials
docker run -e DEVICE_PASSWORD=admin123 ...
```

**Do**:
```bash
# ✅ Use environment files
docker-compose --env-file .env up

# ✅ Use Docker secrets (Swarm mode)
docker secret create device_password password.txt
```

### 7. Network Isolation

```yaml
networks:
  netcontext-network:
    driver: bridge
    internal: true  # No internet access if needed
```

### 8. Image Scanning

```bash
# Scan for vulnerabilities
docker scan netcontext/docs-mcp:latest
docker scan netcontext/network-mcp:latest

# Using Trivy
trivy image netcontext/docs-mcp:latest
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs network-mcp

# Common issues:
# 1. Missing SSH keys
docker run --rm -v ~/.ssh:/home/mcp/.ssh:ro netcontext/network-mcp:latest ls -la /home/mcp/.ssh

# 2. Wrong permissions on SSH keys
chmod 600 ~/.ssh/id_rsa  # Must be 600 or 400

# 3. Environment variables not set
docker-compose config  # Verify interpolated values
```

### SSH Connection Failures

```bash
# Test SSH connection from container
docker exec -it netcontext-network-mcp sh
ssh -i /home/mcp/.ssh/id_rsa admin@<device-ip>

# Check SSH key format
file ~/.ssh/id_rsa  # Should be "PEM RSA private key"

# Verify host key verification setting
docker-compose exec network-mcp env | grep SSH_VERIFY
```

### Permission Denied Errors

```bash
# Check file ownership
ls -la vendor/
ls -la ~/.ssh/

# Fix ownership (if needed)
sudo chown -R $(id -u):$(id -g) vendor/

# SSH keys must be owned by you
chown $(id -u):$(id -g) ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
```

### Vendor Documentation Not Found

```bash
# Verify volume mount
docker-compose exec docs-mcp ls -la /app/vendor

# Check path in docker-compose.yml
volumes:
  - ./vendor:/app/vendor:ro  # Relative to docker-compose.yml location

# Absolute path if needed
volumes:
  - /absolute/path/to/vendor:/app/vendor:ro
```

### Build Failures

```bash
# Clear build cache
docker-compose build --no-cache

# Check Docker build context
docker build -f packages/docs-mcp/Dockerfile . 2>&1 | tee build.log

# Verify .dockerignore isn't excluding required files
cat .dockerignore
```

### Container Uses Too Much Memory

```bash
# Set memory limits
docker-compose up -d --memory="512m"

# Or in docker-compose.yml:
services:
  docs-mcp:
    mem_limit: 512m
    mem_reservation: 256m
```

### Logs Not Visible

```bash
# Enable JSON logging
docker-compose logs --json

# Increase log verbosity (if MCP server supports it)
environment:
  - DEBUG=*
  - NODE_ENV=development
```

---

## Production Deployment

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml netcontext

# Check services
docker stack services netcontext

# Remove stack
docker stack rm netcontext
```

### Kubernetes Deployment

See `examples/kubernetes/` for manifests.

### Health Monitoring

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' netcontext-docs-mcp

# Restart unhealthy containers automatically
docker run --health-cmd="node -e 'process.exit(0)'" \
  --health-interval=30s \
  --health-retries=3 \
  --restart=on-failure \
  netcontext/docs-mcp:latest
```

---

## Performance Optimization

### Build Caching

```bash
# Use BuildKit for better caching
DOCKER_BUILDKIT=1 docker build -f packages/docs-mcp/Dockerfile .

# Multi-stage builds automatically cache layers
# Rebuild is fast if only source code changed
```

### Image Size Optimization

```bash
# Check image size
docker images | grep netcontext

# Compare with single-stage build
# Multi-stage: ~150MB
# Single-stage: ~500MB
```

### Runtime Optimization

```yaml
# Limit CPU and memory
services:
  docs-mcp:
    cpus: '0.5'
    mem_limit: 512m

  network-mcp:
    cpus: '1.0'
    mem_limit: 1g
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build images
        run: docker-compose build

      - name: Push to registry
        run: |
          docker tag netcontext/docs-mcp:latest registry.example.com/netcontext/docs-mcp:${{ github.sha }}
          docker push registry.example.com/netcontext/docs-mcp:${{ github.sha }}
```

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Alpine Linux](https://alpinelinux.org/) (base image docs)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Last Updated**: 2025-11-15
**Version**: 0.1.0
**Maintainer**: Hakan
