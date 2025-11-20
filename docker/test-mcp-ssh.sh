#!/bin/bash

# NetContext MCP SSH Protocol Test Script
# Tests the SSH protocol implementation against Docker test servers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KEYS_DIR="${SCRIPT_DIR}/test-ssh-server/keys"

echo "🧪 Testing NetContext MCP SSH Protocol Implementation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker containers are running
if ! docker ps | grep -q "netcontext-ssh-password"; then
    echo "❌ Test SSH servers are not running!"
    echo "   Run './setup-test-env.sh' first to start test servers"
    exit 1
fi

echo "✅ Test SSH servers are running"
echo ""

# Set environment variables
export DEVICE_USERNAME=netadmin
export DEVICE_PASSWORD=testpass123
export SSH_TIMEOUT=10000

# Build the MCP server if needed
echo "📦 Building MCP server..."
cd "${PROJECT_ROOT}/packages/network-mcp"
npm run build 2>&1 | grep -E "(error|success|✔)" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Password Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create test MCP request for password auth
cat > /tmp/mcp-test-password.json <<'EOF'
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "execute_commands",
    "arguments": {
      "host": "localhost",
      "port": 2222,
      "username": "netadmin",
      "password": "testpass123",
      "protocol": "ssh",
      "commands": ["show version", "show interfaces"]
    }
  }
}
EOF

echo "📤 Sending test request (Password Auth)..."
echo ""

# Note: This is a mock test - actual MCP communication would go through stdio
# For real testing, you would use the MCP client or integrate with Claude Desktop
echo "Test payload created at: /tmp/mcp-test-password.json"
echo ""
echo "Expected behavior:"
echo "  ✓ Connect to localhost:2222 with password"
echo "  ✓ Execute: show version"
echo "  ✓ Execute: show interfaces"
echo "  ✓ Disconnect cleanly"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Private Key Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Read private key
PRIVATE_KEY=$(cat "${KEYS_DIR}/test_key" | sed ':a;N;$!ba;s/\n/\\n/g')

# Create test MCP request for key auth
cat > /tmp/mcp-test-key.json <<EOF
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "execute_commands",
    "arguments": {
      "host": "localhost",
      "port": 2223,
      "username": "netadmin",
      "privateKey": "${PRIVATE_KEY}",
      "protocol": "ssh",
      "commands": ["show system"]
    }
  }
}
EOF

echo "📤 Sending test request (Key Auth)..."
echo ""
echo "Test payload created at: /tmp/mcp-test-key.json"
echo ""
echo "Expected behavior:"
echo "  ✓ Connect to localhost:2223 with private key"
echo "  ✓ Execute: show system"
echo "  ✓ Disconnect cleanly"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Batch Execution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create batch test
cat > /tmp/mcp-test-batch.json <<'EOF'
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "batch_execute",
    "arguments": {
      "hosts": ["localhost"],
      "port": 2222,
      "username": "netadmin",
      "password": "testpass123",
      "protocol": "ssh",
      "commands": ["show version"]
    }
  }
}
EOF

echo "📤 Sending batch test request..."
echo ""
echo "Test payload created at: /tmp/mcp-test-batch.json"
echo ""
echo "Expected behavior:"
echo "  ✓ Connect to localhost:2222"
echo "  ✓ Execute batch commands in parallel"
echo "  ✓ Return summary with success/failure counts"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Manual Testing Instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To manually test the MCP server:"
echo ""
echo "1. Start the MCP server in stdio mode:"
echo "   cd ${PROJECT_ROOT}/packages/network-mcp"
echo "   node dist/index.js"
echo ""
echo "2. Send JSON-RPC requests via stdin:"
echo "   cat /tmp/mcp-test-password.json | node dist/index.js"
echo ""
echo "3. Or test individual SSH connections:"
echo "   ssh -p 2222 netadmin@localhost 'show version'"
echo "   ssh -i ${KEYS_DIR}/test_key -p 2223 netadmin@localhost 'show system'"
echo ""
echo "4. View Docker logs:"
echo "   docker logs netcontext-ssh-password"
echo "   docker logs netcontext-ssh-key"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Integration with Claude Desktop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add to your Claude Desktop MCP config:"
echo ""
echo "{"
echo '  "mcpServers": {'
echo '    "netcontext-network": {'
echo '      "command": "node",'
echo '      "args": ["'${PROJECT_ROOT}'/packages/network-mcp/dist/index.js"],'
echo '      "env": {'
echo '        "DEVICE_USERNAME": "netadmin",'
echo '        "DEVICE_PASSWORD": "testpass123",'
echo '        "DEVICE_PORT": "2222",'
echo '        "DEFAULT_PROTOCOL": "ssh"'
echo '      }'
echo '    }'
echo '  }'
echo "}"
echo ""
echo "Then in Claude Desktop, you can use:"
echo '  "Execute show version on localhost port 2222"'
echo ""
echo "✅ Test environment ready for SSH protocol testing!"
echo ""
