# SSH Test Server for NetContext MCP Testing
# Simulates a network device with SSH access

FROM alpine:latest

# Install OpenSSH server and basic utilities
RUN apk add --no-cache \
    openssh-server \
    openssh-client \
    bash \
    net-tools \
    iputils \
    curl \
    vim

# Create test user
RUN adduser -D -s /bin/bash netadmin && \
    echo "netadmin:testpass123" | chpasswd

# Configure SSH
RUN ssh-keygen -A && \
    mkdir -p /home/netadmin/.ssh && \
    chown -R netadmin:netadmin /home/netadmin/.ssh && \
    chmod 700 /home/netadmin/.ssh

# SSH server configuration
RUN sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
    sed -i 's/#AuthorizedKeysFile.*/AuthorizedKeysFile .ssh\/authorized_keys/' /etc/ssh/sshd_config

# Create mock network device commands
RUN mkdir -p /usr/local/bin

# Simulate 'show version' command
RUN echo '#!/bin/bash' > /usr/local/bin/show && \
    echo 'case "$1" in' >> /usr/local/bin/show && \
    echo '  version)' >> /usr/local/bin/show && \
    echo '    echo "Mock Network Device OS v1.0"' >> /usr/local/bin/show && \
    echo '    echo "Hostname: test-device"' >> /usr/local/bin/show && \
    echo '    echo "Uptime: 42 days"' >> /usr/local/bin/show && \
    echo '    ;;' >> /usr/local/bin/show && \
    echo '  interfaces)' >> /usr/local/bin/show && \
    echo '    echo "Interface Status:"' >> /usr/local/bin/show && \
    echo '    echo "eth0      UP      192.168.1.100"' >> /usr/local/bin/show && \
    echo '    echo "eth1      DOWN    N/A"' >> /usr/local/bin/show && \
    echo '    ;;' >> /usr/local/bin/show && \
    echo '  system)' >> /usr/local/bin/show && \
    echo '    echo "System Information:"' >> /usr/local/bin/show && \
    echo '    echo "CPU: 4 cores"' >> /usr/local/bin/show && \
    echo '    echo "Memory: 8GB"' >> /usr/local/bin/show && \
    echo '    ;;' >> /usr/local/bin/show && \
    echo '  *)' >> /usr/local/bin/show && \
    echo '    echo "Unknown command: show $1"' >> /usr/local/bin/show && \
    echo '    ;;' >> /usr/local/bin/show && \
    echo 'esac' >> /usr/local/bin/show && \
    chmod +x /usr/local/bin/show

# Add show command to PATH and create aliases
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> /home/netadmin/.bashrc && \
    echo 'alias show="/usr/local/bin/show"' >> /home/netadmin/.bashrc

# Expose SSH port
EXPOSE 22

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D", "-e"]
