# NetContext MCP Docker Test Environment

This directory contains Docker-based test infrastructure for testing the NetContext MCP protocol implementations.

## Overview

The test environment provides:
- **SSH Test Servers**: Containerized SSH servers simulating network devices
- **Mock Commands**: Simulated network device commands (`show version`, `show interfaces`, etc.)
- **Multiple Auth Methods**: Password and SSH key authentication testing
- **Isolated Network**: Dedicated Docker network for testing

## Quick Start

### 1. Setup Test Environment

```bash
cd docker
./setup-test-env.sh
```

This will:
- Generate SSH key pairs for testing
- Build Docker containers
- Start SSH test servers
- Verify connectivity

### 2. Test SSH Connections

```bash
# Test password authentication
ssh -p 2222 netadmin@localhost
# Password: testpass123

# Test key authentication
ssh -i test-ssh-server/keys/test_key -p 2223 netadmin@localhost

# Test mock commands
ssh -p 2222 netadmin@localhost 'show version'
ssh -p 2222 netadmin@localhost 'show interfaces'
ssh -p 2222 netadmin@localhost 'show system'
```

### 3. Test MCP Server

```bash
./test-mcp-ssh.sh
```

This generates test payloads and provides instructions for testing the MCP server.

## Test Servers

### SSH Server (Password Auth)
- **Container**: `netcontext-ssh-password`
- **Host**: `localhost`
- **Port**: `2222`
- **IP**: `172.20.0.10`
- **Username**: `netadmin`
- **Password**: `testpass123`

### SSH Server (Key Auth)
- **Container**: `netcontext-ssh-key`
- **Host**: `localhost`
- **Port**: `2223`
- **IP**: `172.20.0.11`
- **Username**: `netadmin`
- **Key**: `test-ssh-server/keys/test_key`

## Mock Commands

The test servers simulate network device commands:

| Command | Output |
|---------|--------|
| `show version` | Device version and hostname |
| `show interfaces` | Interface status and IPs |
| `show system` | System resources (CPU, memory) |

## Environment Variables for Testing

```bash
export DEVICE_USERNAME=netadmin
export DEVICE_PASSWORD=testpass123
export DEVICE_PORT=2222
export SSH_TIMEOUT=10000
export DEFAULT_PROTOCOL=ssh
```

## Docker Commands

### Start Servers
```bash
docker-compose up -d
```

### Stop Servers
```bash
docker-compose down
```

### View Logs
```bash
docker logs netcontext-ssh-password
docker logs netcontext-ssh-key
```

### Rebuild Containers
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Access Container Shell
```bash
docker exec -it netcontext-ssh-password sh
```

## Integration with NetContext MCP

### Testing with MCP Server

1. **Build the MCP server**:
   ```bash
   cd ../packages/network-mcp
   npm run build
   ```

2. **Run MCP server in stdio mode**:
   ```bash
   node dist/index.js
   ```

3. **Send test requests** (in another terminal):
   ```bash
   cat /tmp/mcp-test-password.json | node dist/index.js
   ```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "netcontext-network": {
      "command": "node",
      "args": ["/path/to/NetContext/MCP/packages/network-mcp/dist/index.js"],
      "env": {
        "DEVICE_USERNAME": "netadmin",
        "DEVICE_PASSWORD": "testpass123",
        "DEVICE_PORT": "2222",
        "DEFAULT_PROTOCOL": "ssh"
      }
    }
  }
}
```

Then in Claude Desktop:
```
"Execute show version on localhost port 2222"
"Run show interfaces command on the test device"
"Check system information on localhost:2222"
```

## Test Scenarios

### 1. Password Authentication Test
```json
{
  "name": "execute_commands",
  "arguments": {
    "host": "localhost",
    "port": 2222,
    "username": "netadmin",
    "password": "testpass123",
    "protocol": "ssh",
    "commands": ["show version"]
  }
}
```

### 2. Private Key Authentication Test
```json
{
  "name": "execute_commands",
  "arguments": {
    "host": "localhost",
    "port": 2223,
    "username": "netadmin",
    "privateKey": "<contents of test_key>",
    "protocol": "ssh",
    "commands": ["show system"]
  }
}
```

### 3. Batch Execution Test
```json
{
  "name": "batch_execute",
  "arguments": {
    "hosts": ["localhost"],
    "port": 2222,
    "protocol": "ssh",
    "commands": ["show version", "show interfaces"]
  }
}
```

## Troubleshooting

### Port Already in Use
If ports 2222 or 2223 are in use, edit `docker-compose.yml` to use different ports:
```yaml
ports:
  - "3333:22"  # Change 2222 to 3333
```

### SSH Connection Refused
Wait a few seconds after starting containers:
```bash
docker-compose up -d
sleep 5
ssh -p 2222 netadmin@localhost
```

### Permission Denied (publickey)
Ensure the private key has correct permissions:
```bash
chmod 600 test-ssh-server/keys/test_key
```

### Can't Connect to Docker
Ensure Docker Desktop is running and Docker daemon is accessible.

## File Structure

```
docker/
├── docker-compose.yml           # Docker Compose configuration
├── setup-test-env.sh           # Automated setup script
├── test-mcp-ssh.sh             # MCP server test script
├── README.md                   # This file
└── test-ssh-server/
    ├── Dockerfile              # SSH server image
    └── keys/                   # SSH keys (generated)
        ├── test_key            # Private key
        └── test_key.pub        # Public key
```

## Security Notes

⚠️ **For Testing Only**: These SSH servers use hardcoded credentials and are **not secure** for production use.

- Default password: `testpass123`
- Test keys are generated locally
- Containers are isolated on private Docker network
- Only exposed to localhost by default

## Next Steps

1. **Test Protocol Abstraction**: Verify SSH protocol implementation works correctly
2. **Add HTTP Mock Server**: Create mock UniFi controller for HTTP protocol testing
3. **Integration Tests**: Add automated integration tests using these containers
4. **CI/CD Pipeline**: Integrate Docker tests into GitHub Actions workflow

## Cleanup

To completely remove the test environment:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes
docker-compose down -v

# Remove generated keys
rm -rf test-ssh-server/keys/

# Remove test payloads
rm -f /tmp/mcp-test-*.json
```

## Contributing

When adding new test scenarios:
1. Create mock commands in the Dockerfile
2. Add test cases to `test-mcp-ssh.sh`
3. Document expected behavior
4. Update this README

---

**Last Updated**: 2025-11-17
**Status**: ✅ Ready for Testing
