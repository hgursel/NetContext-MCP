# Ubiquiti UniFi Dream Router 7 - Vendor Documentation

This directory contains configuration guides, security hardening procedures, and CLI command references for the **Ubiquiti UniFi Dream Router 7 (UDR7)**.

## Device Overview

The UniFi Dream Router 7 is an all-in-one network solution combining:
- **Gateway/Router**: 10GbE SFP+ and 2.5GbE WAN connectivity
- **WiFi 7 Access Point**: Tri-band (2.4GHz, 5GHz, 6GHz) with 2x2 MIMO
- **UniFi Controller**: Integrated controller for managing UniFi ecosystem
- **Network Video Recorder**: 64GB storage for UniFi Protect (5x 1080p streams)
- **Switch**: 3x 2.5GbE LAN ports (1 with PoE output)

### Key Specifications

| Feature | Specification |
|---------|---------------|
| **Processor** | Quad-core ARM Cortex-A53 @ 1.5 GHz |
| **WAN Ports** | 1x 10GbE SFP+, 1x 2.5GbE RJ45 |
| **LAN Ports** | 3x 2.5GbE (1 with 15.4W PoE) |
| **WiFi** | WiFi 7 tri-band (2.4/5/6 GHz) |
| **Max Throughput** | Up to 5.7 Gbps (6GHz), 4.3 Gbps (5GHz), 688 Mbps (2.4GHz) |
| **IDS/IPS Throughput** | 2.3 Gbps |
| **Coverage** | Up to 1,750 ft² (160 m²) |
| **Storage** | 64GB microSD (UniFi Protect) |
| **Power** | Internal 50W AC/DC power supply |
| **Dimensions** | 7.3" tall x 4.3" diameter, 2.4 lbs |

## Documentation Files

### 📋 commands.yml
Complete CLI command reference organized into functional bundles:
- **health_check**: System health and network status monitoring
- **system_monitoring**: Resource utilization and performance
- **network_diagnostics**: Network connectivity troubleshooting
- **dhcp_monitoring**: DHCP lease tracking
- **wireless_status**: WiFi client and radio information
- **security_audit**: Security configuration review
- **vpn_ipsec_status**: VPN and IPSec tunnel monitoring
- **unifi_os_management**: UniFi OS container management
- **baseline_config**: Initial device configuration
- **firmware_management**: Firmware updates and maintenance
- **factory_reset**: Factory reset procedures

### 📘 baseline-gateway.md
Comprehensive deployment guide covering:
- Initial hardware setup and installation
- Web UI configuration walkthrough
- SSH access configuration
- Network and VLAN setup
- WiFi 7 tri-band configuration
- Security feature deployment
- QoS and traffic prioritization
- UniFi Protect video surveillance
- Post-deployment validation
- Common issues and troubleshooting
- Performance tuning recommendations
- Backup and recovery procedures

### 🔒 security-hardening.md
Security best practices and hardening procedures:
- Authentication and access control
- Network segmentation and VLAN isolation
- WiFi security (WPA3 configuration)
- Firewall rules for inter-VLAN security
- Threat management (IDS/IPS)
- Deep packet inspection (DPI)
- Content filtering and parental controls
- Monitoring and logging
- Firmware security management
- Incident response procedures
- Compliance considerations (PCI-DSS, HIPAA)
- Security audit checklists

## Quick Start

### 1. Initial Setup
```bash
# Physical installation
1. Connect WAN: 10GbE SFP+ or 2.5GbE RJ45
2. Connect LAN devices to 2.5GbE ports
3. Power on device
4. Navigate to setup.ui.com or 192.168.1.1
5. Complete setup wizard
```

### 2. Enable SSH (Diagnostic Use)
```bash
# Via UniFi Network UI
Settings → System → Advanced → Console Settings
- Enable SSH
- SSH Authentication: Password

# SSH Login
ssh root@<device-ip>
# Access UniFi OS shell
unifi-os shell
```

### 3. Essential Monitoring Commands
```bash
# System health
info                          # Device information
uptime                        # System uptime
ubnt-systool cputemp          # CPU temperature
sensors                       # All sensors

# Network status
ifconfig                      # Interfaces
ip route                      # Routing table
arp -a                        # ARP cache

# DHCP leases
cat /mnt/data/udapi-config/dnsmasq.lease

# WiFi clients
iw dev wlan0 station dump     # 2.4GHz clients
iw dev wlan1 station dump     # 5GHz clients
iw dev wlan2 station dump     # 6GHz clients
```

## Important Notes

### ⚠️ Configuration Philosophy

The UniFi Dream Router 7 is designed for **web-based configuration** via the UniFi Network UI. SSH access is provided primarily for:
- Diagnostics and troubleshooting
- System monitoring and log review
- Advanced debugging scenarios
- Emergency access when UI is unavailable

**Key Considerations:**
- ✅ **Primary Configuration**: Use UniFi Network web UI
- ✅ **SSH for Diagnostics**: Monitoring, logs, troubleshooting only
- ⚠️ **Controller Override**: Web UI changes override CLI modifications
- ⚠️ **Firmware Updates**: May overwrite CLI-based configuration changes
- ❌ **Not Recommended**: Persistent configuration changes via CLI

### 🔒 Security Recommendations

1. **Enable SSH only when actively troubleshooting**
2. **Disable SSH immediately after use**
3. **Use strong admin passwords (16+ characters)**
4. **Enable two-factor authentication**
5. **Implement VLAN segmentation for device isolation**
6. **Enable IDS/IPS for threat protection**
7. **Keep firmware updated to latest stable version**
8. **Regular configuration backups (automated)**
9. **Monitor security logs and threat management**
10. **Follow principle of least privilege**

### 📊 Performance Considerations

**With IDS/IPS Enabled:**
- Throughput: ~2.3 Gbps
- Latency: Minimal increase (<5ms)
- CPU Usage: Moderate (30-50%)

**Without IDS/IPS:**
- Throughput: Full wire speed (10 Gbps capable)
- Latency: Minimal (<1ms)
- CPU Usage: Low (10-20%)

**WiFi 7 Performance:**
- 6GHz Band: Up to 5.7 Gbps (2x2 MIMO)
- 5GHz Band: Up to 4.3 Gbps (2x2 MIMO)
- 2.4GHz Band: Up to 688 Mbps (2x2 MIMO)
- Coverage: Up to 1,750 ft² per device

## Command Bundle Examples

### Weekly Health Check
```bash
# Run health_check bundle commands
info
uptime
ubnt-device-info summary
ubnt-systool cputemp
sensors
ifconfig
ifstat
netstat -rt -n
ip route
arp -a
ip neigh
```

### Monthly Security Audit
```bash
# Run security_audit bundle commands
whoami
cat /etc/passwd
netstat -plant
iptables -L -n -v
ip6tables -L -n -v
cat /var/log/messages | grep -i auth
last | head -20
ps aux | grep ssh
```

### Network Troubleshooting
```bash
# Run network_diagnostics bundle commands
ifconfig
ifstat
ip addr show
ip route
netstat -rt -n
netstat -plant
arp -a
ip neigh
ping -c 4 <target-ip>
traceroute <target-ip>
tcpdump -i <interface> -c 50
```

## Use Cases

### Home Network
- **Scenario**: Small home with multiple VLANs
- **Configuration**: Default LAN + Guest WiFi + IoT VLAN
- **Security**: WPA3, Guest isolation, basic firewall rules
- **Monitoring**: Weekly health checks, monthly security audits

### Small Business
- **Scenario**: Office with 10-50 employees
- **Configuration**: Corporate LAN + Guest + VoIP + Server VLANs
- **Security**: WPA3, IDS/IPS enabled, inter-VLAN firewall rules
- **Monitoring**: Daily health checks, weekly security reviews

### Advanced Home Lab
- **Scenario**: Technology enthusiast with complex network
- **Configuration**: Multiple VLANs, VPN, UniFi Protect cameras
- **Security**: Full IDS/IPS, advanced firewall rules, SSH key auth
- **Monitoring**: Continuous monitoring, automated alerting

## Supported UniFi Applications

The UDR7 supports the following UniFi applications:

| Application | Purpose | Storage |
|-------------|---------|---------|
| **Network** | Network management and monitoring | Internal |
| **Protect** | Video surveillance and NVR | 64GB microSD |
| **Access** | Physical access control system | Internal |
| **Talk** | VoIP phone system | Internal |
| **Connect** | ISP management and billing | Internal |

**UniFi Protect Capacity:**
- 5x 1080p camera streams
- 2x 2K camera streams
- 1x 4K camera stream
- Consider external storage for expanded capacity

## Integration with NetContext

This vendor documentation is designed to work with the NetContext MCP system for:
- Automated configuration backups
- Network topology mapping
- Bulk device configuration
- Compliance monitoring
- Automated health checks
- Integration with other network devices

**NetContext Usage:**
```yaml
# Reference these commands in NetContext
vendor: ubiquiti-unifi-dream-router
command_bundle: health_check
schedule: weekly
notification: email
```

## Support and Resources

### Official Resources
- **Product Page**: https://store.ui.com/udr7
- **Tech Specs**: https://techspecs.ui.com/unifi/cloud-gateways/udr7
- **Help Center**: https://help.ui.com
- **Community Forums**: https://community.ui.com
- **Security Advisories**: https://community.ui.com/releases

### Community Resources
- **LazyAdmin UniFi Guide**: https://lazyadmin.nl/home-network/unifi-ssh-commands/
- **3os CLI Reference**: https://3os.org/infrastructure/ubiquiti/udm-dream-machine/cli-commands/
- **Reddit**: r/Ubiquiti
- **Discord**: UniFi Community Discord

### Support Channels
- **Official Support**: https://help.ui.com/hc/en-us/requests/new
- **Community Forums**: Post questions at https://community.ui.com
- **Email**: support@ui.com (for customers with active support)
- **Security Issues**: security@ui.com

## Changelog

### 2025-11-17 - Initial Release
- Created comprehensive vendor documentation
- Added commands.yml with 11 command bundles
- Created baseline-gateway.md deployment guide
- Created security-hardening.md security procedures
- Added README.md with quick start guide

## Contributing

To suggest improvements or corrections to this documentation:
1. Verify information against official Ubiquiti sources
2. Test commands on actual UDR7 hardware
3. Document firmware version for command compatibility
4. Submit changes via pull request with detailed notes

## License

This documentation is provided as-is for informational purposes. Ubiquiti, UniFi, Dream Router, and related trademarks are property of Ubiquiti Inc.

## Disclaimer

**⚠️ Important:**
- Ubiquiti does not officially support CLI-based configuration changes
- SSH access is intended for diagnostics and troubleshooting only
- Improper CLI commands can damage your network deployment
- Always create configuration backups before making changes
- Use these commands at your own risk
- When in doubt, use the UniFi Network web interface

---

**NetContext MCP Vendor Documentation**
**Device**: Ubiquiti UniFi Dream Router 7 (UDR7)
**Documentation Version**: 1.0.0
**Last Updated**: 2025-11-17
