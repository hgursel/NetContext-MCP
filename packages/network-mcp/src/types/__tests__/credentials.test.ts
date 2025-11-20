/**
 * Unit tests for credential types and conversions
 */

import {
  convertLegacyCredentials,
  LegacyDeviceCredentials,
  DeviceCredentials,
} from "../credentials";

describe("Credential Types", () => {
  describe("convertLegacyCredentials", () => {
    it("should convert password credentials", () => {
      const legacy: LegacyDeviceCredentials = {
        host: "192.168.1.1",
        port: 22,
        username: "admin",
        password: "secret",
      };

      const result = convertLegacyCredentials(legacy);

      expect(result.type).toBe("password");
      expect(result.host).toBe("192.168.1.1");
      expect(result.port).toBe(22);
      if (result.type === "password") {
        expect(result.username).toBe("admin");
        expect(result.password).toBe("secret");
      }
    });

    it("should convert private key credentials", () => {
      const legacy: LegacyDeviceCredentials = {
        host: "192.168.1.1",
        username: "admin",
        privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
      };

      const result = convertLegacyCredentials(legacy);

      expect(result.type).toBe("private_key");
      expect(result.host).toBe("192.168.1.1");
      if (result.type === "private_key") {
        expect(result.username).toBe("admin");
        expect(result.privateKey).toContain("BEGIN RSA PRIVATE KEY");
      }
    });

    it("should default to SSH agent when no password or key provided", () => {
      const legacy: LegacyDeviceCredentials = {
        host: "192.168.1.1",
        port: 2222,
        username: "admin",
      };

      const result = convertLegacyCredentials(legacy);

      expect(result.type).toBe("ssh_agent");
      expect(result.host).toBe("192.168.1.1");
      expect(result.port).toBe(2222);
      if (result.type === "ssh_agent") {
        expect(result.username).toBe("admin");
      }
    });

    it("should prioritize private key over password", () => {
      const legacy: LegacyDeviceCredentials = {
        host: "192.168.1.1",
        username: "admin",
        password: "secret",
        privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
      };

      const result = convertLegacyCredentials(legacy);

      expect(result.type).toBe("private_key");
    });

    it("should handle missing port", () => {
      const legacy: LegacyDeviceCredentials = {
        host: "192.168.1.1",
        username: "admin",
        password: "secret",
      };

      const result = convertLegacyCredentials(legacy);

      expect(result.port).toBeUndefined();
    });
  });

  describe("Credential Type Guards", () => {
    it("should identify password credentials", () => {
      const creds: DeviceCredentials = {
        type: "password",
        host: "192.168.1.1",
        username: "admin",
        password: "secret",
      };

      expect(creds.type).toBe("password");
      if (creds.type === "password") {
        expect(creds.username).toBeDefined();
        expect(creds.password).toBeDefined();
      }
    });

    it("should identify private key credentials", () => {
      const creds: DeviceCredentials = {
        type: "private_key",
        host: "192.168.1.1",
        username: "admin",
        privateKey: "key-data",
      };

      expect(creds.type).toBe("private_key");
      if (creds.type === "private_key") {
        expect(creds.username).toBeDefined();
        expect(creds.privateKey).toBeDefined();
      }
    });

    it("should identify SSH agent credentials", () => {
      const creds: DeviceCredentials = {
        type: "ssh_agent",
        host: "192.168.1.1",
        username: "admin",
      };

      expect(creds.type).toBe("ssh_agent");
      if (creds.type === "ssh_agent") {
        expect(creds.username).toBeDefined();
      }
    });

    it("should identify API token credentials", () => {
      const creds: DeviceCredentials = {
        type: "api_token",
        host: "192.168.1.1",
        token: "abc123",
        tokenType: "bearer",
      };

      expect(creds.type).toBe("api_token");
      if (creds.type === "api_token") {
        expect(creds.token).toBeDefined();
        expect(creds.tokenType).toBe("bearer");
      }
    });
  });
});
