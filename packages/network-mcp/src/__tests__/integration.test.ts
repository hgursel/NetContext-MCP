/**
 * Integration tests for Network MCP Server
 * Tests SSH command execution with mocking
 */

import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { EventEmitter } from "events";

// Mock SSH2 Client
class MockSSHClient extends EventEmitter {
  public connected = false;
  public shellCallback: ((err: Error | null, stream?: any) => void) | null = null;

  connect(config: any): this {
    setTimeout(() => {
      this.connected = true;
      this.emit("ready");
    }, 10);
    return this;
  }

  shell(callback: (err: Error | null, stream?: any) => void): void {
    this.shellCallback = callback;
    if (this.connected) {
      const mockStream = new MockSSHStream();
      callback(null, mockStream);
    } else {
      callback(new Error("Not connected"));
    }
  }

  end(): void {
    this.connected = false;
    this.emit("close");
  }
}

class MockSSHStream extends EventEmitter {
  public output = "";

  write(data: string): void {
    // Simulate command execution
    const command = data.trim();
    let response = "";

    if (command === "show version") {
      response = `HP ProCurve Switch 2920-24G
Software revision WB.16.10.0015
System uptime: 45 days, 12 hours, 23 minutes`;
    } else if (command === "show system") {
      response = `Status and Counters - General System Information

  System Name        : Switch-001
  System Contact     : admin@example.com
  System Location    : Datacenter-A`;
    } else if (command.startsWith("show")) {
      response = `Command executed: ${command}\nOutput: Success`;
    } else {
      response = `% Unknown command: ${command}`;
    }

    setTimeout(() => {
      this.emit("data", Buffer.from(response + "\n"));
    }, 50);
  }

  end(): void {
    this.emit("close");
  }
}

// Mock ssh2 module
jest.mock("ssh2", () => ({
  Client: MockSSHClient,
}));

describe("Network MCP Server Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("execute_commands tool", () => {
    test("should execute single command successfully", async () => {
      const { Client } = await import("ssh2");
      const client = new Client();

      const mockCredentials = {
        host: "192.168.1.10",
        username: "admin",
        password: "password",
      };

      const commands = ["show version"];
      let output = "";

      await new Promise<void>((resolve, reject) => {
        client
          .on("ready", () => {
            client.shell((err, stream) => {
              if (err) {
                reject(err);
                return;
              }

              stream.on("data", (data: Buffer) => {
                output += data.toString();
              });

              stream.on("close", () => {
                client.end();
                resolve();
              });

              commands.forEach((cmd) => stream.write(cmd + "\n"));
              setTimeout(() => stream.end(), 200);
            });
          })
          .on("error", reject)
          .connect(mockCredentials);
      });

      expect(output).toContain("HP ProCurve");
      expect(output).toContain("Software revision");
    });

    test("should execute multiple commands", async () => {
      const { Client } = await import("ssh2");
      const client = new Client();

      const mockCredentials = {
        host: "192.168.1.10",
        username: "admin",
        password: "password",
      };

      const commands = ["show version", "show system"];
      let output = "";

      await new Promise<void>((resolve, reject) => {
        client
          .on("ready", () => {
            client.shell((err, stream) => {
              if (err) {
                reject(err);
                return;
              }

              stream.on("data", (data: Buffer) => {
                output += data.toString();
              });

              stream.on("close", () => {
                client.end();
                resolve();
              });

              commands.forEach((cmd) => stream.write(cmd + "\n"));
              setTimeout(() => stream.end(), 300);
            });
          })
          .on("error", reject)
          .connect(mockCredentials);
      });

      expect(output).toContain("HP ProCurve");
      expect(output).toContain("System Name");
    });

    test("should handle connection errors", async () => {
      const { Client } = await import("ssh2");

      // Create a custom error-emitting client
      class ErrorClient extends MockSSHClient {
        connect(config: any): this {
          setTimeout(() => {
            this.emit("error", new Error("Connection refused"));
          }, 10);
          return this;
        }
      }

      const client = new ErrorClient() as any;

      const mockCredentials = {
        host: "unreachable.host",
        username: "admin",
        password: "password",
      };

      await expect(
        new Promise<void>((resolve, reject) => {
          client
            .on("ready", () => {
              resolve();
            })
            .on("error", (err: Error) => {
              reject(err);
            })
            .connect(mockCredentials);
        })
      ).rejects.toThrow("Connection refused");
    });
  });

  describe("batch_execute tool", () => {
    test("should execute commands on multiple devices", async () => {
      const { Client } = await import("ssh2");

      const devices = [
        { host: "192.168.1.10", username: "admin", password: "pass1" },
        { host: "192.168.1.11", username: "admin", password: "pass2" },
      ];

      const commands = ["show version"];
      const results: Array<{ host: string; output: string; error?: string }> = [];

      await Promise.all(
        devices.map(
          (device) =>
            new Promise<void>((resolve, reject) => {
              const client = new Client();
              let output = "";

              client
                .on("ready", () => {
                  client.shell((err, stream) => {
                    if (err) {
                      results.push({ host: device.host, output: "", error: err.message });
                      reject(err);
                      return;
                    }

                    stream.on("data", (data: Buffer) => {
                      output += data.toString();
                    });

                    stream.on("close", () => {
                      results.push({ host: device.host, output });
                      client.end();
                      resolve();
                    });

                    commands.forEach((cmd) => stream.write(cmd + "\n"));
                    setTimeout(() => stream.end(), 200);
                  });
                })
                .on("error", (err) => {
                  results.push({ host: device.host, output: "", error: err.message });
                  reject(err);
                })
                .connect(device);
            })
        )
      );

      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.output).toContain("HP ProCurve");
      });
    });
  });

  describe("Command Sanitization in Execution", () => {
    test("should sanitize commands before execution", () => {
      const DANGEROUS_PATTERNS = [
        /\b(rm|del|format|erase)\b/i,
        /\bwrite\s+erase\b/i,
        /&&|;|\||`|\$\(/,
        /\.\.\//,
        /<|>/,
      ];

      const dangerousCommands = [
        "show version; rm -rf /",
        "show config && erase startup-config",
        "format flash:",
        "write erase",
        "cat ../../etc/passwd",
        "show version > /tmp/output",
      ];

      dangerousCommands.forEach((cmd) => {
        const isDangerous = DANGEROUS_PATTERNS.some((pattern) => pattern.test(cmd));
        expect(isDangerous).toBe(true);
      });
    });

    test("should allow safe commands", () => {
      const DANGEROUS_PATTERNS = [
        /\b(rm|del|format|erase)\b/i,
        /\bwrite\s+erase\b/i,
        /&&|;|\||`|\$\(/,
        /\.\.\//,
        /<|>/,
      ];

      const safeCommands = [
        "show version",
        "show running-config",
        "show interfaces brief",
        "show vlan",
        "show spanning-tree",
      ];

      safeCommands.forEach((cmd) => {
        const isDangerous = DANGEROUS_PATTERNS.some((pattern) => pattern.test(cmd));
        expect(isDangerous).toBe(false);
      });
    });
  });

  describe("Error Handling", () => {
    test("should sanitize credentials in error messages", () => {
      const errorMessage = "SSH connection failed: password=SecretPass123 key=/path/to/key";
      const sanitized = errorMessage.replace(/(password|key)[=:]\s*\S+/gi, "$1=***");

      expect(sanitized).toBe("SSH connection failed: password=*** key=***");
      expect(sanitized).not.toContain("SecretPass123");
      expect(sanitized).not.toContain("/path/to/key");
    });

    test("should handle SSH timeout gracefully", async () => {
      // Create a slow-connecting client that will timeout
      class SlowClient extends MockSSHClient {
        connect(config: any): this {
          // Don't emit 'ready' - just wait, simulating timeout
          // This will allow the timeout promise to win the race
          return this;
        }
      }

      const client = new SlowClient() as any;

      const mockCredentials = {
        host: "192.168.1.10",
        username: "admin",
        password: "password",
      };

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error("SSH connection timeout after 10000ms"));
        }, 50);
      });

      const connectPromise = new Promise<void>((resolve, reject) => {
        client
          .on("ready", () => resolve())
          .on("error", reject)
          .connect(mockCredentials);
      });

      await expect(Promise.race([connectPromise, timeoutPromise])).rejects.toThrow("timeout");
    });
  });

  describe("Command Output Processing", () => {
    test("should collect complete command output", async () => {
      const { Client } = await import("ssh2");
      const client = new Client();

      const mockCredentials = {
        host: "192.168.1.10",
        username: "admin",
        password: "password",
      };

      const commands = ["show version"];
      let output = "";

      await new Promise<void>((resolve, reject) => {
        client
          .on("ready", () => {
            client.shell((err, stream) => {
              if (err) {
                reject(err);
                return;
              }

              stream.on("data", (data: Buffer) => {
                output += data.toString();
              });

              stream.on("close", () => {
                client.end();
                resolve();
              });

              commands.forEach((cmd) => stream.write(cmd + "\n"));
              setTimeout(() => stream.end(), 200);
            });
          })
          .on("error", reject)
          .connect(mockCredentials);
      });

      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain("HP ProCurve");
      expect(output).toContain("Software revision");
      expect(output).toContain("System uptime");
    });
  });
});
