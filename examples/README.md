# NetContext MCP Examples

This directory contains example configurations and test topologies for NetContext MCP servers.

---

## Files

### IDE Configurations

- **claude-code-config.json** - Ready-to-use configuration for Claude Code
- **cursor-mcp-config.json** - Ready-to-use configuration for Cursor IDE

### Testing

- **gns3-topology.gns3** - GNS3 network topology for local testing
- **README.md** (this file) - Setup instructions

---

## Quick Start with Claude Code

### 1. Build MCP Servers

```bash
cd /path/to/netcontext-mcp
npm install
npm run build
```

### 2. Configure Claude Code

**macOS/Linux:**
```bash
cp examples/claude-code-config.json ~/.claude.json
```

**Windows:**
```powershell
copy examples\claude-code-config.json %USERPROFILE%\.claude.json
```

### 3. Edit Configuration

Open `~/.claude.json` and update:

- `args` paths to match your installation location
- `NETCONTEXT_REPO_PATH` to your repo path
- `DEVICE_USERNAME` and `DEVICE_PASSWORD` (or use SSH keys)

**Example:**
```json
{
  "mcpServers": {
    "netcontext-docs": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/hakan/netcontext-mcp/packages/docs-mcp/dist/index.js"
      ],
      "env": {
        "NETCONTEXT_REPO_PATH": "/Users/hakan/netcontext-mcp"
      }
    },
    "netcontext-network": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/hakan/netcontext-mcp/packages/network-mcp/dist/index.js"
      ],
      "env": {
        "DEVICE_USERNAME": "admin",
        "DEVICE_PRIVATE_KEY": "/Users/hakan/.ssh/id_rsa"
      }
    }
  }
}
```

### 4. Restart Claude Code

Quit and restart Claude Code completely to load the MCP servers.

### 5. Verify Installation

Ask Claude:
```
"List available network vendors"
```

Expected response: Should show `hp-aruba-procurve` vendor.

---

## Testing with GNS3

### Prerequisites

- GNS3 installed (version 2.2.x or later)
- Aruba AOS-CX simulator image (qcow2 format)
- 8GB+ RAM available

### Setup Steps

#### 1. Import Aruba Image

1. Download Aruba AOS-CX simulator from Aruba support portal
2. In GNS3: **Edit → Preferences → QEMU VMs**
3. Click **New**, select "Run this QEMU VM on my local computer"
4. Name: `Aruba-AOS-CX`
5. RAM: 4096 MB
6. Disk image: Select downloaded `arubaoscx-simulator.qcow2`
7. Network adapters: 10

#### 2. Import Topology

1. In GNS3: **File → Import portable project**
2. Select `examples/gns3-topology.gns3`
3. Wait for import to complete

#### 3. Start Topology

1. Click the green play button to start all devices
2. Wait 2-3 minutes for switches to boot

#### 4. Configure Switch Management IPs

**ACCESS-SW1** (Console via GNS3):
```
enable
configure terminal
interface vlan 1
  ip address 192.168.1.10/24
  no shutdown
  exit
hostname ACCESS-SW1
write memory
```

**DIST-SW1** (Console via GNS3):
```
enable
configure terminal
interface vlan 1
  ip address 192.168.1.1/24
  no shutdown
  exit
hostname DIST-SW1
write memory
```

#### 5. Test SSH Connectivity

From your computer (not Management PC in GNS3):
```bash
ssh admin@192.168.1.10
# Default password: admin

# Test command
show version
```

#### 6. Update Claude Code Configuration

Edit `~/.claude.json`:
```json
{
  "mcpServers": {
    "netcontext-network": {
      "env": {
        "DEVICE_USERNAME": "admin",
        "DEVICE_PASSWORD": "admin"
      }
    }
  }
}
```

#### 7. Test with Claude Code

Ask Claude:
```
"Run a health check on switch 192.168.1.10"
```

Claude will:
1. Retrieve health_check bundle
2. Execute commands via SSH
3. Return formatted output

---

## Alternative Testing: Real Hardware

### Network Setup

1. **Connect switch to network**:
   - Assign management VLAN and IP
   - Ensure reachable from your computer

2. **Enable SSH**:
   ```
   crypto key generate ssh rsa bits 2048
   ip ssh version 2
   no telnet-server
   ```

3. **Create admin user**:
   ```
   password manager user-name admin plaintext YourPassword123!
   ```

4. **Test connectivity**:
   ```bash
   ping 192.168.1.10
   ssh admin@192.168.1.10
   ```

### Security Recommendations

For real hardware testing:

1. **Use isolated network**: Don't connect production switches
2. **Use SSH keys**: Generate key pair and disable password auth
3. **Limit access**: Configure `ip authorized-managers` ACL
4. **Enable logging**: Monitor all SSH sessions
5. **Backup config**: Before testing, backup current configuration

---

## Troubleshooting

### Claude Code Not Finding MCP Servers

**Check configuration path**:
- macOS/Linux: `~/.claude.json`
- Windows: `%USERPROFILE%\.claude.json`

**Verify JSON syntax**:
```bash
cat ~/.claude.json | python3 -m json.tool
```

**Check Claude Code logs**:
```bash
tail -f ~/.claude/logs/mcp.log
```

### GNS3 Switch Not Booting

**Symptoms**: Console shows errors or blank screen

**Solutions**:
- Increase RAM to 4096 MB
- Verify qcow2 image is not corrupted
- Check GNS3 VM has enough resources allocated
- Review GNS3 console output for specific errors

### SSH Connection Refused

**Symptoms**: `Connection refused` or `No route to host`

**Solutions**:
- Verify switch IP with `show interface vlan 1`
- Ping switch from your computer: `ping 192.168.1.10`
- Check firewall rules on your computer
- Ensure switch is in same subnet or routable

### Authentication Failed

**Symptoms**: `Permission denied (publickey,password)`

**Solutions**:
- Verify username/password are correct
- Check `show users` on switch for configured users
- If using SSH keys, verify key format and permissions
- Try password auth first, then switch to keys

---

## Advanced Usage

### Using SSH Keys (Recommended)

#### 1. Generate SSH Key Pair

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/netcontext_rsa
```

#### 2. Copy Public Key to Switch

```bash
# On switch
configure terminal
ip ssh pubkey-auth
crypto key pubkey-chain ssh
  user-key admin rsa
    key-string row AAAA...your-public-key...==
    exit
  exit
write memory
```

#### 3. Update Claude Code Configuration

```json
{
  "mcpServers": {
    "netcontext-network": {
      "env": {
        "DEVICE_USERNAME": "admin",
        "DEVICE_PRIVATE_KEY": "/Users/hakan/.ssh/netcontext_rsa"
      }
    }
  }
}
```

### Using Environment Variables

**For better security**, don't store credentials in `~/.claude.json`:

#### 1. Set Environment Variables

**macOS/Linux** (add to `~/.bashrc` or `~/.zshrc`):
```bash
export DEVICE_USERNAME=admin
export DEVICE_PRIVATE_KEY=/Users/hakan/.ssh/netcontext_rsa
```

**Windows** (PowerShell):
```powershell
[Environment]::SetEnvironmentVariable("DEVICE_USERNAME", "admin", "User")
[Environment]::SetEnvironmentVariable("DEVICE_PRIVATE_KEY", "C:\Users\hakan\.ssh\netcontext_rsa", "User")
```

#### 2. Simplify Claude Code Configuration

```json
{
  "mcpServers": {
    "netcontext-network": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/netcontext-mcp/packages/network-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

Credentials will be inherited from environment variables.

---

## Additional Resources

- **Main README**: ../README.md
- **Implementation Workflow**: ../../docs/implementation-workflow.md
- **Contributing Guide**: ../CONTRIBUTING.md
- **GNS3 Documentation**: https://docs.gns3.com
- **Aruba Documentation**: https://www.arubanetworks.com/techdocs

---

## Support

If you encounter issues:

1. Check this README first
2. Review main README troubleshooting section
3. Search GitHub Issues
4. Open a new issue with:
   - Your operating system
   - Claude Code version
   - Error messages (sanitize credentials!)
   - Steps to reproduce

---

**Happy testing!** 🚀
