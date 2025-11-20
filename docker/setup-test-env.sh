#!/bin/bash

# NetContext MCP Docker Test Environment Setup
# This script sets up SSH test servers for testing the protocol abstraction layer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYS_DIR="${SCRIPT_DIR}/test-ssh-server/keys"

echo "🔧 Setting up NetContext MCP Test Environment..."

# Create keys directory
mkdir -p "${KEYS_DIR}"

# Generate SSH key pair for testing if it doesn't exist
if [ ! -f "${KEYS_DIR}/test_key" ]; then
    echo "🔑 Generating SSH key pair for testing..."
    ssh-keygen -t rsa -b 4096 -f "${KEYS_DIR}/test_key" -N "" -C "netcontext-test-key"
    chmod 600 "${KEYS_DIR}/test_key"
    chmod 644 "${KEYS_DIR}/test_key.pub"
    echo "✅ SSH key pair generated"
else
    echo "✅ SSH key pair already exists"
fi

# Build and start Docker containers
echo "🐳 Building Docker containers..."
cd "${SCRIPT_DIR}"
docker-compose build

echo "🚀 Starting Docker containers..."
docker-compose up -d

# Wait for SSH servers to be ready
echo "⏳ Waiting for SSH servers to be ready..."
sleep 5

# Test connections
echo ""
echo "🧪 Testing SSH connections..."
echo ""

# Test password authentication
echo "Testing password authentication (port 2222)..."
if sshpass -p "testpass123" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 netadmin@localhost "echo 'Password auth works!'" 2>/dev/null; then
    echo "✅ Password authentication: SUCCESS"
else
    echo "⚠️  Password authentication: FAILED (sshpass may not be installed)"
fi

# Test key authentication
echo ""
echo "Testing key authentication (port 2223)..."
if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${KEYS_DIR}/test_key" -p 2223 netadmin@localhost "echo 'Key auth works!'" 2>/dev/null; then
    echo "✅ Key authentication: SUCCESS"
else
    echo "❌ Key authentication: FAILED"
fi

echo ""
echo "✅ NetContext MCP Test Environment is ready!"
echo ""
echo "📋 Test Server Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 SSH Server (Password Auth):"
echo "   Host: localhost"
echo "   Port: 2222"
echo "   Username: netadmin"
echo "   Password: testpass123"
echo "   IP: 172.20.0.10"
echo ""
echo "🔑 SSH Server (Key Auth):"
echo "   Host: localhost"
echo "   Port: 2223"
echo "   Username: netadmin"
echo "   Key: ${KEYS_DIR}/test_key"
echo "   IP: 172.20.0.11"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Quick Test Commands:"
echo ""
echo "# Password auth test:"
echo "ssh -p 2222 netadmin@localhost"
echo ""
echo "# Key auth test:"
echo "ssh -i ${KEYS_DIR}/test_key -p 2223 netadmin@localhost"
echo ""
echo "# Test with mock commands:"
echo "ssh -p 2222 netadmin@localhost 'show version'"
echo "ssh -p 2222 netadmin@localhost 'show interfaces'"
echo "ssh -p 2222 netadmin@localhost 'show system'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Environment Variables for Testing:"
echo ""
echo "export DEVICE_USERNAME=netadmin"
echo "export DEVICE_PASSWORD=testpass123"
echo "export DEVICE_PORT=2222"
echo ""
echo "🛑 To stop the test environment:"
echo "cd ${SCRIPT_DIR} && docker-compose down"
echo ""
