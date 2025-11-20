# Cisco IOS/IOS-XE Access Switch - Baseline Configuration

**Target Platforms**: Cisco Catalyst 2960-X/XR, 3650, 3850, 9200, 9300 Series
**Role**: Access Layer Switch (end-user connectivity)
**Last Updated**: 2024-11-20

## Configuration Checklist

### System Basics
- [x] Hostname following naming convention
- [x] Time zone and NTP configuration
- [x] Management VLAN and IP addressing
- [x] Default gateway for management
- [x] DNS servers configured
- [x] Domain name configured

### Access Control
- [x] Strong admin password (privilege 15 user)
- [x] AAA authentication enabled
- [x] SSHv2 enabled, Telnet disabled
- [x] Console timeout configured
- [x] VTY lines secured with SSH-only access
- [x] SNMP community strings (SNMPv3 preferred)
- [x] HTTP/HTTPS disabled (unless required)

### VLANs and Ports
- [x] Voice VLAN configured (if VoIP phones present)
- [x] Data VLANs for different user groups
- [x] Native VLAN changed from VLAN 1
- [x] Unused ports shutdown and in isolated VLAN
- [x] Port descriptions documenting connections
- [x] Access ports configured with switchport mode access

### Spanning Tree
- [x] Rapid PVST+ enabled
- [x] PortFast on access ports
- [x] BPDU guard enabled on access ports
- [x] Root guard on uplinks (if not root bridge)
- [x] STP priority configured appropriately

### Security Features
- [x] 802.1X port authentication (if implemented)
- [x] DHCP snooping enabled on untrusted ports
- [x] Dynamic ARP inspection (DAI) enabled
- [x] IP Source Guard enabled
- [x] Port security on access ports
- [x] Storm control for broadcast/multicast
- [x] Password encryption enabled

### Monitoring and Logging
- [x] Syslog server configured
- [x] SNMP monitoring enabled
- [x] CDP/LLDP enabled for topology discovery
- [x] Logging timestamps configured
- [x] Logging buffer size adequate

## Example Configuration

```
! System Configuration
hostname BLDG-A-FL1-SW01
ip domain-name company.local
ntp server 10.1.1.10
clock timezone EST -5

! Management VLAN
vlan 100
 name Management
 exit

interface Vlan100
 description Management Interface
 ip address 10.1.100.10 255.255.255.0
 no shutdown
 exit

ip default-gateway 10.1.100.1
ip name-server 10.1.1.11 10.1.1.12

! Administrative Access
username admin privilege 15 secret 9 $9$xyz...  ! Use strong password
aaa new-model
aaa authentication login default local
aaa authorization exec default local

! SSH Configuration
crypto key generate rsa modulus 2048
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3

! Disable HTTP/HTTPS (enable only if needed)
no ip http server
no ip http secure-server

! Console Line Configuration
line console 0
 exec-timeout 10 0
 logging synchronous
 login authentication default
 exit

! VTY Lines (SSH Only)
line vty 0 15
 transport input ssh
 exec-timeout 10 0
 logging synchronous
 login authentication default
 exit

! SNMP Configuration (use SNMPv3 in production)
snmp-server community SecureR0Community RO
snmp-server location Building-A-Floor-1-IDF
snmp-server contact network-ops@company.com

! Logging Configuration
logging buffered 64000
logging console warnings
logging monitor warnings
logging trap informational
logging 10.1.1.20
logging source-interface Vlan100
service timestamps log datetime msec
service timestamps debug datetime msec

! Security Services
service password-encryption
no ip source-route
no ip gratuitous-arps

! VLANs
vlan 1
 name Unused-Native
 shutdown
 exit
vlan 100
 name Management
 exit
vlan 200
 name Corporate-Users
 exit
vlan 210
 name Guest-WiFi
 exit
vlan 300
 name Voice
 exit
vlan 999
 name Unused-Ports
 shutdown
 exit

! Spanning Tree Configuration
spanning-tree mode rapid-pvst
spanning-tree portfast bpduguard default
spanning-tree extend system-id

! Configure priority if this is root bridge
! spanning-tree vlan 1-4094 priority 4096

! Access Port Template (User Port with Voice)
interface range GigabitEthernet1/0/1 - 24
 description User Access Port
 switchport mode access
 switchport access vlan 200
 switchport voice vlan 300
 spanning-tree portfast
 spanning-tree bpduguard enable
 storm-control broadcast level 10.00
 storm-control multicast level 10.00
 no shutdown
 exit

! Unused Ports Template
interface range GigabitEthernet1/0/25 - 48
 description Unused Port - Disabled
 switchport mode access
 switchport access vlan 999
 shutdown
 exit

! Uplink Port Template (Trunk to Distribution)
interface TenGigabitEthernet1/0/1
 description Uplink to DIST-SW01
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk native vlan 999
 switchport trunk allowed vlan 100,200,210,300
 spanning-tree guard root
 no shutdown
 exit

! Port Security Configuration (Optional - per port basis)
! interface GigabitEthernet1/0/1
!  switchport port-security
!  switchport port-security maximum 3
!  switchport port-security violation restrict
!  switchport port-security aging time 2
!  switchport port-security aging type inactivity
!  exit

! DHCP Snooping Configuration
ip dhcp snooping
ip dhcp snooping vlan 200,210
no ip dhcp snooping information option

! Trust uplink and server ports for DHCP
interface TenGigabitEthernet1/0/1
 ip dhcp snooping trust
 exit

! Dynamic ARP Inspection (DAI)
ip arp inspection vlan 200,210
ip arp inspection validate src-mac dst-mac ip

! Trust uplink ports for DAI
interface TenGigabitEthernet1/0/1
 ip arp inspection trust
 exit

! IP Source Guard (Optional - high security environments)
! interface GigabitEthernet1/0/1
!  ip verify source
!  exit

! CDP and LLDP
cdp run
lldp run

! Save Configuration
end
write memory
```

## Post-Deployment Verification

### System Checks
```
show version                    # Verify IOS version and uptime
show running-config             # Review complete configuration
show startup-config             # Verify saved configuration matches running
show clock                      # Verify time and timezone
show ntp status                 # Verify NTP synchronization
```

### Interface Validation
```
show ip interface brief         # Verify management IP
show interfaces status          # Check all interface states
show interfaces trunk           # Verify trunk configuration
show vlan brief                 # Confirm VLAN creation
show spanning-tree summary      # Verify STP mode and features
```

### Security Validation
```
show users                      # Verify no unauthorized sessions
show ip ssh                     # Confirm SSHv2 enabled
show crypto key mypubkey rsa    # Verify SSH keys generated
show snmp                       # Verify SNMP configuration
show ip dhcp snooping           # Confirm DHCP snooping enabled
show ip arp inspection          # Confirm DAI configuration
```

### Connectivity Tests
```
ping 10.1.100.1                 # Test gateway connectivity
ping 10.1.1.10                  # Test NTP server
ping 10.1.1.20                  # Test syslog server
show cdp neighbors              # Verify CDP neighbor discovery
show lldp neighbors             # Verify LLDP neighbor discovery
```

## Security Hardening Notes

1. **Password Policy**: Use strong passwords (minimum 12 characters with complexity)
2. **Privilege Levels**: Create role-based user accounts instead of shared admin
3. **AAA**: Implement TACACS+ or RADIUS for centralized authentication
4. **VLAN 1**: Never use VLAN 1 for production traffic - reserve for unused ports only
5. **Native VLAN**: Change native VLAN from default (1) to unused VLAN (999)
6. **SSH Keys**: Use at least 2048-bit RSA keys (4096 preferred for high security)
7. **Management Access**: Restrict SSH access using ACLs on VTY lines
8. **Unused Ports**: Always shutdown and assign to isolated VLAN
9. **Port Security**: Enable on access ports in high-security environments
10. **DHCP Snooping**: Required foundation for DAI and IP Source Guard

## Common Issues and Troubleshooting

### Issue: SSH Connection Fails
**Solution**:
```
! Verify SSH configuration
show ip ssh
show crypto key mypubkey rsa

! Regenerate keys if needed
crypto key generate rsa modulus 2048
ip ssh version 2
```

### Issue: No Network Connectivity
**Solution**:
```
! Verify management interface
show ip interface brief
show interface vlan 100

! Check default gateway
show ip default-gateway
ping 10.1.100.1

! Verify routing (if ip routing enabled)
show ip route
```

### Issue: STP Loop Detected
**Solution**:
```
! Check spanning tree status
show spanning-tree
show spanning-tree summary
show interfaces status err-disabled

! Re-enable err-disabled ports after fixing loop
clear spanning-tree detected-protocols
configure terminal
interface GigabitEthernet1/0/X
 shutdown
 no shutdown
 exit
```

### Issue: Port Security Violation
**Solution**:
```
! Check port security status
show port-security interface GigabitEthernet1/0/X
show port-security address

! Clear violation and re-enable
clear port-security sticky interface GigabitEthernet1/0/X
configure terminal
interface GigabitEthernet1/0/X
 shutdown
 no shutdown
 exit
```

## Maintenance Schedule

**Weekly**:
- Review system logs (`show logging`)
- Check interface errors (`show interfaces`)
- Verify STP topology (`show spanning-tree`)

**Monthly**:
- Review and update port descriptions
- Audit unused ports (ensure shutdown)
- Review MAC address table for anomalies
- Backup running configuration

**Quarterly**:
- Security audit (passwords, SSH keys, AAA)
- IOS/IOS-XE software updates
- Hardware health check (fans, power supplies)
- Review and update ACLs

## References

- [Cisco Catalyst Switch Hardening Guide](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/10568-21.html)
- [Cisco IOS Configuration Fundamentals](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/15mt/fundamentals-15-mt-book.html)
- [Cisco Campus Network Security Best Practices](https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10556-16.html)
