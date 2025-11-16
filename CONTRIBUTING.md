# Contributing to NetContext MCP

Thank you for your interest in contributing to NetContext! This guide will help you add new vendors, improve documentation, and contribute code.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Adding a New Vendor](#adding-a-new-vendor)
3. [Command Bundle Standards](#command-bundle-standards)
4. [Baseline Configuration Guidelines](#baseline-configuration-guidelines)
5. [Code Contributions](#code-contributions)
6. [Testing Requirements](#testing-requirements)
7. [Pull Request Process](#pull-request-process)
8. [Code Style](#code-style)

---

## Getting Started

### Prerequisites

- Git and GitHub account
- Node.js 18+ and npm 9+
- Network device access (physical or GNS3/EVE-NG simulator)
- Familiarity with network device CLI

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/netcontext-mcp.git
cd netcontext-mcp

# Install dependencies
npm install

# Build project
npm run build

# Create a feature branch
git checkout -b feature/vendor-cisco-ios-xe
```

---

## Adding a New Vendor

### Step 1: Create Vendor Directory

```bash
mkdir -p vendor/cisco-ios-xe
```

### Step 2: Create Required Files

Every vendor directory must contain:

1. **commands.yml** - Command bundles
2. **baseline-access.md** - Access layer configuration
3. **baseline-distribution.md** - Distribution layer configuration (optional)
4. **security-hardening.md** - Security configuration guide

### Step 3: Populate commands.yml

```yaml
vendor: cisco-ios-xe
platform_notes: |
  Supports Catalyst 9000 series switches running IOS-XE 17.x
  Commands tested on IOS-XE 17.9.x

bundles:
  health_check:
    description: "Basic health check commands"
    last_updated: "2025-11-15"
    commands:
      - show version
      - show interfaces status
      - show vlan brief
      - show spanning-tree summary
      - show environment all

  security_audit:
    description: "Security configuration audit"
    last_updated: "2025-11-15"
    commands:
      - show running-config | include username
      - show ip ssh
      - show ip access-lists
      - show port-security
      - show authentication sessions
```

**Quality Checklist**:
- [ ] All commands tested on real/simulated device
- [ ] Commands are idempotent (safe to run repeatedly)
- [ ] No disruptive commands (reload, shutdown, erase)
- [ ] Platform notes specify supported models and firmware versions
- [ ] Last updated date is current

### Step 4: Write Baseline Configurations

See existing `hp-aruba-procurve/baseline-access.md` as a template.

**Required Sections**:
- Configuration checklist (actionable items)
- Example configuration (copy-paste ready)
- Post-deployment validation commands
- Common issues and fixes
- Security hardening notes

**Best Practices**:
- Use placeholders for site-specific values: `${HOSTNAME}`, `${MGMT_IP}`
- Include comments explaining each section
- Provide both basic and advanced configurations
- Reference official vendor documentation

### Step 5: Write Security Hardening Guide

See `hp-aruba-procurve/security-hardening.md` as a template.

**Required Topics**:
- Password policies and authentication
- SSH configuration (disable Telnet)
- Management access restrictions
- Port security
- Network security features (DHCP snooping, DAI, 802.1X)
- SNMP security (prefer SNMPv3)
- Logging and monitoring
- Incident response procedures

**Cross-Reference Standards**:
- CIS Benchmarks (if available for vendor)
- Vendor hardening guides
- NIST Cybersecurity Framework
- Industry best practices

### Step 6: Test Your Documentation

```bash
# Validate YAML syntax
js-yaml vendor/cisco-ios-xe/commands.yml

# Test commands on real device
ssh admin@192.168.1.10
# Paste each command from commands.yml
# Verify output is as expected

# Test baseline configuration
# Deploy to test switch
# Run validation commands
# Document any issues
```

### Step 7: Update README

Add vendor to supported vendors table in `MCP/README.md`:

```markdown
| Vendor | Platform | Status | Command Bundles |
|--------|----------|--------|-----------------|
| Cisco IOS-XE | Catalyst 9000 series | ✅ Complete | health_check, security_audit, vlan_troubleshooting |
```

---

## Command Bundle Standards

### Bundle Naming Conventions

Use lowercase with underscores:
- ✅ `health_check`
- ✅ `security_audit`
- ✅ `vlan_troubleshooting`
- ❌ `healthCheck` (camelCase)
- ❌ `Health-Check` (kebab-case with capitals)

### Standard Bundle Types

**health_check**: Weekly operational health verification
- System information (version, uptime, CPU, memory)
- Interface status
- VLAN configuration
- Spanning tree status
- PoE status (if applicable)
- Temperature/environmental monitoring

**security_audit**: Monthly security compliance check
- Running configuration
- Authentication configuration
- SSH settings
- Access control lists
- Port security status
- SNMP configuration
- Logging configuration

**vlan_troubleshooting**: VLAN connectivity diagnostics
- VLAN database
- Port VLAN assignments
- MAC address table
- Spanning tree topology
- Trunk configuration
- LACP status

**baseline_config**: New device deployment
- Hostname, time zone, NTP
- Management VLAN and IP
- Administrative credentials
- SSH configuration
- Logging and SNMP
- Basic security hardening

**performance_monitoring**: Resource utilization tracking
- CPU utilization
- Memory usage
- Interface statistics
- Buffer utilization
- Process monitoring
- Recent log messages

### Command Guidelines

**DO**:
- Use `show` commands only (read-only)
- Include comments explaining each command
- Group related commands together
- Test on multiple device models if possible
- Document any version-specific commands

**DON'T**:
- Include `configure` or `enable` mode commands
- Use destructive commands (`reload`, `shutdown`, `erase`)
- Hardcode site-specific values (use placeholders)
- Include commands that require interactive input
- Use deprecated or obsolete commands

---

## Baseline Configuration Guidelines

### Structure

```markdown
# Vendor Platform - Role Configuration

**Target Platforms**: Specific models
**Role**: Access/Distribution/Core
**Last Updated**: YYYY-MM-DD

## Configuration Checklist
- [ ] Item 1
- [ ] Item 2

## Example Configuration
\`\`\`
configuration here
\`\`\`

## Post-Deployment Validation
\`\`\`
validation commands here
\`\`\`

## Common Issues and Fixes
### Issue: Description
**Solution**: Fix

## Security Hardening Notes
- Hardening tip 1
- Hardening tip 2

## References
- Official documentation links
```

### Configuration Quality Standards

- **Production-Ready**: Configuration should work as-is with minimal modifications
- **Commented**: Explain complex sections
- **Modular**: Separate sections for easy navigation
- **Secure by Default**: Include basic security hardening
- **Validated**: Tested on real or simulated devices

---

## Code Contributions

### MCP Server Enhancements

When modifying TypeScript code:

1. **Maintain backward compatibility** unless major version bump
2. **Update type definitions** for any schema changes
3. **Add error handling** for new failure modes
4. **Update tests** (when test suite is implemented)
5. **Document breaking changes** in CHANGELOG.md

### Example: Adding a New Tool

```typescript
// 1. Add tool definition
const TOOLS: Tool[] = [
  // ... existing tools
  {
    name: "get_running_config",
    description: "Retrieve running configuration from device",
    inputSchema: {
      type: "object",
      properties: {
        host: {
          type: "string",
          description: "Device IP address or hostname",
        },
        section: {
          type: "string",
          description: "Optional: Config section (e.g., 'interface', 'vlan')",
        },
      },
      required: ["host"],
    },
  },
];

// 2. Implement handler in CallToolRequestSchema
case "get_running_config": {
  const host = args?.host as string;
  const section = args?.section as string | undefined;

  if (!host) {
    throw new Error("host parameter is required");
  }

  const command = section
    ? `show running-config ${section}`
    : "show running-config";

  const result = await executeSingleDevice(host, [command]);

  return {
    content: [{ type: "text", text: result.output }],
    isError: !!result.error,
  };
}
```

---

## Testing Requirements

### Vendor Documentation Testing

**Manual Testing Checklist**:
- [ ] All commands in bundles execute without errors
- [ ] Baseline configuration deploys successfully
- [ ] Validation commands confirm correct configuration
- [ ] Security hardening steps are effective

**Automated Testing** (when available):
```bash
npm test
```

### Integration Testing

**Test with Claude Code**:
1. Configure MCP servers with test devices
2. Test each bundle: "Run health_check on device X"
3. Test baseline retrieval: "Show baseline access config for vendor Y"
4. Test search: "Find commands related to VLAN"
5. Test error handling: Use invalid device IP, wrong credentials

**Test with GNS3**:
1. Import `examples/gns3-topology.gns3`
2. Configure switches according to baseline
3. Execute all command bundles
4. Verify output matches expected results

---

## Pull Request Process

### Before Submitting

1. **Test thoroughly**: All commands, configurations, and code changes
2. **Update documentation**: README, CHANGELOG, comments
3. **Run quality checks**:
   ```bash
   npm run build      # Must succeed
   npm run lint       # Must pass (if available)
   npm audit          # Review security warnings
   ```
4. **Review changes**: Use `git diff` to verify no unintended changes

### Submitting PR

1. **Create descriptive branch name**:
   - `feature/cisco-ios-xe-support`
   - `fix/ssh-timeout-handling`
   - `docs/improve-security-guide`

2. **Write clear commit messages**:
   ```
   Add Cisco IOS-XE vendor support

   - Add commands.yml with 5 standard bundles
   - Create baseline-access.md configuration
   - Create security-hardening.md guide
   - Update README with vendor support
   - Tested on Catalyst 9300 IOS-XE 17.9.4
   ```

3. **Fill out PR template**:
   - Describe what changed and why
   - Reference related issues: `Fixes #123`
   - List testing performed
   - Note breaking changes (if any)

4. **Respond to reviews**: Address feedback promptly and professionally

### PR Review Criteria

Reviewers will check:
- [ ] Code compiles and builds successfully
- [ ] Documentation is clear and complete
- [ ] Commands tested on appropriate devices
- [ ] Security best practices followed
- [ ] No credentials or sensitive data in commits
- [ ] CHANGELOG.md updated (for significant changes)

---

## Code Style

### TypeScript

- **Use TypeScript strict mode**: Enabled in `tsconfig.json`
- **Explicit types**: Avoid `any`, use specific types or interfaces
- **Async/await**: Prefer over callbacks or raw promises
- **Error handling**: Always handle errors, don't silently fail
- **Comments**: Explain complex logic, avoid obvious comments

**Example**:
```typescript
// ✅ Good
async function getCommandBundle(
  vendor: string,
  bundleName: string
): Promise<CommandBundle | null> {
  try {
    const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");
    const fileContent = await fs.readFile(commandsPath, "utf-8");
    const data = yaml.load(fileContent) as CommandBundle;

    if (!data.bundles[bundleName]) {
      return null;
    }

    return { vendor: data.vendor, bundles: { [bundleName]: data.bundles[bundleName] } };
  } catch (error) {
    console.error(`Error loading bundle for ${vendor}:`, error);
    return null;
  }
}

// ❌ Bad
async function getCommandBundle(vendor, bundleName) {
  const data: any = yaml.load(fs.readFileSync(`vendor/${vendor}/commands.yml`));
  return data.bundles[bundleName];
}
```

### YAML

- **Indentation**: 2 spaces
- **Quotes**: Use double quotes for strings with special characters
- **Comments**: Explain non-obvious configurations

### Markdown

- **Headers**: Use ATX style (`# Header` not `Header\n======`)
- **Code blocks**: Always specify language (```bash, ```yaml, ```typescript)
- **Lists**: Use `-` for unordered, numbers for ordered
- **Links**: Use reference-style for repeated links

---

## Community Guidelines

### Be Respectful

- Assume good intentions
- Provide constructive feedback
- Welcome newcomers
- Respect different experience levels

### Be Helpful

- Answer questions when you can
- Share knowledge and resources
- Improve documentation
- Help with testing

### Be Professional

- Focus on technical merits
- Avoid personal attacks
- Keep discussions on-topic
- Follow code of conduct

---

## Questions?

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Report bugs, request features
- **Documentation**: Check README and implementation guide first

---

**Thank you for contributing to NetContext!** 🎉

Every contribution, big or small, helps make network automation more accessible to everyone.
