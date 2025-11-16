# HP/Aruba ProCurve Security Hardening Guide

**Based on**: ArubaOS-Switch Hardening Guide 16.x
**Target Platforms**: HP ProCurve 2530/2920/2930F, Aruba 5400R/6200/6300 Series
**Last Updated**: 2025-11-15

## Security Hardening Checklist

### Authentication and Authorization
- [x] Strong password policy enforced (complexity + minimum length)
- [x] TACACS+ or RADIUS for centralized authentication
- [x] Local emergency admin account with strong password
- [x] SSH keys for admin access (optional, higher security)
- [x] Command authorization and accounting enabled
- [x] Privilege levels configured appropriately

### Access Control
- [x] SSHv2 only, Telnet disabled
- [x] HTTP/HTTPS management disabled (if not needed)
- [x] Management access restricted to specific IP ranges
- [x] Console timeout configured
- [x] Login banner configured
- [x] Front panel password clear/factory reset disabled

### Network Security
- [x] 802.1X port authentication (for wired endpoints)
- [x] DHCP snooping enabled on untrusted ports
- [x] Dynamic ARP Inspection (DAI) enabled
- [x] IP Source Guard configured
- [x] Port security for fixed devices
- [x] Storm control for broadcast/multicast
- [x] Unused ports disabled and in isolated VLAN

### Protocol Security
- [x] SNMPv3 with authentication and encryption
- [x] Secure NTP (authentication if supported)
- [x] LLDP enabled, CDP disabled (or vice versa based on policy)
- [x] STP BPDU guard and root guard configured
- [x] Control plane policing (rate limiting)

### Monitoring and Logging
- [x] Syslog to centralized server (encrypted if possible)
- [x] Logging for authentication failures, config changes
- [x] NTP time sync for accurate log timestamps
- [x] SNMP traps for critical events
- [x] Regular log review process

### Firmware and Maintenance
- [x] Latest stable firmware installed
- [x] Configuration backups automated
- [x] Regular security audits scheduled
- [x] Change management process in place

---

## Password and Authentication

### Password Policy
```
# Enable password complexity
password minimum-length 12
password complexity enable

# Configure TACACS+ (if using centralized auth)
tacacs-server host <tacacs-server-ip> key <your-key>
aaa authentication login default tacacs local
aaa authentication enable default tacacs local

# SSH configuration
crypto key generate ssh rsa bits 2048
ip ssh version 2
no telnet-server

# Disable factory reset and password clear buttons (if supported)
no front-panel-security factory-reset
no front-panel-security password-clear
```

### Console and VTY Security
```
# Console timeout (10 minutes)
console idle-timeout 10

# Login banner
banner motd "
*******************************************************************************
* WARNING: Unauthorized access to this device is prohibited.                *
* All activities are monitored and logged.                                  *
* Violators will be prosecuted to the fullest extent of the law.            *
*******************************************************************************
"
```

---

## Access Control Lists

### Management Access Restriction
```
# Restrict SSH/SNMP to management network only
access-list 99 permit 10.1.100.0 0.0.0.255  # Management subnet
access-list 99 deny any log

ip authorized-managers 99 access-method ssh
snmp-server restricted-access 99
```

### Inter-VLAN Filtering (Guest Isolation)
```
# Prevent Guest VLAN from accessing internal networks
ip access-list extended GUEST-ISOLATION
  deny ip 10.3.0.0 0.0.255.255 10.2.0.0 0.0.255.255 log  # Block Corporate
  deny ip 10.3.0.0 0.0.255.255 10.10.0.0 0.0.255.255 log # Block Servers
  permit ip 10.3.0.0 0.0.255.255 any
  exit

interface vlan 210
  ip access-group GUEST-ISOLATION in
  exit
```

---

## Port Security

### Fixed Device Port Security (Printers, Cameras)
```
interface 10
  description "Fixed Printer - MAC Binding"
  port-security
  port-security learn-mode static
  port-security mac-address 00:11:22:33:44:55
  port-security violation shutdown
  exit
```

### Dynamic Port Security (User Ports)
```
interface 1-20
  description "User Access Ports"
  port-security
  port-security learn-mode dynamic
  port-security max-mac-count 3
  port-security violation restrict
  exit
```

---

## DHCP Snooping and ARP Protection

### DHCP Snooping Configuration
```
# Enable DHCP snooping globally
dhcp-snooping
dhcp-snooping vlan 200,210,220,300

# Configure authorized DHCP server
dhcp-snooping authorized-server 10.1.1.50

# Trust uplink and server ports
interface 48
  description "Uplink to Distribution"
  dhcp-snooping trust
  exit

interface 25
  description "DHCP Server Port"
  dhcp-snooping trust
  exit
```

### Dynamic ARP Inspection
```
# Enable DAI on user VLANs
ip arp-inspection vlan 200,210,220

# Trust uplink ports
interface 48
  ip arp-inspection trust
  exit
```

### IP Source Guard
```
# Enable on access ports (requires DHCP snooping)
interface 1-20
  ip verify source port-security
  exit
```

---

## 802.1X Port Authentication

### Global 802.1X Configuration
```
# Enable 802.1X globally
aaa authentication port-access eap-radius

# Configure RADIUS server
radius-server host 10.1.1.16 key RadiusSecret123

# 802.1X timers and settings
aaa port-access authenticator 1-24
aaa port-access authenticator active
```

### Per-Port 802.1X
```
interface 1-20
  description "User Access - 802.1X"
  aaa port-access authenticator 1-20
  aaa port-access authenticator 1-20 tx-period 10
  aaa port-access authenticator 1-20 client-limit 1
  exit
```

### Guest VLAN for 802.1X Failures
```
# Configure guest VLAN for unauthenticated devices
aaa port-access authenticator 1-20 unauth-vid 999
vlan 999 name "Guest-Quarantine"
```

---

## SNMP Security

### SNMPv3 Configuration (Recommended)
```
# Enable SNMPv3
snmpv3 enable

# Create user with authentication and privacy
snmpv3 user netmon auth sha AuthPassword123 priv aes PrivPassword456

# Create group
snmpv3 group netmon-group user netmon sec-model ver3

# Create view (limit MIB access)
snmpv3 view all-mibs included iso

# Assign access
snmpv3 access netmon-group sec-model ver3 read-view all-mibs

# Restrict SNMP access to management subnet
access-list 98 permit 10.1.100.0 0.0.0.255
snmp-server restricted-access 98
```

### SNMPv2c (Fallback - Less Secure)
```
# Use complex community strings
snmp-server community R3adOnlyC0mmun1ty! restricted

# Restrict to management network
access-list 98 permit 10.1.100.0 0.0.0.255
snmp-server restricted-access 98
```

---

## Spanning Tree Security

### BPDU Guard (Access Ports)
```
# Globally enable BPDU guard on all portfast ports
spanning-tree bpdu-guard

# Or per-interface
interface 1-20
  spanning-tree portfast
  spanning-tree bpdu-guard
  exit
```

### Root Guard (Uplink Ports)
```
# Prevent access switches from becoming root
interface 1-24
  description "Access Layer Trunks"
  spanning-tree root-guard
  exit
```

### Loop Guard (Distribution/Core Links)
```
# Prevent unidirectional link failures
interface 47-48
  spanning-tree loop-guard
  exit
```

---

## Control Plane Protection

### Rate Limiting Management Traffic
```
# Limit control plane traffic (CPU protection)
# Note: Specific commands vary by platform

# Example: Limit ARP rate
ip arp-protect
ip arp-protect validate src-mac dst-mac ip

# Limit ICMP (ping) rate
rate-limit cpu icmp 100
```

### Storm Control
```
# Limit broadcast/multicast storms on access ports
interface 1-20
  broadcast-limit 10  # 10% of port bandwidth
  multicast-limit 10
  exit
```

---

## Logging and Monitoring

### Syslog Configuration
```
# Configure syslog server
logging 10.1.1.20

# Set logging facility and severity
logging facility local6
logging severity info

# Log specific events
logging authentication
logging process
logging system
```

### NTP for Accurate Timestamps
```
# Configure NTP servers
sntp server 10.1.1.10
sntp enable

# Set timezone
time timezone -5
```

### SNMP Traps
```
# Enable critical traps
snmp-server enable traps auth-server-fail
snmp-server enable traps coldstart
snmp-server enable traps linkup linkdown
snmp-server enable traps port-security

# Send traps to NMS
snmp-server host 10.1.1.21 community TrapComm! trap
```

---

## Firmware and Maintenance

### Firmware Management
```
# Display current version
show version

# Copy new firmware to switch (via TFTP/SCP)
copy tftp flash <tftp-server-ip> <firmware-file.swi> primary

# Set boot image
boot system flash primary

# Verify after reboot
show version
show flash
```

### Configuration Backup
```
# Manual backup to TFTP
copy running-config tftp <tftp-server-ip> config-backup-2025-11-15.cfg

# Automated backup via script (external)
# Use expect script or Ansible to pull config nightly
```

### Regular Security Audits
```
# Monthly audit commands
show running-config
show authentication
show ip ssh
show password-policy
show snmpv3
show dhcp-snooping
show port-access authenticator statistics
show logging
```

---

## Compliance Validation

### Security Audit Script
```bash
#!/bin/bash
# security-audit.sh - Run on switch via SSH

echo "=== Password Policy ==="
show password-policy

echo "=== SSH Configuration ==="
show ip ssh

echo "=== Management Access ==="
show authorized-ip

echo "=== SNMP Configuration ==="
show snmpv3

echo "=== 802.1X Status ==="
show port-access authenticator

echo "=== DHCP Snooping ==="
show dhcp-snooping

echo "=== Port Security ==="
show port-security

echo "=== Spanning Tree Protection ==="
show spanning-tree bpdu-protection
```

---

## Incident Response

### Security Event Playbook

**Unauthorized Access Attempt:**
1. Review logs: `show logging -r`
2. Identify source IP/MAC
3. Block via ACL or port shutdown
4. Escalate to security team

**BPDU Guard Violation:**
1. Identify port: `show spanning-tree bpdu-protection`
2. Investigate device connected
3. Re-enable: `interface <port>; enable; exit`
4. Document incident

**DHCP Spoofing Attack:**
1. Review DHCP snooping logs
2. Identify rogue DHCP server port
3. Shutdown port immediately
4. Physical investigation required

---

## References

- **ArubaOS-Switch 16.x Hardening Guide** (Official Aruba Documentation)
- **HP Networking and Cisco CLI Reference Guide**
- **NIST Cybersecurity Framework**
- **CIS Benchmarks for Network Devices**
- **NetContext Repository**: `hp-aruba-procurve/commands.yml`

---

## Security Hardening Review Schedule

- **Daily**: Review critical security logs
- **Weekly**: Check for firmware updates, review auth failures
- **Monthly**: Full security audit, configuration backup verification
- **Quarterly**: Penetration testing, vulnerability scanning
- **Annually**: Complete security policy review and update
