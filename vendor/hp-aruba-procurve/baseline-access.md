# HP/Aruba ProCurve Access Switch - Baseline Configuration

**Target Platforms**: HP ProCurve 2530/2920/2930F, Aruba 6200/6300 Series
**Role**: Access Layer Switch (end-user connectivity)
**Last Updated**: 2025-11-15

## Configuration Checklist

### System Basics
- [x] Hostname following naming convention
- [x] Time zone and NTP configuration
- [x] Management VLAN and IP addressing
- [x] Default gateway for management
- [x] DNS servers configured

### Access Control
- [x] Strong admin password (12+ characters, complexity enabled)
- [x] SSHv2 enabled, Telnet disabled
- [x] Management access restricted to authorized networks
- [x] SNMP read-only community (SNMPv3 preferred)
- [x] Authorized IP addresses configured

### VLANs and Ports
- [x] Voice VLAN configured (if VoIP phones present)
- [x] Data VLANs for different user groups
- [x] Default VLAN 1 limited to management only
- [x] Unused ports disabled and in isolated VLAN
- [x] Port descriptions documenting connections

### Spanning Tree
- [x] RSTP or MSTP enabled
- [x] PortFast/Edge Port on access ports
- [x] BPDU guard enabled on access ports
- [x] Root guard on uplinks (if not root bridge)

### Security Features
- [x] 802.1X port authentication (if implemented)
- [x] DHCP snooping enabled on untrusted ports
- [x] Dynamic ARP inspection (if required)
- [x] Storm control for broadcast/multicast
- [x] Password recovery disabled (production environments)

### Monitoring and Logging
- [x] Syslog server configured
- [x] SNMP monitoring enabled
- [x] LLDP enabled for topology discovery
- [x] Logging buffer size adequate

## Example Configuration

```
# System Configuration
hostname BLDG-A-FL1-ACC01
time timezone -5
sntp server 10.1.1.10
sntp enable

# Management Configuration
vlan 100 name "Management"
interface vlan 100
  ip address 10.1.100.10 255.255.255.0
  exit
management-vlan 100
ip default-gateway 10.1.100.1

# DNS Configuration
ip name-server 10.1.1.11 10.1.1.12

# Administrative Access
password manager user-name admin plaintext YourStrongPassword123!
password complexity enable
password minimum-length 12
crypto key generate ssh rsa bits 2048
ip ssh version 2
no telnet-server

# Management ACL (restrict to management network)
access-list 99 permit 10.1.100.0 0.0.0.255
access-list 99 deny any log
ip authorized-managers 99 access-method ssh

# SNMP Configuration
snmp-server community SecureR0Community restricted
snmp-server contact network-ops@company.com
snmp-server location Building-A-Floor-1-IDF

# VLANs
vlan 1 name "Unused"
vlan 100 name "Management"
vlan 200 name "Corporate-Users"
vlan 210 name "Guest-WiFi"
vlan 300 name "Voice"

# Voice VLAN Global Config
voice vlan 300

# Port Configuration Templates

# Access Port (User)
interface 1
  description "User Workstation - Room 101"
  vlan 200 untagged
  voice vlan 300 tagged
  spanning-tree portfast
  spanning-tree bpdu-guard
  exit

# Access Port (Unused)
interface 24
  description "Unused - Disabled"
  disable
  vlan 1 untagged
  exit

# Uplink Port (Trunk to Distribution)
interface 48
  description "Uplink to DIST-SW01 Port 10"
  vlan 100,200,210,300 tagged
  spanning-tree root-guard
  exit

# Spanning Tree Configuration
spanning-tree
spanning-tree mode rapid-pvst
spanning-tree priority 7  # Lower priority than default (not root)

# Security Features
dhcp-snooping
dhcp-snooping vlan 200,210
dhcp-snooping authorized-server 10.1.1.50

# Port security (example for sensitive ports)
interface 10
  description "Printer - Fixed MAC"
  port-security
  port-security learn-mode static
  port-security mac-address 00:11:22:33:44:55
  exit

# Logging Configuration
logging 10.1.1.20
logging facility local6
logging severity info

# LLDP Configuration
lldp run
lldp med

# Save Configuration
write memory
```

## Post-Deployment Validation

Run these commands to verify baseline compliance:

```
show running-config
show vlan
show spanning-tree
show interfaces brief
show ip ssh
show snmp-server
show dhcp-snooping
show lldp info remote-device
```

## Common Issues and Fixes

### Issue: Management access lost after VLAN changes
**Solution**: Always configure management VLAN and IP before removing default VLAN 1 IP

### Issue: Spanning tree loops
**Solution**: Verify portfast only on access ports, never on trunks. Enable BPDU guard.

### Issue: Voice VLAN not working
**Solution**: Ensure voice VLAN is tagged on port, LLDP-MED enabled globally

### Issue: DHCP snooping blocking legitimate traffic
**Solution**: Configure DHCP server ports as trusted, verify VLAN configuration

## Security Hardening Notes

- Disable unused services: `no ip http-server`, `no ip https-server` (if web GUI not needed)
- Disable factory reset button: `no front-panel-security factory-reset`
- Disable password clear button: `no front-panel-security password-clear`
- Enable console timeout: `console idle-timeout 10`
- Configure login banner: `banner motd "Authorized Access Only"`

## References

- ArubaOS-Switch 16.x Hardening Guide
- HP Networking and Cisco CLI Reference Guide
- NetContext vendor documentation: `hp-aruba-procurve/commands.yml`
