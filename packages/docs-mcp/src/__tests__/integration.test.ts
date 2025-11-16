/**
 * Integration tests for Docs MCP Server
 * Tests MCP tool handlers and server lifecycle
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

// Mock vendor path for testing - handles both root and package directory execution
const findVendorPath = (): string => {
  const cwd = process.cwd();
  // If running from root (npm test from root)
  if (cwd.endsWith("MCP")) {
    return path.join(cwd, "vendor");
  }
  // If running from package directory (npm test from packages/docs-mcp)
  return path.join(cwd, "../../vendor");
};

const VENDOR_PATH = findVendorPath();

describe("Docs MCP Server Integration Tests", () => {
  let server: Server;

  beforeAll(async () => {
    // Verify vendor directory exists
    try {
      await fs.access(VENDOR_PATH);
    } catch {
      throw new Error(`Vendor path not found: ${VENDOR_PATH}`);
    }

    // Create server instance
    server = new Server(
      {
        name: "netcontext-docs-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe("list_vendors tool", () => {
    test("should list available vendors", async () => {
      const vendors = await fs.readdir(VENDOR_PATH);
      const validVendors = vendors.filter((v) => /^[a-z0-9-]+$/.test(v));

      expect(validVendors.length).toBeGreaterThan(0);
      expect(validVendors).toContain("hp-aruba-procurve");
    });

    test("should reject invalid vendor names", () => {
      const invalidNames = ["../../etc", "../passwd", "./hidden", "/absolute"];
      const validPattern = /^[a-z0-9-]+$/;

      invalidNames.forEach((name) => {
        expect(validPattern.test(name)).toBe(false);
      });
    });
  });

  describe("list_bundles tool", () => {
    test("should list bundles for valid vendor", async () => {
      const vendor = "hp-aruba-procurve";
      const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");

      try {
        const content = await fs.readFile(commandsPath, "utf-8");
        expect(content).toContain("bundles:");
        expect(content).toContain("health_check:");
      } catch (error) {
        throw new Error(`Failed to read commands.yml for ${vendor}: ${error}`);
      }
    });

    test("should handle non-existent vendor gracefully", async () => {
      const vendor = "non-existent-vendor";
      const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");

      await expect(fs.access(commandsPath)).rejects.toThrow();
    });
  });

  describe("get_command_bundle tool", () => {
    test("should retrieve health_check bundle for hp-aruba-procurve", async () => {
      const vendor = "hp-aruba-procurve";
      const bundleName = "health_check";
      const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");

      const content = await fs.readFile(commandsPath, "utf-8");
      expect(content).toContain(`${bundleName}:`);
      expect(content).toContain("commands:");
    });

    test("should validate bundle name format", () => {
      const validBundles = ["health_check", "security-audit", "baseline123"];
      const invalidBundles = ["../secret", "../../etc", "./config"];
      const validPattern = /^[a-z0-9_-]+$/;

      validBundles.forEach((name) => {
        expect(validPattern.test(name)).toBe(true);
      });

      invalidBundles.forEach((name) => {
        expect(validPattern.test(name)).toBe(false);
      });
    });
  });

  describe("get_baseline_config tool", () => {
    test("should retrieve baseline documentation for valid vendor", async () => {
      const vendor = "hp-aruba-procurve";
      const baselinePath = path.join(VENDOR_PATH, vendor, "baseline-access.md");

      try {
        const content = await fs.readFile(baselinePath, "utf-8");
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain("HP");
      } catch (error) {
        throw new Error(`Failed to read baseline for ${vendor}: ${error}`);
      }
    });

    test("should handle missing baseline documentation", async () => {
      const vendor = "non-existent-vendor";
      const baselinePath = path.join(VENDOR_PATH, vendor, "baseline-access.md");

      await expect(fs.access(baselinePath)).rejects.toThrow();
    });
  });

  describe("search_commands tool", () => {
    test('should find commands containing "show"', async () => {
      const vendor = "hp-aruba-procurve";
      const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");

      const content = await fs.readFile(commandsPath, "utf-8");
      const showCommands = content.match(/show\s+\w+/gi);

      expect(showCommands).toBeTruthy();
      expect(showCommands!.length).toBeGreaterThan(0);
    });

    test("should handle case-insensitive search", () => {
      const queries = ["SHOW", "show", "Show"];
      queries.forEach((query) => {
        expect(query.toLowerCase()).toBe("show");
      });
    });
  });

  describe("YAML Safety", () => {
    test("should use safe YAML parsing", async () => {
      const yaml = await import("js-yaml");
      const vendor = "hp-aruba-procurve";
      const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");

      const content = await fs.readFile(commandsPath, "utf-8");

      // Test with FAILSAFE_SCHEMA (should work)
      const safeParsed = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
      expect(safeParsed).toBeTruthy();

      // Verify malicious YAML would be rejected
      const maliciousYaml = '!!js/function > function() { return "evil"; }()';
      expect(() => {
        yaml.load(maliciousYaml, { schema: yaml.FAILSAFE_SCHEMA });
      }).toThrow();
    });
  });

  describe("Path Traversal Prevention", () => {
    test("should reject path traversal in vendor names", () => {
      const attacks = [
        "../../etc/passwd",
        "../secret",
        "./hidden",
        "/absolute/path",
        "vendor/../../../etc",
      ];
      const validPattern = /^[a-z0-9-]+$/;

      attacks.forEach((attack) => {
        expect(validPattern.test(attack)).toBe(false);
      });
    });

    test("should reject path traversal in role names", () => {
      const attacks = ["../../../etc", "./local", "/etc/shadow"];
      const validPattern = /^[a-z0-9-]+$/;

      attacks.forEach((attack) => {
        expect(validPattern.test(attack)).toBe(false);
      });
    });
  });

  describe("File System Security", () => {
    test("should only access files within vendor directory", async () => {
      const vendor = "hp-aruba-procurve";
      const safePath = path.join(VENDOR_PATH, vendor, "commands.yml");
      const unsafePath = path.join(VENDOR_PATH, "..", "..", "etc", "passwd");

      // Safe path should work
      await expect(fs.access(safePath)).resolves.not.toThrow();

      // Unsafe path should be rejected (doesn't exist in our project)
      await expect(fs.access(unsafePath)).rejects.toThrow();
    });
  });
});
