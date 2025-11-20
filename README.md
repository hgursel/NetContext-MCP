# NetContext MCP - Network Device Automation via Model Context Protocol

**AI-powered network automation** through Model Context Protocol for SSH-based network device management.

[![CI](https://github.com/hgursel/NetContext-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/hgursel/NetContext-MCP/actions)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

## What is NetContext MCP?

NetContext provides an MCP server that enables AI assistants (Claude Desktop, LM Studio, etc.) to execute commands on network devices via SSH. Control your network infrastructure using natural language through your favorite AI tools.

### Features

- **✅ Production-Ready SSH Support**: Tested with real devices (Aruba switches, UniFi routers)
- **🔐 Multiple Authentication Methods**: Password, keyboard-interactive, SSH keys, SSH agent
- **🏗️ Protocol Abstraction**: Clean architecture supporting legacy and modern SSH implementations
- **📟 Device Pagination Handling**: Automatic detection and handling of CLI pagination prompts
- **🛡️ Security First**: Command sanitization, credential protection, timeout management
- **⚡ Batch Operations**: Execute commands on multiple devices in parallel
- **🐳 Docker Test Environment**: Pre-configured SSH test servers for development

---

## Supported Devices

| Vendor | Model | Authentication | Status |
|--------|-------|---------------|--------|
| **Cisco** | IOS/IOS-XE (Catalyst/ISR/ASR) | Password/Keys/Keyboard-int | ✅ Production |
| **HP/Aruba** | ProCurve Switches (2530/2920) | Password | ✅ Production |
| **Ubiquiti** | UniFi Dream Router | Keyboard-interactive | ✅ Production |
| **Generic** | Linux/SSH servers | Password/Keys | ✅ Supported |

**Key Capabilities**:
- **Multi-Vendor Support**: Cisco, HP/Aruba, Ubiquiti, and generic SSH devices
- **Legacy SSH Support**: Works with older network equipment (diffie-hellman-group14-sha1, ssh-rsa)
- **Modern SSH Support**: Full support for current algorithms (curve25519-sha256, chacha20-poly1305)
- **Device-Specific Handling**: Pagination, prompt detection, vendor-specific commands
- **Error Detection**: Cisco-specific error pattern recognition and reporting

---

## Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/hgursel/NetContext-MCP.git
cd NetContext-MCP

# Install dependencies
npm install

# Build the MCP server
npm run build
```

### 2. Setup with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "netcontext-network": {
      "command": "node",
      "args": [
        "/path/to/NetContext-MCP/packages/network-mcp/dist/index.js"
      ],
      "env": {
        "DEVICE_USERNAME": "admin",
        "DEVICE_PASSWORD": "your-default-password",
        "SSH_TIMEOUT": "10000",
        "DEFAULT_PROTOCOL": "ssh"
      }
    }
  }
}
```

**Important**:
- Replace `/path/to/NetContext-MCP` with your actual installation path
- Default credentials can be overridden per-command
- For production, use SSH keys instead of passwords (see [Security](#security-best-practices))

### 3. Setup with LM Studio

LM Studio supports MCP servers through configuration. Add to your LM Studio MCP config:

```json
{
  "mcpServers": {
    "netcontext": {
      "command": "node",
      "args": ["/path/to/NetContext-MCP/packages/network-mcp/dist/index.js"],
      "env": {
        "DEVICE_USERNAME": "admin",
        "SSH_TIMEOUT": "10000"
      }
    }
  }
}
```

### 4. Restart Your AI Client

- **Claude Desktop**: Quit (Cmd+Q) and restart
- **LM Studio**: Restart the application
- **Other MCP Clients**: Follow their restart procedure

### 5. Test the Connection

In your AI assistant, try:

```
Execute "show version" on my Aruba switch at 192.168.1.10 with username manager and password mypassword
```

or

```
Run "uname -a" on UniFi router at 10.10.21.1 with username root and password mypassword
```

---

## Usage Examples

### Aruba ProCurve Switch

```
Show version information on the Aruba switch at 192.168.2.217 with credentials manager/password
```

**What happens**:
1. MCP server connects via SSH (handles legacy algorithms automatically)
2. Detects CLI prompt and disables pagination
3. Executes `show version` command
4. Returns device model, software version, serial number

**Example output**:
```
HP J9729A 2920-48G-POE+ Switch
Software revision WB.16.02.0012
Serial Number: CNXXXXXXXX
```

### Cisco IOS/IOS-XE Router or Switch

```
Get device information from Cisco router at 192.168.1.1 with credentials admin/cisco123
```

**What happens**:
1. MCP server connects via SSH (supports password, keyboard-interactive, or SSH keys)
2. Automatically sends `terminal length 0` to disable pagination
3. Executes `show version` command
4. Detects Cisco error patterns if command fails

**Example output**:
```
Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.2(7)E8
Technical Support: http://www.cisco.com/techsupport
System image file is "flash:c2960x-universalk9-mz.152-7.E8.bin"
uptime is 45 weeks, 2 days, 3 hours, 15 minutes
```

**Available Command Bundles** (in `vendor/cisco-ios-iosxe/commands.yml`):
- `health_check` - Basic system health (version, interfaces, CPU, memory)
- `security_audit` - Security configuration review
- `interface_troubleshooting` - Interface diagnostics
- `vlan_troubleshooting` - VLAN configuration and connectivity (switches)
- `routing_troubleshooting` - Routing table and protocols (routers)

### UniFi Dream Router

```
Get system information from UniFi router at 10.10.21.1 with username root and password mypassword
```

**What happens**:
1. MCP server connects via SSH (uses keyboard-interactive auth)
2. Executes Linux command: `uname -a`
3. Returns kernel and firmware version

**Example output**:
```
Linux UDR7 5.4.213-ui-ipq5322-wireless #5.4.213 SMP PREEMPT aarch64 GNU/Linux
Firmware version: v4.3.9
```

### Batch Execution

```
Get uptime from these devices in parallel:
- Aruba switch at 192.168.2.217 (manager/password)
- UniFi router at 10.10.21.1 (root/mypassword)
```

**What happens**:
1. MCP server executes commands on both devices simultaneously
2. Returns combined results with per-device status
3. Shows execution time for each device

---

## Configuration

### Environment Variables

Configure in your MCP client's config file:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEVICE_USERNAME` | Default SSH username | `netadmin` |
| `DEVICE_PASSWORD` | Default SSH password | `testpass123` |
| `SSH_TIMEOUT` | Connection timeout (ms) | `10000` |
| `DEFAULT_PROTOCOL` | Protocol to use | `ssh` |
| `SSH_VERIFY_HOST_KEY` | Verify SSH host keys | `false` |

### Per-Command Credentials

You can override default credentials in each command:

```
Execute "show vlan" on 192.168.1.10 with username admin and password secret123
```

### SSH Key Authentication

For production use, configure SSH keys:

```json
{
  "env": {
    "DEVICE_USERNAME": "admin",
    "DEVICE_PRIVATE_KEY": "/home/user/.ssh/network_devices_rsa"
  }
}
```

---

## Architecture

### Protocol Abstraction Layer

```
┌─────────────────────────────────────────┐
│     AI Assistant (Claude/LM Studio)     │
└────────────────┬────────────────────────┘
                 │ MCP Protocol
                 │
┌────────────────▼────────────────────────┐
│       NetContext MCP Server             │
│                                         │
│  Tools:                                 │
│  - execute_commands                     │
│  - batch_execute                        │
│  - execute_bundle                       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Protocol Abstraction Layer         │
│                                         │
│  - SSHProtocol                          │
│  - Credential Management                │
│  - Command Sanitization                 │
│  - Error Handling                       │
└────────────────┬────────────────────────┘
                 │ SSH (various auth methods)
                 │
┌────────────────▼────────────────────────┐
│         Network Devices                 │
│                                         │
│  - Aruba Switches (legacy SSH)          │
│  - UniFi Routers (keyboard-interactive) │
│  - Linux Servers (standard SSH)         │
└─────────────────────────────────────────┘
```

### Supported Authentication Methods

1. **Password Authentication**: Standard username/password
2. **Keyboard-Interactive**: Challenge-response (UniFi, some Linux systems)
3. **SSH Private Key**: Key-based authentication
4. **SSH Agent**: Agent forwarding support

### Device-Specific Features

- **Aruba Switches**: Pagination handling ("Press any key to continue"), legacy SSH algorithms, HP ProCurve CLI
- **UniFi Routers**: Keyboard-interactive auth, modern SSH algorithms, standard Linux commands
- **Generic Devices**: Standard SSH with comprehensive algorithm support

---

## Security Best Practices

### Credential Management

**❌ Don't** hardcode passwords in configuration files:
```json
{
  "env": {
    "DEVICE_PASSWORD": "admin123"  // Bad!
  }
}
```

**✅ Do** use SSH keys:
```json
{
  "env": {
    "DEVICE_USERNAME": "admin",
    "DEVICE_PRIVATE_KEY": "/home/user/.ssh/network_key"
  }
}
```

**✅ Do** use environment variables:
```bash
# In .bashrc or .zshrc
export DEVICE_USERNAME=admin
export DEVICE_PRIVATE_KEY=/home/user/.ssh/network_key
```

### Command Sanitization

The MCP server automatically blocks dangerous commands:
- ✅ Blocks: `rm`, `del`, `format`, `erase`, `write erase`
- ✅ Blocks: Command chaining (`&&`, `||`, `;`)
- ✅ Blocks: Path traversal (`../`)
- ✅ Blocks: Output redirection (`<`, `>`)

### Network Security

- **Limit SSH access**: Use ACLs to restrict management access
- **Use jump hosts**: Don't expose devices directly to internet
- **Enable logging**: Monitor all SSH sessions
- **Rotate credentials**: Regular password/key rotation
- **Read-only accounts**: Use when possible

---

## Development

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- TypeScript 5.x

### Build from Source

```bash
# Clone repository
git clone https://github.com/hgursel/NetContext-MCP.git
cd NetContext-MCP

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Docker Test Environment

For development and testing without real devices:

```bash
# Start test SSH servers
cd docker
docker-compose up -d

# Test connection
ssh -i test-ssh-server/keys/test_key -p 2223 netadmin@localhost 'show version'

# Stop servers
docker-compose down
```

The Docker environment provides:
- 2 SSH test servers (password auth + key auth)
- Mock network device commands
- Safe testing environment

---

## Troubleshooting

### MCP server not loading

**Symptoms**: Tools not available in AI assistant

**Solutions**:
1. Check config file syntax (must be valid JSON)
2. Verify path to `index.js` is absolute and correct
3. Restart AI client completely
4. Check logs: `~/Library/Logs/Claude/mcp-server-netcontext-network.log`

### SSH connection fails

**Symptoms**: `Connection timeout` or `Authentication failed`

**Solutions**:
- Verify device is reachable: `ping <IP>`
- Test SSH manually: `ssh user@<IP>`
- Check credentials are correct
- Verify SSH is enabled on device
- For Aruba: Legacy SSH algorithms supported automatically
- For UniFi: Keyboard-interactive auth supported automatically

### Commands return no output

**Symptoms**: Empty output or timeout

**Solutions**:
- Increase `SSH_TIMEOUT` in config (e.g., `15000`)
- Check device CLI prompt format (should detect `#` or `>`)
- Verify command syntax for specific device
- Check pagination handling (automatic for most devices)

### Keyboard-interactive auth fails (UniFi)

**Solution**: Ensure `tryKeyboard: true` is enabled (automatic in code)

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-vendor`
3. Add tests for new functionality
4. Submit a pull request

**Areas for contribution**:
- Additional device vendor support
- Protocol implementations (HTTP API, NETCONF)
- Enhanced error handling
- Documentation improvements

---

## Roadmap

### Current (v0.1.0)
- ✅ SSH protocol with multiple auth methods
- ✅ Aruba ProCurve switch support
- ✅ UniFi Dream Router support
- ✅ Docker test environment
- ✅ Command sanitization and security

### Planned (v0.2.0)
- [ ] HTTP API protocol (for REST-based devices)
- [ ] Configuration file for credential management
- [ ] Protocol detection system
- [ ] Vendor metadata database
- [ ] Command bundles (health checks, audits)

### Future (v1.0.0)
- [ ] Cisco IOS/IOS-XE support
- [ ] Juniper JunOS support
- [ ] NETCONF protocol support
- [ ] Configuration backup/restore
- [ ] Change management workflows

---

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Anthropic**: For the Model Context Protocol specification
- **HP/Aruba**: For ArubaOS-Switch documentation
- **Ubiquiti**: For UniFi OS
- **Community**: For testing and feedback

---

## Support

- **Issues**: [GitHub Issues](https://github.com/hgursel/NetContext-MCP/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hgursel/NetContext-MCP/discussions)

---

## Related Projects

- **Model Context Protocol**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/download
- **LM Studio**: https://lmstudio.ai

---

**NetContext MCP - Network automation through natural language**

*Independent project, not affiliated with Anthropic, HP, Aruba, Ubiquiti, or any vendor.*
