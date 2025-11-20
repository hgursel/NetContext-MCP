/**
 * Unit tests for SSH protocol implementation
 */

import { SSHProtocol } from "../ssh";
import { ConnectionError, AuthenticationError, ExecutionError, TimeoutError } from "../base";

describe("SSHProtocol", () => {
  let protocol: SSHProtocol;

  beforeEach(() => {
    protocol = new SSHProtocol();
  });

  afterEach(async () => {
    if (protocol.isConnected()) {
      await protocol.disconnect();
    }
  });

  describe("metadata", () => {
    it("should have correct protocol metadata", () => {
      expect(protocol.metadata.name).toBe("ssh");
      expect(protocol.metadata.version).toBe("2.0");
      expect(protocol.metadata.supportedAuthMethods).toContain("password");
      expect(protocol.metadata.supportedAuthMethods).toContain("private_key");
      expect(protocol.metadata.supportedAuthMethods).toContain("ssh_agent");
    });
  });

  describe("isConnected", () => {
    it("should return false when not connected", () => {
      expect(protocol.isConnected()).toBe(false);
    });
  });

  describe("connect", () => {
    it("should reject unsupported credential types", async () => {
      const credentials = {
        type: "api_token" as const,
        host: "192.168.1.1",
        token: "test-token",
      };

      await expect(protocol.connect(credentials)).rejects.toThrow(AuthenticationError);
      await expect(protocol.connect(credentials)).rejects.toThrow(
        "Unsupported credential type for SSH"
      );
    });

    it("should reject when already connected", async () => {
      // Mock connection state
      (protocol as any).connected = true;

      const credentials = {
        type: "password" as const,
        host: "192.168.1.1",
        username: "admin",
        password: "test",
      };

      await expect(protocol.connect(credentials)).rejects.toThrow(ConnectionError);
      await expect(protocol.connect(credentials)).rejects.toThrow("Already connected");
    });
  });

  describe("execute", () => {
    it("should throw ExecutionError when not connected", async () => {
      await expect(protocol.execute(["show version"])).rejects.toThrow(ExecutionError);
      await expect(protocol.execute(["show version"])).rejects.toThrow("Not connected to device");
    });

    it("should sanitize commands before execution", async () => {
      // Mock connection
      (protocol as any).connected = true;
      (protocol as any).client = {};

      // Test dangerous command patterns
      const dangerousCommands = [
        ["rm -rf /"],
        ["write erase"],
        ["command1 && command2"],
        ["ls ../../../"],
        ["cat < /etc/passwd"],
      ];

      for (const commands of dangerousCommands) {
        await expect(protocol.execute(commands)).rejects.toThrow(
          "Potentially dangerous command blocked"
        );
      }
    });

    it("should reject empty commands", async () => {
      (protocol as any).connected = true;
      (protocol as any).client = {};

      await expect(protocol.execute([""])).rejects.toThrow("Empty command not allowed");
      await expect(protocol.execute(["   "])).rejects.toThrow("Empty command not allowed");
    });

    it("should reject commands exceeding maximum length", async () => {
      (protocol as any).connected = true;
      (protocol as any).client = {};

      const longCommand = "a".repeat(1001);
      await expect(protocol.execute([longCommand])).rejects.toThrow(
        "Command exceeds maximum length"
      );
    });
  });

  describe("disconnect", () => {
    it("should safely disconnect when not connected", async () => {
      await expect(protocol.disconnect()).resolves.not.toThrow();
      expect(protocol.isConnected()).toBe(false);
    });

    it("should clean up connection state", async () => {
      // Mock connection
      (protocol as any).connected = true;
      (protocol as any).connectionTime = new Date();
      (protocol as any).credentials = {
        type: "password",
        host: "192.168.1.1",
        username: "admin",
        password: "test",
      };

      await protocol.disconnect();

      expect(protocol.isConnected()).toBe(false);
      expect((protocol as any).connectionTime).toBeUndefined();
      expect((protocol as any).credentials).toBeUndefined();
    });
  });

  describe("healthCheck", () => {
    it("should return false when not connected", async () => {
      expect(await protocol.healthCheck()).toBe(false);
    });

    it("should return false when client is undefined", async () => {
      (protocol as any).connected = true;
      (protocol as any).client = undefined;

      expect(await protocol.healthCheck()).toBe(false);
    });
  });

  describe("command sanitization", () => {
    it("should trim whitespace from commands", async () => {
      (protocol as any).connected = true;

      const sanitized = (protocol as any).sanitizeCommands([
        "  show version  ",
        "\tshow interfaces\t",
      ]);

      expect(sanitized).toEqual(["show version", "show interfaces"]);
    });

    it("should allow safe network commands", async () => {
      (protocol as any).connected = true;

      const safeCommands = [
        "show version",
        "show interfaces",
        "show running-config",
        "ping 192.168.1.1",
        "traceroute google.com",
      ];

      const sanitized = (protocol as any).sanitizeCommands(safeCommands);
      expect(sanitized).toEqual(safeCommands);
    });
  });

  describe("error sanitization", () => {
    it("should sanitize passwords in error messages", () => {
      const error = new Error("Connection failed: password=secret123 invalid");
      const sanitized = (protocol as any).sanitizeError(error);

      expect(sanitized.message).not.toContain("secret123");
      expect(sanitized.message).toContain("password=***");
    });

    it("should sanitize tokens in error messages", () => {
      const error = new Error("Auth failed: token:abc123xyz");
      const sanitized = (protocol as any).sanitizeError(error);

      expect(sanitized.message).not.toContain("abc123xyz");
      expect(sanitized.message).toContain("token=***");
    });

    it("should sanitize keys in error messages", () => {
      const error = new Error("SSH key=rsa-key-data failed");
      const sanitized = (protocol as any).sanitizeError(error);

      expect(sanitized.message).not.toContain("rsa-key-data");
      expect(sanitized.message).toContain("key=***");
    });
  });
});
