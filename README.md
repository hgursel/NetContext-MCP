# NetContext MCP - Network Automation via Model Context Protocol

**AI-powered network automation** through Model Context Protocol servers for documentation and device execution.

[![CI](https://github.com/yourusername/netcontext-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/netcontext-mcp/actions)
[![npm](https://img.shields.io/npm/v/@netcontext/docs-mcp)](https://www.npmjs.com/package/@netcontext/docs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is NetContext MCP?

NetContext provides two specialized MCP servers that enable AI coding assistants (Claude Code, Cursor) to interact with network devices and vendor documentation:

1. **📚 Docs MCP Server** - Knowledge layer providing:
   - Vendor-specific command bundles (health checks, security audits, troubleshooting)
   - Baseline configuration templates
   - Security hardening guides
   - Command search across vendors

2. **🔧 Network MCP Server** - Execution layer providing:
   - SSH-based command execution on network devices
   - Single device and batch execution
   - Integration with command bundles
   - Secure credential management

---

## Features

- **AI-Native Workflow**: Ask Claude "Run a health check on switch 192.168.1.10" and it executes automatically
- **Vendor Documentation**: Always up-to-date command bundles for HP/Aruba switches
- **Secure Execution**: SSH key support, credential protection, timeout handling
- **Batch Operations**: Execute commands on multiple devices in parallel
- **Docker Support**: Multi-stage builds, production-ready containers, ~220MB images
- **Production-Ready**: TypeScript, CI/CD, security scanning, comprehensive error handling

---

## Quick Start

### 1. Installation

**Option A: Docker (Recommended for production)**

```bash
# Clone repository
git clone https://github.com/yourusername/netcontext-mcp.git
cd netcontext-mcp

# Configure environment
cp .env.docker.example .env
# Edit .env with your credentials

# Build and run with docker-compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

See [docs/DOCKER.md](docs/DOCKER.md) for complete Docker deployment guide.

**Option B: npm (For development)**

```bash
# Install globally via npm
npm install -g @netcontext/docs-mcp @netcontext/network-mcp

# Or build from source
git clone https://github.com/yourusername/netcontext-mcp.git
cd netcontext-mcp
npm install
npm run build
```

### 2. Configure Claude Code

Create or edit `~/.claude.json` (macOS/Linux) or `%USERPROFILE%\.claude.json` (Windows):

```json
{
  "mcpServers": {
    "netcontext-docs": {
      "type": "stdio",
      "command": "npx",
      "args": ["@netcontext/docs-mcp"],
      "env": {
        "NETCONTEXT_REPO_PATH": "/path/to/netcontext-mcp"
      }
    },
    "netcontext-network": {
      "type": "stdio",
      "command": "npx",
      "args": ["@netcontext/network-mcp"],
      "env": {
        "DEVICE_USERNAME": "admin",
        "DEVICE_PASSWORD": "your-password"
      }
    }
  }
}
```

**Security Note**: Use SSH keys instead of passwords for production. See [Security Best Practices](#security-best-practices).

### 3. Restart Claude Code

After updating the configuration, restart Claude Code to load the MCP servers.

### 4. Verify Installation

Ask Claude Code:
```
"List available network vendors"
```

Expected response should include `hp-aruba-procurve`.

---

## Usage Examples

### Getting Command Bundles

**Prompt**: "Get the health check bundle for HP Aruba switches"

**Claude will**:
1. Call `get_command_bundle(vendor="hp-aruba-procurve", bundle="health_check")`
2. Return command list with descriptions

**Output**:
```yaml
health_check:
  description: "Basic interface, VLAN, and system health"
  commands:
    - show system
    - show version
    - show interfaces brief
    - show vlan
    ...
```

### Executing Commands on a Device

**Prompt**: "Run a health check on switch 192.168.1.10"

**Claude will**:
1. Retrieve health_check bundle from Docs MCP
2. Execute commands via Network MCP: `execute_commands(host="192.168.1.10", commands=[...])`
3. Return formatted output

### Batch Execution Across Multiple Switches

**Prompt**: "Check the version on all access switches: 192.168.1.10, 192.168.1.11, 192.168.1.12"

**Claude will**:
1. Call `batch_execute(hosts=["192.168.1.10", "192.168.1.11", "192.168.1.12"], commands=["show version"])`
2. Execute in parallel
3. Return results for all devices with summary

### Getting Baseline Configurations

**Prompt**: "Show me the baseline access switch configuration for HP Aruba"

**Claude will**:
1. Call `get_baseline_config(vendor="hp-aruba-procurve", role="access")`
2. Return complete markdown documentation with example configuration

---

## Supported Vendors

| Vendor | Platform | Status | Command Bundles |
|--------|----------|--------|-----------------|
| HP/Aruba ProCurve | 2530/2920/2930F, 6200/6300 | ✅ Complete | health_check, security_audit, vlan_troubleshooting, baseline_config, performance_monitoring |
| Cisco IOS-XE | Catalyst 9000 series | 🚧 Planned | - |
| Juniper JunOS | EX/QFX series | 🚧 Planned | - |
| Arista EOS | 7000 series | 🚧 Planned | - |

**Want to add a vendor?** See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code / Cursor                    │
│                    (AI Coding Assistant)                     │
└────────────────┬────────────────────────┬────────────────────┘
                 │                        │
                 │ MCP Protocol           │ MCP Protocol
                 │                        │
    ┌────────────▼────────────┐  ┌───────▼──────────────────┐
    │   Docs MCP Server       │  │  Network MCP Server      │
    │   (@netcontext/docs-mcp)│  │  (@netcontext/network-mcp│
    │                         │  │                          │
    │  - list_vendors         │  │  - execute_commands      │
    │  - get_command_bundle   │  │  - batch_execute         │
    │  - get_baseline_config  │  │  - execute_bundle        │
    │  - search_commands      │  │                          │
    └────────────┬────────────┘  └───────┬──────────────────┘
                 │                        │
                 │ File System            │ SSH Protocol
                 │                        │
    ┌────────────▼────────────┐  ┌───────▼──────────────────┐
    │  vendor/hp-aruba-       │  │  Network Devices         │
    │  procurve/              │  │                          │
    │  - commands.yml         │  │  - 192.168.1.10 (Switch) │
    │  - baseline-access.md   │  │  - 192.168.1.11 (Switch) │
    │  - security-hardening.md│  │  - 192.168.1.12 (Switch) │
    └─────────────────────────┘  └──────────────────────────┘
```

---

## Security Best Practices

### Credential Management

**❌ Don't** hardcode passwords in `~/.claude.json`:
```json
{
  "env": {
    "DEVICE_PASSWORD": "mypassword123"
  }
}
```

**✅ Do** use SSH keys:
```json
{
  "env": {
    "DEVICE_USERNAME": "admin",
    "DEVICE_PRIVATE_KEY": "/home/user/.ssh/id_rsa"
  }
}
```

**✅ Alternative**: Use environment variables:
```bash
# In your .bashrc or .zshrc
export DEVICE_USERNAME=admin
export DEVICE_PRIVATE_KEY=/home/user/.ssh/id_rsa
```

Then in `~/.claude.json`:
```json
{
  "env": {}
}
```

### Network Security

- **Limit SSH access**: Configure `ip authorized-managers` ACL on switches
- **Use jump hosts**: Don't expose switches directly to internet
- **Enable logging**: Monitor all SSH sessions and command execution
- **Rotate credentials**: Change passwords/keys regularly
- **Principle of least privilege**: Use read-only accounts when possible

### Operational Security

- **Test in lab first**: Use GNS3 topology before production
- **Review commands**: Always check command bundles before execution
- **Backup configs**: Regular automated backups before changes
- **Audit trails**: Enable syslog and SNMP traps
- **Change management**: Follow established procedures

---

## Development

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- TypeScript 5.x
- GNS3 (for local testing)

### Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/netcontext-mcp.git
cd netcontext-mcp

# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode (watch for changes)
npm run dev
```

### Testing

```bash
# Run tests (if available)
npm test

# Lint code
npm run lint

# Validate vendor documentation
js-yaml vendor/hp-aruba-procurve/commands.yml
```

### Local Testing with GNS3

1. Import topology: `examples/gns3-topology.gns3`
2. Start switches and configure management IPs
3. Update `~/.claude.json` with GNS3 device IPs
4. Test with Claude Code

See [GNS3 Setup Guide](examples/README.md) for details.

---

## Troubleshooting

### MCP servers not appearing in Claude Code

**Solution**:
1. Check `~/.claude.json` syntax (must be valid JSON)
2. Verify file paths in `args` are absolute and correct
3. Restart Claude Code completely
4. Check Claude Code logs: `~/.claude/logs/`

### SSH connection timeout

**Symptoms**: `Error: SSH connection timeout after 10000ms`

**Solutions**:
- Verify device IP is reachable: `ping 192.168.1.10`
- Check SSH is enabled on device: `show ip ssh`
- Verify credentials are correct
- Increase timeout: `SSH_TIMEOUT=30000` in env config
- Check firewall rules

### Commands return empty output

**Symptoms**: `output: ""`

**Solutions**:
- Increase command execution delay (modify source)
- Check device is responsive: `ssh admin@192.168.1.10`
- Verify command syntax for specific platform
- Review device logs for errors

### Permission denied errors

**Symptoms**: `Error: Permission denied (publickey,password)`

**Solutions**:
- Verify username/password are correct
- Check SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
- Ensure user has privilege level access
- Check device authentication configuration

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to add new vendors
- Command bundle format and standards
- Testing requirements
- Pull request process
- Code style guidelines

**Quick Contribution Guide**:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/cisco-ios-xe`
3. Add vendor documentation in `vendor/cisco-ios-xe/`
4. Update tests and documentation
5. Submit a pull request

---

## Roadmap

### v0.2.0 (Q1 2026)
- [ ] Cisco IOS-XE support
- [ ] Automated bundle execution (Docs + Network MCP integration)
- [ ] Configuration diff and rollback

### v0.3.0 (Q2 2026)
- [ ] Juniper JunOS support
- [ ] Network topology discovery
- [ ] Configuration compliance checking

### v1.0.0 (Q3 2026)
- [ ] Multi-vendor normalization layer
- [ ] Change management workflows
- [ ] Integration with Ansible/Terraform

See [GitHub Projects](https://github.com/yourusername/netcontext-mcp/projects) for detailed roadmap.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Anthropic**: For the Model Context Protocol specification and Claude Code
- **Aruba/HP**: For ArubaOS-Switch documentation and hardening guides
- **Community Contributors**: Thank you for vendor documentation and testing

---

## Support

- **Documentation**: Start with this README and [Implementation Workflow](../docs/implementation-workflow.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/netcontext-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/netcontext-mcp/discussions)
- **Security**: Report vulnerabilities to security@yourdomain.com

---

## Related Projects

- **Model Context Protocol**: https://modelcontextprotocol.io
- **Claude Code**: https://claude.com/claude-code
- **Cursor IDE**: https://cursor.sh
- **GNS3**: https://www.gns3.com

---

**Made with ❤️ for network engineers building with AI**

*NetContext is an independent project and is not affiliated with Anthropic, HP, Aruba, or any vendor.*
