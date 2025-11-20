/**
 * SSH protocol implementation
 */

import { Client, ClientChannel, ConnectConfig } from "ssh2";
import {
  BaseProtocol,
  ConnectionError,
  AuthenticationError,
  ExecutionError,
  TimeoutError,
} from "./base.js";
import { DeviceCredentials, ExecutionResult, ProtocolMetadata } from "../types/credentials.js";

// Environment configuration
const DEFAULT_PORT = parseInt(process.env.DEVICE_PORT || "22", 10);
const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT || "10000", 10);
const VERIFY_HOST_KEY = process.env.SSH_VERIFY_HOST_KEY !== "false"; // Default to true

/**
 * SSH protocol implementation using ssh2 library
 */
export class SSHProtocol extends BaseProtocol {
  private client?: Client;
  private channel?: ClientChannel;

  readonly metadata: ProtocolMetadata = {
    name: "ssh",
    version: "2.0",
    supportedAuthMethods: ["password", "private_key", "ssh_agent"],
    defaultPort: DEFAULT_PORT,
  };

  /**
   * Connect to device via SSH
   */
  async connect(credentials: DeviceCredentials): Promise<void> {
    if (this.connected) {
      throw new ConnectionError("Already connected", "ssh");
    }

    // Validate credential type
    if (
      credentials.type !== "password" &&
      credentials.type !== "private_key" &&
      credentials.type !== "ssh_agent"
    ) {
      throw new AuthenticationError(
        `Unsupported credential type for SSH: ${credentials.type}`,
        "ssh"
      );
    }

    this.credentials = credentials;
    this.client = new Client();

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new ConnectionError("SSH client not initialized", "ssh"));
        return;
      }

      const timeoutHandle = setTimeout(() => {
        this.client?.end();
        reject(new TimeoutError(`SSH connection timeout after ${SSH_TIMEOUT}ms`, "ssh"));
      }, SSH_TIMEOUT);

      this.client
        .on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
          // Handle keyboard-interactive authentication (UniFi, some Linux systems)
          // Respond to all prompts with the password
          if (credentials.type === "password") {
            const responses = prompts.map(() => credentials.password);
            finish(responses);
          } else {
            // No password available for keyboard-interactive
            finish([]);
          }
        })
        .on("ready", () => {
          clearTimeout(timeoutHandle);
          this.connected = true;
          this.connectionTime = new Date();
          resolve();
        })
        .on("error", (err) => {
          clearTimeout(timeoutHandle);
          this.connected = false;
          const sanitized = this.sanitizeError(err);

          // Determine error type
          if (err.message.includes("authentication")) {
            reject(new AuthenticationError(sanitized.message, "ssh"));
          } else if (err.message.includes("timeout")) {
            reject(new TimeoutError(sanitized.message, "ssh"));
          } else {
            reject(new ConnectionError(sanitized.message, "ssh"));
          }
        })
        .connect(this.buildSSHConfig(credentials));
    });
  }

  /**
   * Build SSH connection configuration
   */
  private buildSSHConfig(credentials: DeviceCredentials): ConnectConfig {
    const config = {
      host: credentials.host,
      port: credentials.port || DEFAULT_PORT,
      readyTimeout: SSH_TIMEOUT,
      hostVerifier: VERIFY_HOST_KEY ? undefined : (): boolean => true,
      // Support legacy algorithms for older network devices (Aruba, HP, Cisco)
      algorithms: {
        kex: [
          "diffie-hellman-group-exchange-sha256",
          "diffie-hellman-group14-sha256",
          "diffie-hellman-group14-sha1", // Legacy for older devices
          "ecdh-sha2-nistp256",
          "ecdh-sha2-nistp384",
          "ecdh-sha2-nistp521",
        ],
        serverHostKey: [
          "ssh-ed25519",
          "ecdsa-sha2-nistp256",
          "ecdsa-sha2-nistp384",
          "ecdsa-sha2-nistp521",
          "rsa-sha2-512",
          "rsa-sha2-256",
          "ssh-rsa", // Legacy for older devices
        ],
        cipher: ["aes128-gcm", "aes256-gcm", "aes128-ctr", "aes192-ctr", "aes256-ctr"],
      },
      tryKeyboard: true, // Enable keyboard-interactive for UniFi and similar devices
    } as ConnectConfig;

    switch (credentials.type) {
      case "password":
        config.username = credentials.username;
        config.password = credentials.password;
        break;

      case "private_key":
        config.username = credentials.username;
        config.privateKey = credentials.privateKey;
        if (credentials.passphrase) {
          config.passphrase = credentials.passphrase;
        }
        break;

      case "ssh_agent":
        config.username = credentials.username;
        // Use SSH_AUTH_SOCK environment variable or custom socket path
        config.agent = credentials.agentSocket || process.env.SSH_AUTH_SOCK;
        break;
    }

    return config;
  }

  /**
   * Execute commands on the device
   */
  async execute(commands: string[]): Promise<ExecutionResult> {
    if (!this.connected || !this.client) {
      throw new ExecutionError("Not connected to device", "ssh");
    }

    const sanitizedCommands = this.sanitizeCommands(commands);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new ExecutionError("SSH client not available", "ssh"));
        return;
      }

      let output = "";
      let channelClosed = false;
      let commandsSent = false;

      this.client.shell((err, stream) => {
        if (err) {
          reject(new ExecutionError(this.sanitizeError(err).message, "ssh"));
          return;
        }

        this.channel = stream;

        // Handle pagination prompts (common in network devices)
        const handlePagination = (): void => {
          const lastOutput = output.slice(-200).toLowerCase();
          // Detect pagination prompts and send space to continue
          if (
            lastOutput.includes("press any key to continue") ||
            lastOutput.includes("--more--") ||
            lastOutput.includes("-- more --") ||
            lastOutput.includes("<--- more --->")
          ) {
            stream.write(" "); // Space to continue pagination
          }
        };

        stream
          .on("close", () => {
            channelClosed = true;
            const duration = Date.now() - startTime;
            resolve({
              success: true,
              output,
              timestamp: new Date().toISOString(),
              duration,
            });
          })
          .on("data", (data: Buffer) => {
            const text = data.toString();
            output += text;

            // Handle pagination prompts immediately
            handlePagination();

            // Wait for prompt before sending commands
            if (!commandsSent && (text.includes("#") || text.includes(">"))) {
              commandsSent = true;
              // Wait a bit for prompt to stabilize
              setTimeout(() => {
                // Disable pagination if possible (device-specific)
                stream.write("no page\n"); // HP/Aruba command to disable paging

                setTimeout(() => {
                  // Send all commands
                  sanitizedCommands.forEach((cmd) => {
                    stream.write(`${cmd}\n`);
                  });

                  // Wait for output to complete before exiting
                  setTimeout(() => {
                    if (!channelClosed) {
                      stream.end("exit\n");
                    }
                  }, 3000);
                }, 500);
              }, 300);
            }
          })
          .on("error", (streamErr: Error) => {
            channelClosed = true;
            reject(new ExecutionError(this.sanitizeError(streamErr).message, "ssh"));
          });
      });

      // Timeout fallback
      setTimeout(() => {
        if (!channelClosed && this.channel) {
          this.channel.close();
          reject(new TimeoutError("Command execution timeout", "ssh"));
        }
      }, SSH_TIMEOUT + 5000);
    });
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.channel) {
        this.channel.close();
        this.channel = undefined;
      }

      if (this.client) {
        this.client.end();
        this.client = undefined;
      }

      this.connected = false;
      this.connectionTime = undefined;
      this.credentials = undefined;

      resolve();
    });
  }

  /**
   * Health check: verify connection is active
   */
  async healthCheck(): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      // Simple command to test connectivity
      const result = await this.execute(["echo 'health_check'"]);
      return result.success && result.output.includes("health_check");
    } catch {
      return false;
    }
  }
}
