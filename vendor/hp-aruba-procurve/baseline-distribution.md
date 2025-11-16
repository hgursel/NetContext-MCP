# HP/Aruba ProCurve Distribution Switch - Baseline Configuration

**Target Platforms**: HP ProCurve 2930F/3810M, Aruba 5400R/6300/8320 Series
**Role**: Distribution Layer Switch (VLAN routing, aggregation, policy enforcement)
**Last Updated**: 2025-11-15

## Configuration Checklist

### System Basics
- [x] Hostname following naming convention
- [x] Time zone and NTP configuration
- [x] Management VLAN and IP addressing
- [x] Default gateway or static routes
- [x] DNS servers configured

### Layer 3 Features
- [x] IP routing enabled
- [x] VLAN interfaces (SVIs) configured for inter-VLAN routing
- [x] DHCP helper addresses configured
- [x] Static routes or dynamic routing protocol
- [x] HSRP/VRRP for default gateway redundancy

### Access Control
- [x] Strong passwords with complexity requirements
- [x] SSHv2 enabled, Telnet disabled
- [x] Management access restricted (ACLs)
- [x] TACACS+ or RADIUS authentication
- [x] Privilege levels and command authorization

### VLANs and Trunking
- [x] VLANs for all user segments
- [x] Trunk ports to access switches
- [x] Trunk ports to core/WAN routers
- [x] VLAN pruning on trunks for efficiency

### Spanning Tree
- [x] MSTP or Rapid-PVST configured
- [x] Root bridge priority configured
- [x] Root guard on access-facing ports
- [x] Loop guard on uplinks

### High Availability
- [x] Stacking or VSF configured (if supported)
- [x] Link aggregation (LACP) for uplinks
- [x] VRRP for gateway redundancy
- [x] Dual power supplies configured

### Security and QoS
- [x] ACLs for traffic filtering
- [x] QoS policies for voice/video
- [x] Rate limiting on access-facing ports
- [x] DHCP snooping and DAI enabled

### Monitoring
- [x] Syslog and SNMP configured
- [x] NetFlow/sFlow (if needed)
- [x] CPU/memory thresholds for alerts

## Example Configuration

```
# System Configuration
hostname CAMPUS-DIST-SW01
time timezone -5
sntp server 10.1.1.10
sntp enable

# Management Configuration
vlan 100 name "Management"
interface vlan 100
  ip address 10.1.100.1 255.255.255.0
  exit
management-vlan 100

# Enable IP Routing
ip routing

# DNS Configuration
ip name-server 10.1.1.11 10.1.1.12

# Administrative Access
password manager user-name admin plaintext YourStrongPassword123!
password complexity enable
password minimum-length 12
crypto key generate ssh rsa bits 2048
ip ssh version 2
no telnet-server

# TACACS+ Authentication (Optional)
tacacs-server host 10.1.1.15 key TacacsSecretKey123
aaa authentication login default tacacs local
aaa authentication enable default tacacs local
aaa accounting exec default start-stop tacacs

# Management ACL
access-list 99 permit 10.1.100.0 0.0.0.255
access-list 99 deny any log
ip authorized-managers 99 access-method ssh

# SNMP Configuration
snmpv3 enable
snmpv3 user netmon auth sha AuthPass123 priv aes PrivPass456
snmpv3 group netmon-group user netmon sec-model ver3
snmpv3 access netmon-group sec-model ver3 read-view all-mibs

# VLANs
vlan 1 name "Unused"
vlan 100 name "Management"
vlan 200 name "Corporate-Users"
vlan 210 name "Guest-WiFi"
vlan 220 name "IoT-Devices"
vlan 300 name "Voice"
vlan 400 name "Servers"

# VLAN Interfaces (SVIs) for Inter-VLAN Routing
interface vlan 200
  description "Corporate Users Gateway"
  ip address 10.2.0.1 255.255.255.0
  ip helper-address 10.1.1.50  # DHCP server
  exit

interface vlan 210
  description "Guest WiFi Gateway"
  ip address 10.3.0.1 255.255.255.0
  ip helper-address 10.1.1.50
  exit

interface vlan 220
  description "IoT Devices Gateway"
  ip address 10.4.0.1 255.255.255.0
  ip helper-address 10.1.1.50
  exit

interface vlan 300
  description "Voice Gateway"
  ip address 10.5.0.1 255.255.255.0
  ip helper-address 10.1.1.50
  exit

interface vlan 400
  description "Server Network Gateway"
  ip address 10.10.0.1 255.255.255.0
  exit

# Trunk Ports to Access Switches
interface 1-24
  description "Trunks to Access Layer"
  vlan 100,200,210,220,300,400 tagged
  spanning-tree root-guard
  exit

# Uplink Ports to Core (with LACP)
trunk 47-48 trk1 lacp
interface trk1
  description "LACP Uplink to Core"
  vlan 100,200,210,220,300,400 tagged
  spanning-tree loop-guard
  exit

# Spanning Tree Configuration (Root Bridge)
spanning-tree
spanning-tree mode mstp
spanning-tree config-name "CAMPUS"
spanning-tree config-revision 1

# Set this switch as root bridge for all VLANs
spanning-tree instance 1 vlan 100,200,210,220,300,400
spanning-tree instance 1 priority 0

# VRRP Configuration (if using dual distribution switches)
# Assuming this is the master for VLANs 200, 300
interface vlan 200
  vrrp vrid 200
  vrrp vrid 200 virtual-ip-address 10.2.0.1
  vrrp vrid 200 priority 110
  vrrp vrid 200 enable
  exit

interface vlan 210
  vrrp vrid 210
  vrrp vrid 210 virtual-ip-address 10.3.0.1
  vrrp vrid 210 priority 100  # Backup for this VLAN
  vrrp vrid 210 enable
  exit

# QoS Configuration for Voice
qos type-of-service diff-services
qos device-priority none
qos priority-map 0 to dscp 0
qos priority-map 5 to dscp 46  # Voice traffic
qos priority-map 6 to dscp 46

# Voice VLAN
voice vlan 300

# Access Control Lists
# Block inter-VLAN traffic from Guest to Corporate
ip access-list extended GUEST-TO-CORP
  deny ip 10.3.0.0 0.0.255.255 10.2.0.0 0.0.255.255 log
  deny ip 10.3.0.0 0.0.255.255 10.10.0.0 0.0.255.255 log
  permit ip any any
  exit

interface vlan 210
  ip access-group GUEST-TO-CORP in
  exit

# DHCP Snooping
dhcp-snooping
dhcp-snooping vlan 200,210,220,300

# Trust uplink and server-facing ports
interface trk1
  dhcp-snooping trust
  exit

interface 25-28
  description "Server Ports"
  vlan 400 untagged
  dhcp-snooping trust
  exit

# Dynamic ARP Inspection
ip arp-inspection vlan 200,210,220

# Rate Limiting on Access-Facing Ports
interface 1-24
  rate-limit ingress 1000000  # 1 Gbps
  exit

# Logging Configuration
logging 10.1.1.20
logging facility local6
logging severity info

# LLDP Configuration
lldp run
lldp med

# Static Routes (if not using dynamic routing)
ip route 0.0.0.0 0.0.0.0 10.1.100.254  # Default route to WAN router

# Save Configuration
write memory
```

## Post-Deployment Validation

```
show running-config
show ip route
show vlan
show spanning-tree
show vrrp
show trunk
show interfaces brief
show qos device-priority
show dhcp-snooping
show ip arp-inspection
```

## High Availability Configuration

### VRRP Setup (Dual Distribution Switches)

**Distribution Switch 1** (Primary for VLANs 200, 220, 300):
```
interface vlan 200
  vrrp vrid 200 virtual-ip-address 10.2.0.1
  vrrp vrid 200 priority 110
  vrrp vrid 200 enable
```

**Distribution Switch 2** (Backup for VLANs 200, 220, 300):
```
interface vlan 200
  vrrp vrid 200 virtual-ip-address 10.2.0.1
  vrrp vrid 200 priority 100
  vrrp vrid 200 enable
```

### Link Aggregation (LACP)

Both distribution switches to core:
```
trunk 47-48 trk1 lacp
interface trk1
  description "LACP to Core"
  vlan 100,200,210,220,300,400 tagged
```

## Common Issues and Fixes

### Issue: Asymmetric routing with VRRP
**Solution**: Ensure consistent VRRP priorities and verify routing tables on both switches

### Issue: Slow inter-VLAN routing
**Solution**: Verify hardware-based routing is enabled, check CPU utilization

### Issue: DHCP relay not working
**Solution**: Verify `ip helper-address` on SVI, ensure DHCP server is reachable

### Issue: Spanning tree topology changes
**Solution**: Verify root bridge priority, enable root-guard on access-facing ports

## Security Hardening

- ACLs to restrict access between VLANs (Guest isolation)
- Control plane policing (CoPP) to protect CPU
- Disable unused protocols: CDP if only using LLDP
- Implement storm control on access-facing ports
- Enable logging for security events

## Performance Tuning

- Enable jumbo frames on server-facing ports if needed
- Configure QoS policies for voice and video traffic
- Monitor CPU and memory usage regularly
- Use hardware-accelerated routing features

## References

- ArubaOS-Switch 16.x Advanced Traffic Management Guide
- HP Networking and Cisco CLI Reference Guide
- NetContext vendor documentation: `hp-aruba-procurve/commands.yml`
