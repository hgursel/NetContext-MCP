# Cisco IOS/IOS-XE Security Hardening Guide

**Target Platforms**: Cisco IOS 15.x and IOS-XE 16.x/17.x
**Security Framework**: Based on Cisco IOS Security Configuration Guide and NSA/DISA STIGs
**Last Updated**: 2024-11-20

## Executive Summary

This guide provides comprehensive security hardening recommendations for Cisco IOS and IOS-XE devices including routers, switches, and wireless LAN controllers. Implementation of these controls significantly reduces attack surface and improves overall security posture.

**Compliance Frameworks**:
- NSA Router Security Configuration Guide
- DISA STIG for Cisco IOS
- CIS Cisco IOS Benchmark
- PCI-DSS Network Device Requirements

---

## 1. Management Plane Security

### 1.1 Administrative Access

#### Secure Password Policy
```
! Enable password complexity requirements
security passwords min-length 12
security password secure-tos

! Configure privilege 15 user with strong password
username admin privilege 15 algorithm-type scrypt secret MyStr0ngP@ssw0rd!

! Enable AAA for centralized authentication
aaa new-model
aaa authentication login default group tacacs+ local
aaa authorization exec default group tacacs+ local
aaa accounting exec default start-stop group tacacs+
aaa accounting commands 15 default start-stop group tacacs+

! Configure TACACS+ server (recommended over RADIUS for device admin)
tacacs server TACACS-SERVER-1
 address ipv4 10.1.1.50
 key 7 <encrypted-key>
 single-connection
 exit

aaa group server tacacs+ TACACS-GROUP
 server name TACACS-SERVER-1
 exit
```

**Security Rationale**:
- Minimum 12-character passwords prevent brute force attacks
- scrypt algorithm provides stronger password hashing than legacy methods
- TACACS+ provides full command authorization and accounting
- Centralized authentication enables quick credential revocation

#### SSH Hardening
```
! Generate strong RSA keys (2048-bit minimum, 4096 preferred)
crypto key generate rsa general-keys modulus 4096 label SSH-KEYS

! Configure SSH version 2 only (v1 has known vulnerabilities)
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
ip ssh logging events

! Optional: Restrict SSH algorithms to strong ciphers only (IOS-XE 16.x+)
ip ssh server algorithm encryption aes256-ctr aes192-ctr aes128-ctr
ip ssh server algorithm mac hmac-sha2-256 hmac-sha2-512
ip ssh server algorithm kex ecdh-sha2-nistp521 ecdh-sha2-nistp384
```

**Security Rationale**:
- 4096-bit RSA keys resist cryptographic attacks for extended periods
- SSHv2 eliminates protocol-level vulnerabilities in SSHv1
- Restricting to strong ciphers prevents downgrade attacks
- Connection timeout reduces exposure to abandoned sessions

#### Disable Insecure Protocols
```
! Disable Telnet completely
line vty 0 15
 transport input ssh
 exec-timeout 10 0
 exit

! Disable HTTP and HTTPS (unless required for specific features)
no ip http server
no ip http secure-server

! If HTTPS required, harden configuration
ip http secure-server
ip http secure-trustpoint <certificate-name>
ip http secure-ciphersuite aes-256-cbc-sha
ip http timeout-policy idle 60 life 86400 requests 10000
```

**Security Rationale**:
- Telnet transmits credentials in cleartext (complete protocol ban)
- HTTP/HTTPS increase attack surface (disable unless absolutely needed)
- HTTPS cipher restrictions prevent weak encryption negotiation

### 1.2 Console and VTY Line Security

#### Console Port Protection
```
line console 0
 exec-timeout 10 0                    ! 10-minute idle timeout
 logging synchronous                  ! Prevent log messages interrupting input
 login authentication default         ! Require AAA authentication
 no password                          ! Remove local password (use AAA)
 transport output ssh                 ! Allow only SSH for outbound connections
 exit
```

#### VTY Line Hardening
```
! Secure all VTY lines (0-15 for most platforms, 0-1180 for ASR/ISR G2)
line vty 0 15
 transport input ssh                  ! SSH only
 exec-timeout 10 0                    ! 10-minute idle timeout
 logging synchronous
 login authentication default
 transport output ssh
 access-class 10 in                   ! ACL restricting source IPs (see below)
 exit

! ACL restricting management access to authorized networks only
access-list 10 remark Management Network Access
access-list 10 permit 10.1.100.0 0.0.0.255
access-list 10 permit 10.1.101.0 0.0.0.255
access-list 10 deny any log
```

**Security Rationale**:
- Exec timeout prevents abandoned sessions from remaining open
- Access-class ACL implements defense-in-depth (network-layer restriction)
- Logging denied access attempts enables security monitoring

### 1.3 SNMP Security

#### SNMP Hardening (Prefer SNMPv3)
```
! Disable SNMPv1 and SNMPv2c if possible
no snmp-server

! Configure SNMPv3 with encryption and authentication
snmp-server group SNMP-RO-GROUP v3 priv read SNMP-RO-VIEW
snmp-server group SNMP-RW-GROUP v3 priv read SNMP-RW-VIEW write SNMP-RW-VIEW

! Create SNMPv3 user with strong authentication and privacy
snmp-server user snmp-monitor SNMP-RO-GROUP v3 auth sha AuthP@ssw0rd! priv aes 256 PrivP@ssw0rd!

! Define MIB views (restrict what can be accessed)
snmp-server view SNMP-RO-VIEW iso included
snmp-server view SNMP-RO-VIEW ciscoMgmt included
snmp-server view SNMP-RO-VIEW ciscoExperiment excluded

! SNMPv2c fallback (ONLY if SNMPv3 not supported by NMS)
! Use strong community strings and restrict access
snmp-server community Str0ngR3adC0mmunity! RO 11
access-list 11 remark SNMP Read-Only Access
access-list 11 permit 10.1.1.100 0.0.0.0
access-list 11 deny any log
```

**Security Rationale**:
- SNMPv3 encrypts credentials and data in transit
- MIB view restrictions limit information disclosure
- ACL-based community string restrictions prevent unauthorized access

---

## 2. Control Plane Security

### 2.1 Control Plane Policing (CoPP)

```
! Define traffic classes for control plane
ip access-list extended CONTROL-PLANE-CRITICAL
 remark SSH management traffic
 permit tcp 10.1.100.0 0.0.0.255 any eq 22
 remark OSPF routing protocol
 permit ospf any any
 remark EIGRP routing protocol
 permit eigrp any any

ip access-list extended CONTROL-PLANE-IMPORTANT
 remark SNMP monitoring
 permit udp 10.1.1.100 0.0.0.0 any eq snmp
 remark NTP time synchronization
 permit udp 10.1.1.10 0.0.0.0 any eq ntp

ip access-list extended CONTROL-PLANE-NORMAL
 remark ICMP for diagnostics
 permit icmp any any echo-reply
 permit icmp any any echo
 permit icmp any any unreachable
 permit icmp any any time-exceeded

ip access-list extended CONTROL-PLANE-UNDESIRABLE
 remark Block all other traffic to control plane
 deny ip any any

! Create class maps
class-map match-all CRITICAL-CLASS
 match access-group name CONTROL-PLANE-CRITICAL

class-map match-all IMPORTANT-CLASS
 match access-group name CONTROL-PLANE-IMPORTANT

class-map match-all NORMAL-CLASS
 match access-group name CONTROL-PLANE-NORMAL

class-map match-all UNDESIRABLE-CLASS
 match access-group name CONTROL-PLANE-UNDESIRABLE

! Create policy map with rate limiting
policy-map CONTROL-PLANE-POLICY
 class CRITICAL-CLASS
  police 8000 conform-action transmit exceed-action transmit
 class IMPORTANT-CLASS
  police 4000 conform-action transmit exceed-action drop
 class NORMAL-CLASS
  police 2000 conform-action transmit exceed-action drop
 class UNDESIRABLE-CLASS
  drop

! Apply to control plane
control-plane
 service-policy input CONTROL-PLANE-POLICY
```

**Security Rationale**:
- Rate limiting prevents control plane exhaustion attacks
- Prioritization ensures critical services (routing, management) remain available
- Dropping undesirable traffic reduces attack surface

### 2.2 Routing Protocol Security

#### OSPF Authentication
```
! Configure OSPF MD5 authentication
interface GigabitEthernet0/0
 ip ospf message-digest-key 1 md5 7 <encrypted-key>
 ip ospf authentication message-digest
 exit

router ospf 1
 area 0 authentication message-digest
```

#### BGP Security
```
router bgp 65001
 neighbor 10.1.1.1 remote-as 65002
 neighbor 10.1.1.1 password 7 <encrypted-key>
 neighbor 10.1.1.1 ttl-security hops 1
 neighbor 10.1.1.1 prefix-list BGP-INBOUND in
 neighbor 10.1.1.1 prefix-list BGP-OUTBOUND out
 maximum-paths 4

! Define prefix lists for route filtering
ip prefix-list BGP-INBOUND seq 5 permit 0.0.0.0/0 le 24
ip prefix-list BGP-OUTBOUND seq 5 permit 10.0.0.0/8 le 32
```

---

## 3. Data Plane Security

### 3.1 Infrastructure ACLs

```
! Infrastructure ACL (iACL) - protect infrastructure addresses
ip access-list extended INFRASTRUCTURE-ACL
 remark Permit BGP from known peers
 permit tcp host 10.1.1.1 eq bgp host 10.1.1.2
 permit tcp host 10.1.1.1 host 10.1.1.2 eq bgp

 remark Permit OSPF from internal networks
 permit ospf 10.0.0.0 0.255.255.255 any

 remark Permit SSH from management networks only
 permit tcp 10.1.100.0 0.0.0.255 10.0.0.0 0.255.255.255 eq 22

 remark Permit ICMP for troubleshooting (rate-limited)
 permit icmp any 10.0.0.0 0.255.255.255 echo
 permit icmp any 10.0.0.0 0.255.255.255 echo-reply
 permit icmp any 10.0.0.0 0.255.255.255 unreachable
 permit icmp any 10.0.0.0 0.255.255.255 time-exceeded

 remark Deny all other traffic to infrastructure
 deny ip any 10.0.0.0 0.255.255.255 log

 remark Permit all other traffic
 permit ip any any

! Apply to ingress interfaces
interface GigabitEthernet0/0
 ip access-group INFRASTRUCTURE-ACL in
```

### 3.2 Unicast Reverse Path Forwarding (uRPF)

```
! Enable strict uRPF on customer-facing interfaces
interface GigabitEthernet0/1
 ip verify unicast source reachable-via rx
 exit

! Enable loose uRPF on asymmetric routing paths
interface GigabitEthernet0/2
 ip verify unicast source reachable-via any
 exit
```

**Security Rationale**:
- uRPF prevents IP spoofing attacks
- Strict mode validates source address is reachable via same interface
- Loose mode allows asymmetric routing while still validating source

---

## 4. Layer 2 Security (Switches)

### 4.1 VLAN Security

```
! Disable VLAN 1 (never use for production traffic)
vlan 1
 name Unused-Native-VLAN
 shutdown
 exit

! Change native VLAN to unused VLAN
interface GigabitEthernet1/0/1
 switchport trunk native vlan 999
 exit

! Disable DTP (Dynamic Trunking Protocol)
interface range GigabitEthernet1/0/1-24
 switchport mode access
 switchport nonegotiate
 exit

! Explicitly configure trunks
interface TenGigabitEthernet1/0/1
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport nonegotiate
 switchport trunk native vlan 999
 switchport trunk allowed vlan 100,200,300
 exit
```

### 4.2 Port Security

```
! Enable port security on access ports
interface GigabitEthernet1/0/5
 switchport mode access
 switchport port-security
 switchport port-security maximum 3
 switchport port-security violation restrict
 switchport port-security aging time 2
 switchport port-security aging type inactivity
 switchport port-security mac-address sticky
 exit

! Enable BPDU guard on access ports (prevent STP attacks)
spanning-tree portfast bpduguard default
```

### 4.3 DHCP Snooping

```
! Enable DHCP snooping globally
ip dhcp snooping
ip dhcp snooping vlan 100,200,300
no ip dhcp snooping information option

! Trust uplink and DHCP server ports
interface TenGigabitEthernet1/0/1
 ip dhcp snooping trust
 exit

! Rate-limit DHCP on access ports (prevent DHCP starvation)
interface range GigabitEthernet1/0/1-24
 ip dhcp snooping limit rate 10
 exit
```

### 4.4 Dynamic ARP Inspection (DAI)

```
! Enable DAI on user VLANs
ip arp inspection vlan 200,300
ip arp inspection validate src-mac dst-mac ip

! Trust uplink and server ports
interface TenGigabitEthernet1/0/1
 ip arp inspection trust
 exit

! Rate-limit ARP on access ports
interface range GigabitEthernet1/0/1-24
 ip arp inspection limit rate 15
 exit
```

### 4.5 IP Source Guard

```
! Enable IP Source Guard on access ports (requires DHCP snooping)
interface GigabitEthernet1/0/10
 ip verify source
 exit

! Enable with MAC address verification (higher security)
interface GigabitEthernet1/0/11
 ip verify source port-security
 exit
```

---

## 5. Logging and Monitoring

### 5.1 Comprehensive Logging

```
! Configure logging buffer
logging buffered 64000 informational
logging console warnings
logging monitor warnings

! Configure syslog servers (use two for redundancy)
logging host 10.1.1.20 transport udp port 514
logging host 10.1.1.21 transport udp port 514
logging source-interface Vlan100
logging trap informational

! Enable service timestamps
service timestamps log datetime msec localtime show-timezone
service timestamps debug datetime msec localtime show-timezone

! Log all configuration changes
archive
 log config
  logging enable
  notify syslog contenttype plaintext
  exit
 exit
```

### 5.2 Login Security

```
! Enable login block after failed attempts (DoS protection)
login block-for 300 attempts 3 within 60
login quiet-mode access-class 10
login delay 2
login on-failure log
login on-success log
```

**Security Rationale**:
- Login block-for prevents brute force password attacks
- Quiet mode blocks all logins except from trusted networks (ACL 10)
- Login delay slows automated attack tools

---

## 6. Service Hardening

### 6.1 Disable Unnecessary Services

```
! Disable commonly exploited services
no ip bootp server
no ip domain-lookup
no ip finger
no ip http server
no ip http secure-server
no ip identd
no ip rcmd rcp-enable
no ip rcmd rsh-enable
no service config
no service finger
no service pad
no service tcp-small-servers
no service udp-small-servers
no cdp run                          ! Disable CDP if not needed
no lldp run                         ! Disable LLDP if not needed
```

### 6.2 Source Routing and Redirects

```
! Disable IP source routing (routing header attacks)
no ip source-route

! Disable ICMP redirects (MitM attacks)
interface GigabitEthernet0/0
 no ip redirects
 no ip unreachables                 ! Optional: disable if no diagnostics needed
 no ip proxy-arp                    ! Disable proxy ARP
 exit
```

### 6.3 TCP and ICMP Hardening

```
! Enable TCP keepalives
service tcp-keepalives-in
service tcp-keepalives-out

! Set reasonable TCP connection limits
ip tcp synwait-time 10
ip tcp path-mtu-discovery

! Rate-limit ICMP unreachables (DoS prevention)
ip icmp rate-limit unreachable 500
```

---

## 7. Configuration Management

### 7.1 Configuration Backup and Archiving

```
! Configure configuration archive
archive
 path bootflash:archive/config
 maximum 14
 time-period 1440                   ! Daily backups
 write-memory
 exit

! Configure Kron for automated backups (IOS 12.3+ / IOS-XE)
kron occurrence DAILY-BACKUP at 02:00 recurring
 policy-list BACKUP-POLICY
 exit

kron policy-list BACKUP-POLICY
 cli write memory
 cli archive config
 exit
```

### 7.2 Secure Configuration Resilience

```
! Enable configuration change notification
archive
 log config
  logging enable
  logging size 500
  notify syslog contenttype plaintext
  exit
 exit

! Prevent IOS file manipulation (IOS-XE)
file privilege 15
```

---

## 8. Wireless LAN Controller Security (WLC)

### 8.1 WLAN Security

```
! Configure secure WPA3-Enterprise WLAN
wlan CORPORATE-WIFI 1 CORPORATE-WIFI
 security wpa psk set-key ascii 0 <strong-psk>
 security wpa akm 802.1x
 security wpa akm ft 802.1x
 security wpa wpa3
 security wpa cipher aes
 security ft over-the-ds
 no security wpa wpa2
 no security wpa wpa2 ciphers tkip
 no shutdown
 exit
```

### 8.2 Management Frame Protection

```
wlan CORPORATE-WIFI 1
 security pmf mandatory
 exit
```

---

## 9. Compliance Validation

### 9.1 Security Audit Commands

```
! Verify SSH configuration
show ip ssh
show crypto key mypubkey rsa

! Verify AAA configuration
show aaa servers
show tacacs
show aaa user all

! Verify access lists
show ip access-lists
show access-lists

! Verify logging
show logging
show archive log config all

! Verify enabled services
show ip sockets
show tcp brief
show udp brief
show control-plane
```

### 9.2 Security Compliance Checklist

- [ ] All passwords meet minimum complexity (12+ characters)
- [ ] SSH version 2 only, RSA keys >= 2048-bit
- [ ] Telnet disabled on all lines
- [ ] HTTP/HTTPS disabled (unless required)
- [ ] SNMPv3 with encryption enabled
- [ ] AAA authentication configured (TACACS+ preferred)
- [ ] Console and VTY exec-timeout configured
- [ ] Management access restricted by ACL
- [ ] Control Plane Policing (CoPP) configured
- [ ] Routing protocol authentication enabled
- [ ] uRPF enabled on external interfaces
- [ ] VLAN 1 disabled and not used
- [ ] DHCP snooping enabled on access switches
- [ ] Dynamic ARP Inspection enabled
- [ ] Port security enabled on access ports
- [ ] Unnecessary services disabled
- [ ] IP source routing disabled
- [ ] Logging to redundant syslog servers
- [ ] Configuration archiving enabled
- [ ] Login block-for configured

---

## 10. References

- [NSA Router Security Configuration Guide](https://www.nsa.gov/portals/75/documents/what-we-do/cybersecurity/professional-resources/csi-network-infrastructure-security-guide.pdf)
- [DISA STIG for Cisco IOS](https://public.cyber.mil/stigs/)
- [CIS Cisco IOS Benchmark](https://www.cisecurity.org/benchmark/cisco)
- [Cisco IOS Security Configuration Guide](https://www.cisco.com/c/en/us/support/docs/ios-nx-os-software/ios-software-releases-150-1-m/116847-configure-ios-sec-00.html)
- [Cisco Security Hardening Guides](https://www.cisco.com/c/en/us/support/docs/ip/access-lists/13608-21.html)
