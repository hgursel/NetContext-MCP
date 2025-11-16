#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "js-yaml";

// Environment configuration
const REPO_PATH = process.env.NETCONTEXT_REPO_PATH || path.join(process.cwd(), "../..");
const VENDOR_PATH = path.join(REPO_PATH, "vendor");

// Type definitions
interface CommandBundle {
  vendor: string;
  platform_notes?: string;
  bundles: {
    [key: string]: {
      description: string;
      last_updated: string;
      commands: string[];
    };
  };
}

interface BaselineConfig {
  vendor: string;
  role: string;
  content: string;
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "get_command_bundle",
    description:
      "Retrieve a specific command bundle for a vendor. Returns the bundle with commands and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        vendor: {
          type: "string",
          description: "Vendor name (e.g., 'hp-aruba-procurve')",
        },
        bundle: {
          type: "string",
          description:
            "Bundle name (e.g., 'health_check', 'security_audit', 'vlan_troubleshooting')",
        },
      },
      required: ["vendor", "bundle"],
    },
  },
  {
    name: "list_vendors",
    description:
      "List all available vendors in the NetContext documentation repository.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_bundles",
    description: "List all available command bundles for a specific vendor.",
    inputSchema: {
      type: "object",
      properties: {
        vendor: {
          type: "string",
          description: "Vendor name (e.g., 'hp-aruba-procurve')",
        },
      },
      required: ["vendor"],
    },
  },
  {
    name: "get_baseline_config",
    description:
      "Retrieve baseline configuration documentation for a specific vendor and role.",
    inputSchema: {
      type: "object",
      properties: {
        vendor: {
          type: "string",
          description: "Vendor name (e.g., 'hp-aruba-procurve')",
        },
        role: {
          type: "string",
          description:
            "Device role (e.g., 'access', 'distribution', 'core', 'security-hardening')",
        },
      },
      required: ["vendor", "role"],
    },
  },
  {
    name: "search_commands",
    description:
      "Search for commands across all vendors that match a specific pattern or keyword.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "Search keyword (e.g., 'vlan', 'interface', 'spanning-tree')",
        },
        vendor: {
          type: "string",
          description: "Optional: Limit search to specific vendor",
        },
      },
      required: ["keyword"],
    },
  },
];

// Helper functions
async function listVendors(): Promise<string[]> {
  try {
    const entries = await fs.readdir(VENDOR_PATH, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    console.error("Error listing vendors:", error);
    return [];
  }
}

async function getCommandBundle(
  vendor: string,
  bundleName: string
): Promise<CommandBundle | null> {
  try {
    // Validate vendor name to prevent path traversal
    if (!vendor.match(/^[a-z0-9-]+$/)) {
      throw new Error(`Invalid vendor name: ${vendor}`);
    }

    const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");
    const fileContent = await fs.readFile(commandsPath, "utf-8");

    // Use safe YAML schema to prevent code execution
    const data = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA }) as CommandBundle;

    if (!data.bundles[bundleName]) {
      return null;
    }

    return {
      vendor: data.vendor,
      platform_notes: data.platform_notes,
      bundles: {
        [bundleName]: data.bundles[bundleName],
      },
    };
  } catch (error) {
    console.error(`Error loading command bundle for ${vendor}:`, error);
    return null;
  }
}

async function listBundles(vendor: string): Promise<string[]> {
  try {
    // Validate vendor name to prevent path traversal
    if (!vendor.match(/^[a-z0-9-]+$/)) {
      throw new Error(`Invalid vendor name: ${vendor}`);
    }

    const commandsPath = path.join(VENDOR_PATH, vendor, "commands.yml");
    const fileContent = await fs.readFile(commandsPath, "utf-8");

    // Use safe YAML schema to prevent code execution
    const data = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA }) as CommandBundle;
    return Object.keys(data.bundles);
  } catch (error) {
    console.error(`Error listing bundles for ${vendor}:`, error);
    return [];
  }
}

async function getBaselineConfig(
  vendor: string,
  role: string
): Promise<BaselineConfig | null> {
  try {
    // Validate vendor and role names to prevent path traversal
    if (!vendor.match(/^[a-z0-9-]+$/)) {
      throw new Error(`Invalid vendor name: ${vendor}`);
    }
    if (!role.match(/^[a-z0-9-]+$/)) {
      throw new Error(`Invalid role name: ${role}`);
    }

    const baselinePath = path.join(VENDOR_PATH, vendor, `baseline-${role}.md`);
    const content = await fs.readFile(baselinePath, "utf-8");
    return {
      vendor,
      role,
      content,
    };
  } catch (error) {
    console.error(`Error loading baseline config for ${vendor}/${role}:`, error);
    return null;
  }
}

async function searchCommands(
  keyword: string,
  vendor?: string
): Promise<Array<{ vendor: string; bundle: string; commands: string[] }>> {
  const results: Array<{ vendor: string; bundle: string; commands: string[] }> = [];

  // Validate vendor name if provided
  if (vendor && !vendor.match(/^[a-z0-9-]+$/)) {
    throw new Error(`Invalid vendor name: ${vendor}`);
  }

  const vendors = vendor ? [vendor] : await listVendors();

  for (const v of vendors) {
    try {
      const commandsPath = path.join(VENDOR_PATH, v, "commands.yml");
      const fileContent = await fs.readFile(commandsPath, "utf-8");

      // Use safe YAML schema to prevent code execution
      const data = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA }) as CommandBundle;

      for (const [bundleName, bundle] of Object.entries(data.bundles)) {
        const matchingCommands = bundle.commands.filter((cmd) =>
          cmd.toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchingCommands.length > 0) {
          results.push({
            vendor: v,
            bundle: bundleName,
            commands: matchingCommands,
          });
        }
      }
    } catch (error) {
      console.error(`Error searching commands for ${v}:`, error);
    }
  }

  return results;
}

// MCP Server setup
const server = new Server(
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

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_vendors": {
        const vendors = await listVendors();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ vendors }, null, 2),
            },
          ],
        };
      }

      case "list_bundles": {
        const vendor = args?.vendor as string;
        if (!vendor) {
          throw new Error("vendor parameter is required");
        }
        const bundles = await listBundles(vendor);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ vendor, bundles }, null, 2),
            },
          ],
        };
      }

      case "get_command_bundle": {
        const vendor = args?.vendor as string;
        const bundle = args?.bundle as string;
        if (!vendor || !bundle) {
          throw new Error("vendor and bundle parameters are required");
        }
        const bundleData = await getCommandBundle(vendor, bundle);
        if (!bundleData) {
          throw new Error(`Bundle '${bundle}' not found for vendor '${vendor}'`);
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(bundleData, null, 2),
            },
          ],
        };
      }

      case "get_baseline_config": {
        const vendor = args?.vendor as string;
        const role = args?.role as string;
        if (!vendor || !role) {
          throw new Error("vendor and role parameters are required");
        }
        const config = await getBaselineConfig(vendor, role);
        if (!config) {
          throw new Error(`Baseline config not found for ${vendor}/${role}`);
        }
        return {
          content: [
            {
              type: "text",
              text: config.content,
            },
          ],
        };
      }

      case "search_commands": {
        const keyword = args?.keyword as string;
        const vendor = args?.vendor as string | undefined;
        if (!keyword) {
          throw new Error("keyword parameter is required");
        }
        const results = await searchCommands(keyword, vendor);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ keyword, results }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NetContext Docs MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
