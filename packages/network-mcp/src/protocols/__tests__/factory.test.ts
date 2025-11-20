/**
 * Unit tests for Protocol Factory
 */

import { ProtocolFactory } from "../factory";
import { SSHProtocol } from "../ssh";

describe("ProtocolFactory", () => {
  describe("create", () => {
    it("should create SSH protocol instance", () => {
      const protocol = ProtocolFactory.create("ssh");

      expect(protocol).toBeInstanceOf(SSHProtocol);
      expect(protocol.metadata.name).toBe("ssh");
    });

    it("should throw error for unsupported protocol", () => {
      expect(() => {
        ProtocolFactory.create("unsupported" as any);
      }).toThrow("Unsupported protocol type: unsupported");
    });

    it("should include supported protocols in error message", () => {
      try {
        ProtocolFactory.create("invalid" as any);
        fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Supported types:");
        expect((error as Error).message).toContain("ssh");
      }
    });
  });

  describe("isSupported", () => {
    it("should return true for SSH protocol", () => {
      expect(ProtocolFactory.isSupported("ssh")).toBe(true);
    });

    it("should return false for unsupported protocols", () => {
      expect(ProtocolFactory.isSupported("unknown")).toBe(false);
      expect(ProtocolFactory.isSupported("")).toBe(false);
      expect(ProtocolFactory.isSupported("telnet")).toBe(false);
    });

    it("should return false for http protocol (not yet implemented)", () => {
      expect(ProtocolFactory.isSupported("http")).toBe(false);
    });

    it("should return false for websocket protocol (not yet implemented)", () => {
      expect(ProtocolFactory.isSupported("websocket")).toBe(false);
    });
  });

  describe("getSupportedProtocols", () => {
    it("should return array of supported protocols", () => {
      const protocols = ProtocolFactory.getSupportedProtocols();

      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols).toContain("ssh");
      expect(protocols.length).toBeGreaterThan(0);
    });

    it("should include SSH in supported protocols", () => {
      const protocols = ProtocolFactory.getSupportedProtocols();

      expect(protocols).toContain("ssh");
    });
  });

  describe("register", () => {
    it("should allow registering new protocol implementations", () => {
      // Create a mock protocol class
      class MockProtocol {
        metadata = {
          name: "mock",
          version: "1.0",
          supportedAuthMethods: ["password"] as const,
        };

        async connect(): Promise<void> {}
        async execute(): Promise<any> {
          return {
            success: true,
            output: "mock output",
            timestamp: new Date().toISOString(),
          };
        }
        async disconnect(): Promise<void> {}
        async healthCheck(): Promise<boolean> {
          return true;
        }
        isConnected(): boolean {
          return false;
        }
      }

      // Register the mock protocol
      ProtocolFactory.register("mock" as any, MockProtocol as any);

      // Verify registration
      expect(ProtocolFactory.isSupported("mock")).toBe(true);
      expect(ProtocolFactory.getSupportedProtocols()).toContain("mock");

      // Verify instance creation
      const instance = ProtocolFactory.create("mock" as any);
      expect(instance.metadata.name).toBe("mock");
    });
  });
});
