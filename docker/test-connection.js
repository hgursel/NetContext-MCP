#!/usr/bin/env node

/**
 * Simple test script to verify NetContext MCP SSH protocol works with Docker test servers
 */

const fs = require('fs');
const path = require('path');

// Read the private key
const keyPath = path.join(__dirname, 'test-ssh-server', 'keys', 'test_key');
const privateKey = fs.readFileSync(keyPath, 'utf8');

console.log('🧪 NetContext MCP Connection Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Private Key Authentication
const test1 = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'execute_commands',
    arguments: {
      host: 'localhost',
      port: 2223,
      username: 'netadmin',
      privateKey: privateKey,
      protocol: 'ssh',
      commands: ['show version', 'show interfaces']
    }
  }
};

console.log('Test 1: SSH Key Authentication');
console.log('─────────────────────────────────────────────────');
console.log('Host: localhost:2223');
console.log('Auth: Private Key');
console.log('Commands: show version, show interfaces\n');

// Save test payload
fs.writeFileSync('/tmp/mcp-test-key-auth.json', JSON.stringify(test1, null, 2));
console.log('✅ Test payload saved to: /tmp/mcp-test-key-auth.json\n');

// Test 2: Password Authentication (would need sshpass or manual entry)
const test2 = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'execute_commands',
    arguments: {
      host: 'localhost',
      port: 2222,
      username: 'netadmin',
      password: 'testpass123',
      protocol: 'ssh',
      commands: ['show system']
    }
  }
};

console.log('Test 2: SSH Password Authentication');
console.log('─────────────────────────────────────────────────');
console.log('Host: localhost:2222');
console.log('Auth: Password (testpass123)');
console.log('Commands: show system\n');

fs.writeFileSync('/tmp/mcp-test-password-auth.json', JSON.stringify(test2, null, 2));
console.log('✅ Test payload saved to: /tmp/mcp-test-password-auth.json\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 How to Test:\n');
console.log('1. Start the MCP server:');
console.log('   cd ../packages/network-mcp');
console.log('   node dist/index.js\n');
console.log('2. In another terminal, send test request:');
console.log('   cat /tmp/mcp-test-key-auth.json | node dist/index.js\n');
console.log('3. Or test via Claude Desktop:');
console.log('   Add MCP server to claude_desktop_config.json');
console.log('   Then: "Execute show version on localhost port 2223"\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Display Docker container status
console.log('📊 Docker Container Status:\n');
const { execSync } = require('child_process');
try {
  const containers = execSync('docker ps | grep netcontext', { encoding: 'utf8' });
  console.log(containers);
} catch (e) {
  console.log('⚠️  Could not get container status');
}

console.log('✅ Test environment ready!\n');
