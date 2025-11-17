# Ubiquiti UniFi Dream Router 7 - Baseline Configuration

**Target Platform**: UniFi Dream Router 7 (UDR7)
**Role**: All-in-One Gateway, Router, WiFi 7 Access Point, UniFi Controller
**Last Updated**: 2025-11-17

## Configuration Checklist

### System Basics
- [x] Initial setup wizard completed via UniFi Network UI
- [x] Controller adoption and configuration
- [x] Time zone and NTP configuration
- [x] Device name and location set
- [x] Firmware updated to latest stable version
- [x] Admin account secured with strong password

### Network Configuration
- [x] WAN interface configured (10GbE SFP+ or 2.5GbE RJ45)
- [x] LAN network addressing configured
- [x] DHCP server configured for default network
- [x] DNS server configuration (upstream or local)
- [x] Default gateway properly routing traffic

### WiFi Configuration
- [x] WiFi 7 tri-band networks configured (2.4GHz, 5GHz, 6GHz)
- [x] Secure WiFi passwords (WPA3 preferred)
- [x] Guest WiFi network isolated from LAN
- [x] WiFi network names (SSIDs) configured
- [x] Channel selection optimized (auto or manual)
- [x] Transmit power configured appropriately

### VLANs and Network Segmentation
- [x] Additional VLANs created for network segmentation
- [x] IoT device VLAN configured and isolated
- [x] Guest network VLAN configured
- [x] Management VLAN for UniFi devices
- [x] VLAN-only networks for wired segmentation

### Security Features
- [x] SSH access enabled (for diagnostics only)
- [x] SSH authentication configured (password and/or keys)
- [x] Firewall rules configured for inter-VLAN traffic
- [x] IDS/IPS enabled (Intrusion Detection/Prevention)
- [x] Threat management configured
- [x] Guest network isolation enabled
- [x] Internet filtering configured (if needed)

### Access Control
- [x] Admin account with strong password
- [x] Multi-factor authentication enabled (if available)
- [x] Local admin account maintained for emergencies
- [x] User accounts created as needed
- [x] Role-based access control configured

### UniFi Services
- [x] UniFi Network application configured
- [x] UniFi Protect configured (if using cameras)
- [x] UniFi Access configured (if using access control)
- [x] UniFi Talk configured (if using VoIP)
- [x] Storage configured for Protect (64GB microSD)

### Quality of Service (QoS)
- [x] QoS enabled for traffic prioritization
- [x] VoIP traffic prioritized
- [x] Video streaming traffic configured
- [x] Gaming traffic prioritized (if needed)
- [x] Bandwidth limits configured for guest networks

### Monitoring and Logging
- [x] Remote logging configured (if available)
- [x] Email alerts configured for critical events
- [x] Device monitoring enabled
- [x] Traffic statistics tracking enabled
- [x] Deep packet inspection (DPI) enabled

## Initial Setup Guide

### 1. Hardware Installation

**Physical Setup:**
```
1. Unpack UniFi Dream Router 7
2. Place device in central location for optimal WiFi coverage
3. Connect WAN: Use 10GbE SFP+ module OR 2.5GbE RJ45 port
4. Connect LAN devices to three 2.5GbE ports
5. Power on device (internal 50W power supply)
6. Wait 3-5 minutes for boot and initialization
```

**Port Configuration:**
- **WAN Ports**: 10GbE SFP+ (primary) or 2.5GbE RJ45
- **LAN Ports**: 3x 2.5GbE (Port 1 provides PoE 15.4W for UniFi devices)
- **WiFi**: Tri-band WiFi 7 (2.4GHz/5GHz/6GHz)
- **Storage**: 64GB microSD for UniFi Protect

### 2. Initial Web Configuration

**Access the UniFi Network Interface:**
```
1. Connect device to LAN port
2. Browser navigates automatically to setup.ui.com or use IP 192.168.1.1
3. Follow UniFi Network setup wizard:
   - Create UniFi account or sign in
   - Name your device and site
   - Configure WAN connection (DHCP, Static, or PPPoE)
   - Set up WiFi networks (SSID and passwords)
   - Complete initial setup
```

**Admin Account Setup:**
```
Settings → System → Advanced → Authentication
- Username: admin
- Password: Use strong password (16+ characters, mixed case, symbols)
- Enable Two-Factor Authentication (recommended)
- Save changes
```

### 3. Enable SSH Access

**SSH Configuration (Diagnostic Use Only):**
```
UniFi Network UI:
Settings → System → Advanced → Console Settings
- Enable SSH
- SSH Authentication: Password and/or SSH Keys
- Apply changes

SSH Login:
ssh root@<device-ip>
Password: <admin-password>

Access UniFi OS Shell:
unifi-os shell
```

### 4. Network Configuration

**WAN Setup:**
```
UniFi Network UI:
Settings → Internet
- WAN Type: DHCP, Static IP, or PPPoE
- Configure connection settings
- DNS: Automatic or Custom (1.1.1.1, 8.8.8.8)
- IPv6: Enable if supported by ISP
- Apply changes
```

**LAN Network:**
```
Settings → Networks → Default (or create new)
- Network Name: LAN or Corporate
- Gateway IP: 192.168.1.1
- Subnet: 192.168.1.0/24
- DHCP: Enable
- DHCP Range: 192.168.1.100 - 192.168.1.254
- DNS: Auto or Custom
- Domain Name: local.domain (optional)
```

### 5. VLAN Configuration

**Create VLANs for Network Segmentation:**

**Guest Network VLAN:**
```
Settings → Networks → Create New Network
- Name: Guest-WiFi
- Network Type: Standard
- VLAN ID: 210
- Gateway IP: 10.0.210.1
- Subnet: 10.0.210.0/24
- DHCP: Enable (10.0.210.100 - 10.0.210.254)
- Guest Policy: Enable
- Client Device Isolation: Enable
```

**IoT Devices VLAN:**
```
Settings → Networks → Create New Network
- Name: IoT-Devices
- VLAN ID: 220
- Gateway IP: 10.0.220.1
- Subnet: 10.0.220.0/24
- DHCP: Enable
- Firewall Rules: Restrict to internet only
```

**Management VLAN (UniFi Devices):**
```
Settings → Networks → Create New Network
- Name: Management
- VLAN ID: 100
- Gateway IP: 10.0.100.1
- Subnet: 10.0.100.0/24
- DHCP: Enable
- Purpose: UniFi device management
```

### 6. WiFi Configuration

**WiFi 7 Tri-Band Networks:**

**Corporate WiFi (2.4GHz + 5GHz + 6GHz):**
```
Settings → WiFi → Create New
- Name: CorporateWiFi
- Password: StrongPassword123!
- Security: WPA3 (or WPA2/WPA3 for compatibility)
- Bands: 2.4GHz, 5GHz, 6GHz
- Network: LAN (default)
- Fast Roaming: Enable
- WiFi AI: Enable (auto-optimization)
```

**Guest WiFi (2.4GHz + 5GHz):**
```
Settings → WiFi → Create New
- Name: Guest-WiFi
- Password: GuestPassword123!
- Security: WPA2/WPA3
- Bands: 2.4GHz, 5GHz (exclude 6GHz for guest)
- Network: Guest-WiFi (VLAN 210)
- Client Device Isolation: Enable
- Guest Policy: Enable
```

**IoT WiFi (2.4GHz only):**
```
Settings → WiFi → Create New
- Name: IoT-Devices
- Password: IoTPassword123!
- Security: WPA2/WPA3
- Band: 2.4GHz only (most IoT devices)
- Network: IoT-Devices (VLAN 220)
```

### 7. Security Configuration

**Firewall Rules:**

**Block Guest to LAN:**
```
Settings → Security → Firewall → Create New Rule
- Type: LAN In
- Name: Block-Guest-to-LAN
- Action: Drop
- Source: Guest-WiFi (10.0.210.0/24)
- Destination: LAN (192.168.1.0/24)
- Apply
```

**Block IoT to LAN:**
```
Settings → Security → Firewall → Create New Rule
- Type: LAN In
- Name: Block-IoT-to-LAN
- Action: Drop
- Source: IoT-Devices (10.0.220.0/24)
- Destination: LAN (192.168.1.0/24)
- Apply
```

**Allow IoT to Internet Only:**
```
Allow All rule by default handles internet access
Specific Drop rules above prevent inter-VLAN access
```

**IDS/IPS Configuration:**
```
Settings → Security → Threat Management
- IDS/IPS: Enable
- Detection Mode: IPS (Intrusion Prevention)
- Signature Updates: Automatic
- Categories: Select all critical/high severity
```

### 8. Quality of Service (QoS)

**Configure Traffic Prioritization:**
```
Settings → Internet → Smart Queues
- Enable Smart Queues
- Download Bandwidth: <ISP-Speed> Mbps
- Upload Bandwidth: <ISP-Speed> Mbps

Traffic Rules:
- High Priority: VoIP, Video Conferencing
- Medium Priority: Streaming, Gaming
- Low Priority: File Downloads, Torrent
```

### 9. UniFi Protect Configuration

**Setup Video Surveillance (if using cameras):**
```
UniFi Protect Application:
- Storage: 64GB microSD (included)
- Camera Capacity:
  - 5x 1080p streams OR
  - 2x 2K streams OR
  - 1x 4K stream
- Add cameras via adoption process
- Configure recording schedules
- Set up motion detection zones
```

## Post-Deployment Validation

### Web UI Verification

Navigate to UniFi Network UI and verify:
```
1. Dashboard shows all devices online
2. WAN connection active and stable
3. LAN devices connected and receiving DHCP
4. WiFi clients connected across all bands
5. Throughput monitoring shows expected speeds
6. No critical alerts or errors
```

### SSH Verification Commands

```bash
# System Status
info                          # Firmware version and device info
uptime                        # System uptime and load
ubnt-device-info summary      # Hardware/software summary
ubnt-systool cputemp          # CPU temperature check

# Network Status
ifconfig                      # Interface configuration
ip route                      # Routing table
arp -a                        # ARP table
netstat -rt -n                # Routing verification

# WiFi Status
iw dev                        # Wireless interfaces
iw dev wlan0 station dump     # 2.4GHz clients
iw dev wlan1 station dump     # 5GHz clients
iw dev wlan2 station dump     # 6GHz clients

# DHCP Leases
cat /mnt/data/udapi-config/dnsmasq.lease  # Active DHCP leases

# System Logs
cat /var/log/messages | tail -50          # Recent log entries
```

## Common Issues and Fixes

### Issue: Device not adopting to controller
**Solution**:
- Verify network connectivity between device and controller
- Check adoption status in UniFi Network UI
- Use SSH command: `set-inform http://<controller-ip>:8080/inform`
- Factory reset if persistent: `set-default` via SSH

### Issue: WiFi 6GHz band not working
**Solution**:
- Verify client devices support WiFi 7 / 6GHz
- Check regional regulatory restrictions for 6GHz
- Ensure firmware is up to date
- Try manual channel selection in WiFi settings

### Issue: Low WiFi throughput
**Solution**:
- Check WiFi AI optimization status
- Verify channel congestion via RF Environment scan
- Adjust transmit power if oversaturated
- Consider band steering configuration
- Check for interference from neighboring networks

### Issue: Inter-VLAN routing not working
**Solution**:
- Verify VLAN configuration on both networks
- Check firewall rules are not blocking desired traffic
- Confirm gateway IPs are configured on each VLAN
- Test with ICMP (ping) from source to destination

### Issue: IDS/IPS blocking legitimate traffic
**Solution**:
- Review threat logs in Security > Threat Management
- Create exception rules for false positives
- Adjust detection sensitivity if needed
- Consider detection-only mode for troubleshooting

### Issue: High CPU temperature / thermal throttling
**Solution**:
- Verify device placement has adequate airflow
- Check fan operation: `ubnt-fan-speed` via SSH
- Clean dust from ventilation openings
- Consider repositioning away from heat sources
- Monitor: `ubnt-systool cputemp` and `sensors`

### Issue: UniFi OS web interface unresponsive
**Solution**:
- Wait 2-3 minutes for potential auto-recovery
- Restart UniFi OS: `ssh root@<ip>` → `/etc/init.d/S95unifios restart`
- Reboot device via SSH: `reboot`
- Factory reset as last resort (via hardware button or SSH)

## Security Hardening Notes

### SSH Security
```
- Enable SSH only when needed for diagnostics
- Use strong passwords or SSH key authentication
- Disable SSH when not actively troubleshooting
- Monitor SSH access logs regularly
- Consider IP-based access restrictions (if available)
```

### Network Security Best Practices
```
- Keep firmware updated to latest stable version
- Enable IDS/IPS with automatic signature updates
- Use WPA3 for WiFi where client devices support it
- Implement VLAN segmentation for different device types
- Create specific firewall rules for inter-VLAN communication
- Enable guest network isolation
- Regularly review firewall and threat management logs
```

### Admin Access Security
```
- Strong admin password (16+ characters, complexity)
- Enable two-factor authentication if available
- Create limited-access accounts for regular users
- Regularly review user accounts and permissions
- Monitor admin login history
- Use role-based access control
```

### Wireless Security
```
- WPA3 for all internal networks (WPA2/WPA3 for compatibility)
- Hidden SSIDs for management networks (optional)
- Client device isolation on guest networks
- MAC address filtering for sensitive networks (optional)
- Regular security audit of connected devices
- WiFi password rotation policy (every 90 days recommended)
```

## Performance Tuning

### WiFi Optimization
```
Settings → WiFi → Radio → Advanced
- Transmit Power: Auto or High (avoid Very High unless needed)
- Channel Width:
  - 2.4GHz: 20 MHz (best compatibility)
  - 5GHz: 40/80 MHz (balance speed/compatibility)
  - 6GHz: 80/160 MHz (maximum performance)
- Channel: Auto or manual (scan RF environment first)
- WiFi AI: Enable for automatic optimization
- Band Steering: Auto (prefer 5GHz/6GHz for capable clients)
```

### QoS for VoIP and Video
```
Settings → Internet → Smart Queues
- Enable QoS
- Configure WAN bandwidth limits accurately
- Create traffic rules:
  - VoIP: High Priority (ports 5060, 5061, RTP 10000-20000)
  - Video Conferencing: High Priority (Zoom, Teams, WebEx)
  - Streaming: Medium Priority (Netflix, YouTube)
```

### Hardware Considerations
```
- WAN Connection: Use 10GbE SFP+ for multi-gigabit internet
- LAN Ports: 2.5GbE supports up to 2.5 Gbps per device
- PoE: Top LAN port provides 15.4W for UniFi AP or switch
- Storage: 64GB microSD adequate for basic Protect use
  - Consider external storage for expanded camera systems
```

## Backup and Recovery

### Configuration Backup
```
UniFi Network UI:
Settings → System → Backup
- Create backup: Downloads .unf backup file
- Schedule automatic backups (daily recommended)
- Store backups in secure off-site location
```

### Restore Configuration
```
Settings → System → Restore
- Upload .unf backup file
- Confirm restore operation
- Device will reboot and apply backed-up configuration
- Re-adopt devices if necessary
```

### Factory Reset Procedures

**Via Web UI:**
```
Settings → System → Advanced → Factory Reset
- Confirm factory reset
- Device reboots to factory defaults
- Re-run setup wizard
```

**Via SSH:**
```
ssh root@<device-ip>
set-default
# Device resets to factory defaults
```

**Physical Reset Button:**
```
1. Locate reset button on device
2. Power on device
3. Press and hold reset button for 10+ seconds
4. Device resets to factory defaults
5. Re-run setup wizard
```

## References

- **UniFi Dream Router 7 Tech Specs**: https://techspecs.ui.com/unifi/cloud-gateways/udr7
- **Ubiquiti Help Center**: https://help.ui.com
- **UniFi Community Forums**: https://community.ui.com
- **NetContext Repository**: `ubiquiti-unifi-dream-router/commands.yml`

## Important Notes

**Configuration Philosophy:**
- **Primary Management**: UniFi Network web UI (recommended)
- **SSH Access**: Diagnostic and troubleshooting only
- **Controller Override**: UI changes will override CLI modifications
- **Backup Strategy**: Regular automated backups of configuration

**Support and Troubleshooting:**
- Ubiquiti does not officially support CLI-based configuration
- SSH access may void warranty if misused
- Always consult official documentation before CLI changes
- Use SSH at your own risk - incorrect commands can break deployment
