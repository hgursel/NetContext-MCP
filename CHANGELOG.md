# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Command input sanitization to prevent command injection
- SSH host key verification with configurable disable option
- Path traversal prevention in vendor/role name validation
- Credential sanitization in error messages
- Safe YAML parsing with FAILSAFE_SCHEMA
- Connection state tracking to prevent race conditions
- Security policy (SECURITY.md)
- Node version specification (.nvmrc)
- Comprehensive changelog

### Changed
- Improved error handling with connection state management
- Enhanced SSH timeout handling to prevent resource leaks

### Security
- **CRITICAL**: Fixed unsafe YAML parsing that could execute arbitrary code
- **HIGH**: Added command sanitization to block dangerous operations
- **HIGH**: Implemented input validation for vendor and role names
- **MEDIUM**: Added credential sanitization in error messages
- **MEDIUM**: Enabled SSH host key verification by default

## [0.1.0] - 2025-11-15

### Added
- Initial release with two MCP servers:
  - `@netcontext/docs-mcp` - Documentation and command bundle server
  - `@netcontext/network-mcp` - Network device execution server
- HP/Aruba ProCurve vendor support with 5 command bundles:
  - health_check
  - security_audit
  - vlan_troubleshooting
  - baseline_config
  - performance_monitoring
- Comprehensive baseline configurations:
  - Access layer switches
  - Distribution layer switches with VRRP/LACP
  - Security hardening guide
- GitHub Actions CI/CD:
  - Multi-version Node.js testing
  - YAML validation
  - Security scanning with npm audit and Snyk
  - Automated npm publishing
- Example configurations:
  - Claude Code integration
  - Cursor IDE integration
  - GNS3 test topology
- Documentation:
  - Comprehensive README
  - Contributing guidelines
  - Implementation workflow for AI agents
  - Examples and testing guide

### MCP Tools

**docs-mcp**:
- `list_vendors` - List all available network vendors
- `list_bundles` - List command bundles for specific vendor
- `get_command_bundle` - Retrieve specific command bundle
- `get_baseline_config` - Get baseline configuration documents
- `search_commands` - Search commands across all vendors

**network-mcp**:
- `execute_commands` - Execute commands on single device
- `batch_execute` - Execute commands on multiple devices in parallel
- `execute_bundle` - Integration pattern for bundle execution

### Dependencies
- @modelcontextprotocol/sdk ^1.0.0
- ssh2 ^1.15.0
- js-yaml ^4.1.0
- TypeScript ^5.3.0
- Node.js >= 18.0.0

---

## Release Process

1. Update version in package.json files
2. Update CHANGELOG.md with release notes
3. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Push tag: `git push origin v0.1.0`
5. Create GitHub release (triggers automated npm publish)

## Version History

- **0.1.0** (2025-11-15): Initial release with HP/Aruba support

---

[Unreleased]: https://github.com/yourusername/netcontext-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/netcontext-mcp/releases/tag/v0.1.0
