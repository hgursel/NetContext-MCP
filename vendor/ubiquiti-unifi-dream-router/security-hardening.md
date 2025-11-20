# Ubiquiti UniFi Dream Router 7 - Security Hardening Guide

**Based on**: UniFi Security Best Practices and Community Guidelines
**Target Platform**: UniFi Dream Router 7 (UDR7)
**Last Updated**: 2025-11-17

## Security Hardening Checklist

### Authentication and Authorization
- [x] Strong admin password (16+ characters, complexity)
- [x] Two-factor authentication enabled
- [x] Local emergency admin account maintained
- [x] SSH access limited to diagnostics only
- [x] SSH disabled when not actively troubleshooting
- [x] Regular password rotation policy (90 days)

### Network Security
- [x] WPA3 enabled for all internal WiFi networks
- [x] Guest network isolation enabled
- [x] VLAN segmentation implemented
- [x] Inter-VLAN firewall rules configured
- [x] IoT devices isolated from critical networks
- [x] Default passwords changed on all devices

### Threat Management
- [x] IDS/IPS enabled and configured
- [x] Automatic threat signature updates enabled
- [x] Traffic inspection (DPI) enabled
- [x] Geo-IP filtering configured (optional)
- [x] Content filtering enabled (if required)
- [x] Regular threat log reviews

### Firmware and Updates
- [x] Latest stable firmware installed
- [x] Automatic update notifications enabled
- [x] Regular firmware update schedule
- [x] Configuration backups before updates
- [x] Testing updates in maintenance windows

### Access Control
- [x] Management access restricted to trusted networks
- [x] SSH disabled by default
- [x] Strong WiFi passwords (16+ characters)
- [x] MAC address filtering (optional, for sensitive networks)
- [x] Client device isolation on guest networks
- [x] Hidden SSIDs for management networks (optional)

### Monitoring and Logging
- [x] System logging enabled
- [x] Alert notifications configured
- [x] Regular security log reviews
- [x] Anomaly detection monitoring
- [x] Client connection monitoring
- [x] Bandwidth usage tracking

---

## Authentication and Access Control

### Admin Account Security

**Strong Password Requirements:**
```
UniFi Network UI:
Settings → System → Advanced → Authentication
- Username: admin (or custom)
- Password Requirements:
  - Minimum 16 characters
  - Mix of uppercase, lowercase, numbers, symbols
  - Avoid dictionary words
  - Example: X9#mK2$pL5@nR8!qW3
- Enable Password Complexity Requirements
```

**Two-Factor Authentication:**
```
Settings → System → Advanced → Authentication
- Enable Two-Factor Authentication
- Use authenticator app (Google Authenticator, Authy, etc.)
- Save backup codes in secure location
- Required for remote access
```

**Password Rotation Policy:**
```
Recommended Schedule:
- Admin accounts: Every 90 days
- User accounts: Every 180 days
- WiFi passwords: Every 90-180 days
- Service accounts: Annual review

Document password changes:
- Change date
- Changed by (admin name)
- Reason for change
```

### SSH Access Security

**Enable SSH Only When Needed:**
```
UniFi Network UI:
Settings → System → Advanced → Console Settings
- SSH Access: Disabled (default)
- Enable only for active troubleshooting
- Disable immediately after completion

SSH Login:
ssh root@<device-ip>
Password: <admin-password>
```

**SSH Security Best Practices:**
```
1. Enable SSH only during troubleshooting sessions
2. Use strong password authentication
3. Consider SSH key authentication for advanced users
4. Monitor SSH access logs: cat /var/log/messages | grep ssh
5. Disable SSH when not in use
6. Never leave SSH enabled indefinitely
7. Document SSH access events
```

**SSH Key Authentication (Advanced):**
```bash
# Generate SSH key pair on local machine
ssh-keygen -t rsa -b 4096 -C "admin@unifi-udr7"

# Copy public key to device
ssh-copy-id root@<device-ip>

# Test key-based authentication
ssh root@<device-ip>
```

---

## Network Segmentation and Isolation

### VLAN Design for Security

**Recommended VLAN Structure:**

**VLAN 1 (Default) - Management:**
```
Purpose: UniFi device management and admin access
Network: 192.168.1.0/24
Gateway: 192.168.1.1
DHCP: 192.168.1.100-254
Devices: Admin workstations, UniFi devices
Security: High - Restricted access only
```

**VLAN 100 - Corporate LAN:**
```
Purpose: Corporate workstations and trusted devices
Network: 10.0.100.0/24
Gateway: 10.0.100.1
DHCP: 10.0.100.100-254
Devices: Employee computers, printers, corporate servers
Security: Medium - Standard firewall rules
```

**VLAN 210 - Guest Network:**
```
Purpose: Guest WiFi and temporary access
Network: 10.0.210.0/24
Gateway: 10.0.210.1
DHCP: 10.0.210.100-254
Devices: Guest devices, temporary access
Security: Low - Internet only, isolated from other VLANs
Firewall: Block all inter-VLAN traffic
```

**VLAN 220 - IoT Devices:**
```
Purpose: Smart home, IoT, IP cameras
Network: 10.0.220.0/24
Gateway: 10.0.220.1
DHCP: 10.0.220.100-254
Devices: Smart TVs, cameras, thermostats, etc.
Security: Medium - Internet + specific LAN services
Firewall: Block direct access to corporate VLAN
```

**VLAN 230 - Surveillance:**
```
Purpose: Security cameras and NVR (UniFi Protect)
Network: 10.0.230.0/24
Gateway: 10.0.230.1
DHCP: 10.0.230.100-254
Devices: IP cameras, NVR, video management
Security: High - Isolated, no internet access
Firewall: Allow only from management VLAN
```

### Firewall Rules for Inter-VLAN Security

**Block Guest Network from All Internal Networks:**
```
UniFi Network UI:
Settings → Security → Firewall → Create New Rule

Rule: Block-Guest-to-Internal
- Type: LAN In
- Action: Drop
- Protocol: All
- Source: Guest Network (10.0.210.0/24)
- Destination: Address Group (All Internal Networks)
  - 192.168.1.0/24 (Management)
  - 10.0.100.0/24 (Corporate)
  - 10.0.220.0/24 (IoT)
  - 10.0.230.0/24 (Surveillance)
- Logging: Enable
- Apply
```

**Block IoT from Corporate Network:**
```
Rule: Block-IoT-to-Corporate
- Type: LAN In
- Action: Drop
- Protocol: All
- Source: IoT-Devices (10.0.220.0/24)
- Destination: Corporate (10.0.100.0/24)
- Logging: Enable
- Apply
```

**Allow IoT to Specific Services (DNS, NTP):**
```
Rule: Allow-IoT-Essential-Services
- Type: LAN In
- Action: Accept
- Protocol: TCP/UDP
- Source: IoT-Devices (10.0.220.0/24)
- Destination: Gateway IP (10.0.220.1)
- Port: 53 (DNS), 123 (NTP)
- Apply
```

**Isolate Surveillance from Internet:**
```
Rule: Block-Surveillance-Internet
- Type: Internet Out
- Action: Drop
- Protocol: All
- Source: Surveillance (10.0.230.0/24)
- Destination: Any
- Logging: Enable
- Apply
```

**Allow Management Access to All VLANs:**
```
Rule: Allow-Management-All-VLANs
- Type: LAN In
- Action: Accept
- Protocol: All
- Source: Management (192.168.1.0/24)
- Destination: Any (All VLANs)
- Apply
```

---

## WiFi Security Configuration

### WPA3 Configuration

**Corporate WiFi (WPA3):**
```
UniFi Network UI:
Settings → WiFi → Corporate WiFi → Security

- Security Protocol: WPA3 Personal
- Password: Strong 16+ character password
- PMF (Protected Management Frames): Required
- Fast Roaming (802.11r): Enable
- WiFi 6E (6GHz): Enable
- Band Steering: Prefer 5GHz/6GHz
```

**Mixed WPA2/WPA3 (Compatibility Mode):**
```
Settings → WiFi → Corporate WiFi → Security

- Security Protocol: WPA2/WPA3 Personal
- Password: Same strong password
- PMF: Optional (for compatibility)
- Use when legacy devices don't support WPA3
- Gradually transition to WPA3-only as devices update
```

### Guest Network Security

**Isolated Guest WiFi:**
```
Settings → WiFi → Guest WiFi

Basic Settings:
- Name: Guest-WiFi
- Password: GuestPassword123! (change regularly)
- Security: WPA2/WPA3
- Network: Guest-WiFi (VLAN 210)

Advanced Settings:
- Guest Policy: Enable
- Client Device Isolation: Enable
- Block LAN Access: Enable
- VLAN: 210
- Portal: Optional (captive portal for guests)
```

**Guest Network Portal (Optional):**
```
Settings → Guest Control

- Enable Guest Portal
- Authentication: None, Password, or Voucher
- Terms of Service: Enable (recommended)
- Access Duration: 24 hours (adjust as needed)
- Bandwidth Limit: 50 Mbps down / 25 Mbps up
- Upload/Download Limits: Optional
```

### IoT WiFi Security

**IoT-Only WiFi Network (2.4GHz):**
```
Settings → WiFi → Create New

- Name: IoT-Devices (or hidden SSID)
- Password: Strong IoT password
- Security: WPA2/WPA3
- Band: 2.4GHz only (most IoT devices)
- Network: IoT-Devices (VLAN 220)
- Client Device Isolation: Enable
- Hide SSID: Optional (additional security)
```

**MAC Address Filtering (Optional):**
```
Settings → WiFi → IoT-Devices → MAC Filtering

- Enable MAC Address Filtering
- Policy: Whitelist (Allow Listed)
- Add MAC addresses of authorized IoT devices
- Note: Adds security but increases management overhead
```

---

## Threat Management and IDS/IPS

### Intrusion Detection and Prevention

**Enable IDS/IPS:**
```
UniFi Network UI:
Settings → Security → Threat Management

- IDS/IPS: Enable
- Mode: Prevention (blocks threats)
- Signature Updates: Automatic
- Update Frequency: Daily
- Categories:
  - Critical: Enable all
  - High: Enable all
  - Medium: Enable (review logs)
  - Low: Optional (may cause false positives)
```

**IDS/IPS Performance Impact:**
```
Expected Throughput with IDS/IPS:
- UDR7 Rated: 2.3 Gbps IDS/IPS throughput
- With IPS enabled: ~2.0-2.3 Gbps
- Without IPS: Full wire speed (10 Gbps WAN capable)

Recommendation:
- Enable IPS for security-critical deployments
- Monitor CPU usage: ubnt-systool cputemp via SSH
- Disable if throughput falls below requirements
```

**Threat Categories to Enable:**

| Category | Enable | Description |
|----------|--------|-------------|
| Malware | ✅ Yes | Malware, trojans, ransomware |
| Exploit | ✅ Yes | Known exploit attempts |
| Vulnerability | ✅ Yes | Vulnerability scanning |
| Botnet | ✅ Yes | Botnet C&C communication |
| Phishing | ✅ Yes | Phishing attempts |
| DoS/DDoS | ✅ Yes | Denial of service attacks |
| Policy Violation | ⚠️ Optional | Policy-based violations |
| Info Leak | ⚠️ Optional | Information leakage |

### Deep Packet Inspection (DPI)

**Enable Traffic Inspection:**
```
Settings → Security → Traffic Identification

- Deep Packet Inspection: Enable
- Application Identification: Enable
- Traffic Classification: Enable
- Historical Data: 30 days (adjust as needed)

Benefits:
- Detailed traffic analytics
- Application-level visibility
- Bandwidth usage per application
- Security anomaly detection
```

### Geo-IP Filtering (Optional)

**Block Traffic from Specific Countries:**
```
Settings → Security → Firewall → Create New Rule

Rule: Block-High-Risk-Countries
- Type: Internet In
- Action: Drop
- Protocol: All
- Source: Country (e.g., high-risk regions)
- Destination: Any
- Logging: Enable
- Apply

Note: Requires GeoIP database updates
May block legitimate traffic (VPNs, travel)
```

---

## Content Filtering and Parental Controls

### DNS-Based Content Filtering

**Configure Safe DNS Providers:**
```
Settings → Internet → WAN → DNS

Option 1: Cloudflare Family (Malware + Adult Content)
- Primary DNS: 1.1.1.3
- Secondary DNS: 1.0.0.3

Option 2: OpenDNS Family Shield (Malware + Adult)
- Primary DNS: 208.67.222.123
- Secondary DNS: 208.67.220.123

Option 3: Quad9 (Malware Blocking)
- Primary DNS: 9.9.9.9
- Secondary DNS: 149.112.112.112
```

**Per-Network DNS Override:**
```
Settings → Networks → Select Network → Advanced

- DHCP DNS Server: Custom
- DNS Server 1: 1.1.1.3 (filtered)
- DNS Server 2: 1.0.0.3 (filtered)
- Apply to specific VLANs (e.g., Guest, IoT)
```

### Traffic and Content Rules

**Block Specific Websites/Domains:**
```
Settings → Security → Traffic Rules → Create New

Rule: Block-Social-Media (example)
- Action: Block
- Protocol: All
- Source: Corporate (10.0.100.0/24)
- Destination: Domain Group
  - facebook.com
  - instagram.com
  - twitter.com (if policy requires)
- Schedule: Business Hours (8 AM - 5 PM)
- Apply
```

---

## Monitoring and Logging

### System Logging Configuration

**Enable Comprehensive Logging:**
```
UniFi Network UI:
Settings → System → Logs

- System Logs: Enable
- Event Logs: Enable
- Log Level: Info (or Debug for troubleshooting)
- Log Retention: 30 days
- Remote Logging: Optional (syslog server)
```

**SSH Command for Log Review:**
```bash
# View recent system logs
cat /var/log/messages | tail -100

# Search for authentication events
grep -i "auth\|ssh\|login" /var/log/messages

# Monitor logs in real-time
tail -f /var/log/messages

# View firewall drops
grep -i "firewall\|drop\|block" /var/log/messages
```

### Alert Notifications

**Configure Email Alerts:**
```
Settings → System → Notifications

- Enable Notifications
- Email: admin@company.com
- SMTP Server: mail.company.com
- SMTP Port: 587 (TLS)
- Authentication: Username/Password

Alert Types to Enable:
- Device Disconnected
- Firmware Available
- High CPU/Memory Usage
- IDS/IPS Threat Detected
- SSH Access
- Configuration Changed
```

### Security Audit Schedule

**Daily Review:**
```
- Check dashboard for critical alerts
- Review threat management logs
- Verify all devices online
- Check unusual bandwidth usage
```

**Weekly Review:**
```
- Review firewall logs for blocked traffic
- Check authentication logs for failed logins
- Review DPI traffic statistics
- Verify backup completion status
```

**Monthly Security Audit:**
```bash
# SSH into device
ssh root@<device-ip>

# System information
info
ubnt-device-info summary
uptime

# Network status
ifconfig
netstat -plant
arp -a

# Check for unauthorized services
ps aux | grep -E "ssh|telnet|ftp"

# Review recent logs
cat /var/log/messages | grep -E "auth|fail|error|alert" | tail -100

# Temperature monitoring
ubnt-systool cputemp
sensors
```

**Quarterly Security Tasks:**
```
1. Firmware update review and planning
2. Password rotation (admin, WiFi)
3. User account audit
4. Firewall rule review and optimization
5. IDS/IPS signature update verification
6. Full configuration backup
7. Disaster recovery test (backup restore)
```

---

## Secure Firmware Management

### Firmware Update Best Practices

**Pre-Update Checklist:**
```
1. Review release notes for breaking changes
2. Create full configuration backup
3. Document current firmware version
4. Schedule maintenance window (low traffic)
5. Verify backup integrity
6. Test in lab environment if possible
7. Notify users of planned maintenance
```

**Firmware Update Process:**
```
UniFi Network UI:
Settings → System → Device → Update

1. Check for Updates
2. Review changelog and known issues
3. Create backup: Settings → System → Backup → Download
4. Initiate update during maintenance window
5. Monitor update progress (do not interrupt)
6. Wait for device reboot (3-5 minutes)
7. Verify functionality post-update
8. Test critical services (VPN, firewall, WiFi)
9. Monitor for 24-48 hours
10. Document update completion
```

**SSH Firmware Update (Advanced):**
```bash
# Check current version
ssh root@<device-ip>
info

# Update via URL (if available)
upgrade https://dl.ui.com/unifi/firmware/<version>/firmware.bin

# Alternative update method
fwupdate --url https://<firmware-url>

# Monitor update progress
tail -f /var/log/messages

# Reboot after update
reboot
```

**Rollback Plan:**
```
If update causes issues:
1. Access device via SSH or console
2. Restore previous configuration backup
3. Settings → System → Restore → Upload backup
4. If device is bricked: Hardware reset required
5. Document issues for Ubiquiti support
```

---

## Incident Response Procedures

### Security Event Response

**Unauthorized Access Attempt:**
```
1. Review authentication logs:
   ssh root@<ip>
   grep -i "fail\|deny\|auth" /var/log/messages | tail -50

2. Identify source IP address
3. Create firewall rule to block source:
   Settings → Security → Firewall → Create New Rule
   - Type: WAN In
   - Action: Drop
   - Source: <attacker-ip>
   - Destination: Any
   - Logging: Enable

4. Review all recent logins: last | head -20
5. Change admin passwords if compromise suspected
6. Enable 2FA if not already enabled
7. Document incident with timestamps
8. Consider reporting to ISP if severe
```

**Malware/Botnet Detection:**
```
1. Review IDS/IPS alerts:
   Settings → Security → Threat Management → Threats

2. Identify infected device (IP/MAC address)
3. Isolate device immediately:
   Settings → Client Devices → [Device] → Block

4. Quarantine VLAN (optional):
   - Move device to isolated VLAN
   - Block all outbound traffic except remediation

5. Notify device owner
6. Require device scan/cleanup before reconnection
7. Document threat details and remediation
8. Review other devices for similar indicators
```

**DDoS Attack Response:**
```
1. Verify attack via traffic graphs and logs
2. Identify attack type (SYN flood, UDP flood, etc.)
3. Enable rate limiting if available
4. Contact ISP for upstream filtering
5. Consider temporary service disruption
6. Document attack characteristics
7. Review and strengthen firewall rules post-attack
```

**WiFi Security Breach:**
```
1. Immediately change WiFi passwords
2. Review connected clients:
   ssh root@<ip>
   iw dev wlan0 station dump  # 2.4GHz
   iw dev wlan1 station dump  # 5GHz
   iw dev wlan2 station dump  # 6GHz

3. Disconnect all clients
4. Enable MAC filtering temporarily
5. Review DHCP leases: cat /mnt/data/udapi-config/dnsmasq.lease
6. Change network encryption to WPA3
7. Document unauthorized devices
8. Implement additional monitoring
```

---

## Compliance and Best Practices

### PCI-DSS Considerations (if applicable)

```
If processing payment card data:
1. Network segmentation (dedicated VLAN for POS)
2. Strong encryption (WPA3 for wireless)
3. Unique passwords for all accounts
4. Multi-factor authentication
5. Regular security updates and patches
6. Firewall rules restricting cardholder data access
7. Logging and monitoring enabled
8. Regular security audits
9. Documented security policies
10. Consult PCI-DSS QSA for full compliance
```

### HIPAA Considerations (if applicable)

```
If handling healthcare data:
1. Network encryption (WPA3, VPN)
2. Access controls and audit logs
3. Automatic logoff/timeout
4. Data encryption in transit and at rest
5. Business Associate Agreements (BAAs)
6. Risk analysis and management
7. Incident response procedures
8. Regular staff training
9. Physical security controls
10. Consult HIPAA compliance expert
```

### General Security Best Practices

**Network Security:**
- ✅ Implement least privilege access
- ✅ Use defense in depth (multiple security layers)
- ✅ Regular security training for administrators
- ✅ Document all configuration changes
- ✅ Test disaster recovery procedures quarterly
- ✅ Monitor security advisories from Ubiquiti
- ✅ Subscribe to security mailing lists
- ✅ Participate in community security discussions

**Operational Security:**
- ✅ Maintain offline configuration backups
- ✅ Test backups regularly (quarterly restore test)
- ✅ Keep detailed network documentation
- ✅ Use configuration management tools
- ✅ Implement change control procedures
- ✅ Document security incidents
- ✅ Conduct regular security audits
- ✅ Review and update security policies annually

---

## Security Audit Checklist

### Monthly Security Audit

```bash
# 1. System Status
ssh root@<device-ip>
info                          # Firmware version
uptime                        # System stability
ubnt-systool cputemp          # Temperature check
sensors                       # Hardware health

# 2. Network Status
ifconfig                      # Interface status
netstat -plant                # Listening services
arp -a | wc -l                # ARP table size
ip route                      # Routing verification

# 3. Security Logs
grep -i "auth\|fail" /var/log/messages | tail -50  # Failed auth
grep -i "firewall" /var/log/messages | tail -50    # Firewall events
grep -i "ssh" /var/log/messages | tail -50         # SSH access

# 4. Connected Devices
cat /mnt/data/udapi-config/dnsmasq.lease            # DHCP clients
iw dev wlan0 station dump | grep -c "Station"      # WiFi clients

# 5. Threat Detection
# Review IDS/IPS logs via UI: Settings → Security → Threat Management
```

### Quarterly Security Review

```
☐ Firmware up to date
☐ All passwords rotated (90-day cycle)
☐ User accounts reviewed and cleaned
☐ Firewall rules reviewed and optimized
☐ IDS/IPS signatures updated
☐ Backup/restore tested successfully
☐ Documentation updated
☐ Security training completed
☐ Vulnerability scan performed (if tools available)
☐ Penetration test scheduled (annual)
```

---

## References

- **Ubiquiti Security Advisories**: https://community.ui.com/releases
- **UniFi Security Best Practices**: https://help.ui.com (search security)
- **Community Security Discussions**: https://community.ui.com
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **SANS Security Resources**: https://www.sans.org/security-resources/
- **NetContext Repository**: `ubiquiti-unifi-dream-router/commands.yml`

---

## Important Security Notices

**⚠️ SSH Access Warning:**
- Ubiquiti does not officially support CLI-based configuration
- SSH access should be limited to diagnostics only
- Incorrect CLI commands can break your deployment
- UI-based changes will override CLI modifications
- Always create backups before making changes

**🔒 Security Philosophy:**
- Defense in depth: Multiple security layers
- Least privilege: Minimal access required
- Regular updates: Stay current with firmware
- Monitoring: Active threat detection and response
- Documentation: Maintain security audit trail

**📞 Support and Incident Reporting:**
- Security issues: Report to Ubiquiti support
- Critical vulnerabilities: security@ui.com
- Community assistance: https://community.ui.com
- Emergency response: Maintain vendor support contract
