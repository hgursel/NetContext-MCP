# Security Policy

## Supported Versions

We release security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

- **Email**: security@yourdomain.com
- **PGP Key**: Available upon request

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., command injection, credential exposure, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Update Process

1. **Report received**: Security team acknowledges receipt within 48 hours
2. **Triage**: Team assesses severity and impact (24-72 hours)
3. **Fix development**: Patch developed and tested (varies by severity)
4. **Coordinated disclosure**:
   - Critical/High: Patch released immediately, public disclosure after 7 days
   - Medium: Patch released in next release, disclosure with release
   - Low: Included in regular release cycle
5. **Credit**: Reporter credited in security advisory (unless anonymity requested)

## Security Best Practices

### For Users

**Credential Management**:
- Use SSH keys instead of passwords
- Never commit credentials to version control
- Use environment variables for sensitive configuration
- Rotate credentials regularly

**Network Security**:
- Limit SSH access to authorized IP ranges
- Use jump hosts for production devices
- Enable device-side authentication logging
- Implement connection rate limiting

**Operational Security**:
- Test in isolated lab environment first
- Review command bundles before execution
- Enable audit logging on all devices
- Monitor for unusual SSH activity

### For Developers

**Code Security**:
- Input validation on all external inputs
- Command sanitization before SSH execution
- Safe YAML parsing (FAILSAFE_SCHEMA)
- Path traversal prevention
- Credential sanitization in error messages

**Dependency Security**:
- Keep dependencies updated (`npm audit`)
- Pin dependency versions (`package-lock.json`)
- Review dependency changes in PRs
- Use Snyk or similar scanning tools

**Testing**:
- Write security-focused test cases
- Test with malicious inputs
- Validate all error paths
- Mock external services in tests

## Known Security Considerations

### Command Execution
- Commands are executed via SSH shell session
- Input sanitization prevents command injection
- No privilege escalation mechanisms
- Commands logged for audit purposes

### Credential Handling
- Credentials passed via environment variables
- SSH keys preferred over passwords
- No credential persistence or caching
- Error messages sanitize sensitive data

### Network Communication
- SSH protocol provides encryption in transit
- Host key verification enabled by default
- Connection timeouts prevent resource exhaustion
- No plaintext protocols supported

## Security Features

✅ **Implemented**:
- Command input sanitization
- Path traversal prevention
- Safe YAML parsing
- SSH host key verification
- Credential sanitization in errors
- Environment-based secrets management

🚧 **Planned** (future releases):
- Rate limiting per device
- Command execution audit logging
- IP-based access control
- SSH connection pooling with limits
- Integration with secrets management systems

## Vulnerability Disclosure Policy

We follow responsible disclosure practices:

1. **Coordination**: Work with reporter to understand and fix issue
2. **Transparency**: Publish security advisories for all confirmed vulnerabilities
3. **Credit**: Acknowledge security researchers (with permission)
4. **Communication**: Keep affected users informed throughout process

## Security Advisories

Security advisories will be published at:
- GitHub Security Advisories: https://github.com/yourusername/netcontext-mcp/security/advisories
- Security mailing list: (to be established)

## Contact

- **Security Email**: security@yourdomain.com
- **General Contact**: https://github.com/yourusername/netcontext-mcp/issues

---

**Last Updated**: 2025-11-15
