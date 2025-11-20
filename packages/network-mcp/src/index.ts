#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Protocol abstraction layer
import { ProtocolFactory, ProtocolType } from "./protocols/factory.js";
import { DeviceProtocol } from "./protocols/base.js";
import { DeviceCredentials } from "./types/credentials.js";

// Environment configuration
const DEFAULT_USERNAME = process.env.DEVICE_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.DEVICE_PASSWORD;
const DEFAULT_PROTOCOL: ProtocolType = (process.env.DEFAULT_PROTOCOL as ProtocolType) || "ssh";

// Type definitions for MCP responses
interface CommandExecutionResult {
  device: string;
  commands: string[];
  output: string;
  error?: string;
  timestamp: string;
  duration?: number;
  protocol: string;
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "execute_commands",
    description:
      "Execute a list of commands on a network device. Supports multiple protocols (SSH, HTTP API, WebSocket).",
    inputSchema: {
      type: "object",
      properties: {
        host: {
          type: "string",
          description: "Device IP address or hostname",
        },
        commands: {
          type: "array",
          items: { type: "string" },
          description: "Array of commands to execute",
        },
        protocol: {
          type: "string",
          enum: ["ssh", "http", "websocket"],
          description: `Protocol to use (optional, default: ${DEFAULT_PROTOCOL})`,
        },
        username: {
          type: "string",
          description:
            "Username for authentication (optional, uses DEVICE_USERNAME env var if not provided)",
        },
        password: {
          type: "string",
          description:
            "Password for authentication (optional, uses DEVICE_PASSWORD env var if not provided)",
        },
        privateKey: {
          type: "string",
          description: "SSH private key for authentication (optional, for SSH protocol)",
        },
        apiToken: {
          type: "string",
          description: "API token for authentication (optional, for HTTP protocol)",
        },
        port: {
          type: "number",
          description: "Connection port (optional, defaults based on protocol)",
        },
      },
      required: ["host", "commands"],
    },
  },
  {
    name: "execute_bundle",
    description:
      "Execute a pre-defined command bundle on a device. Requires @netcontext/docs-mcp to retrieve bundle.",
    inputSchema: {
      type: "object",
      properties: {
        host: {
          type: "string",
          description: "Device IP address or hostname",
        },
        vendor: {
          type: "string",
          description: "Vendor name (e.g., 'hp-aruba-procurve')",
        },
        bundle: {
          type: "string",
          description:
            "Bundle name (e.g., 'health_check', 'security_audit', 'vlan_troubleshooting')",
        },
        username: {
          type: "string",
          description: "SSH username (optional)",
        },
        password: {
          type: "string",
          description: "SSH password (optional)",
        },
      },
      required: ["host", "vendor", "bundle"],
    },
  },
  {
    name: "batch_execute",
    description:
      "Execute the same command(s) on multiple devices in parallel. Returns results for each device.",
    inputSchema: {
      type: "object",
      properties: {
        hosts: {
          type: "array",
          items: { type: "string" },
          description: "Array of device IP addresses or hostnames",
        },
        commands: {
          type: "array",
          items: { type: "string" },
          description: "Array of commands to execute on all devices",
        },
        username: {
          type: "string",
          description: "SSH username (optional)",
        },
        password: {
          type: "string",
          description: "SSH password (optional)",
        },
      },
      required: ["hosts", "commands"],
    },
  },
];

/**
 * Build device credentials from tool parameters
 */
function buildCredentials(args: {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  apiToken?: string;
}): DeviceCredentials {
  const host = args.host;
  const port = args.port;
  const username = args.username || DEFAULT_USERNAME;

  // Determine credential type based on provided parameters
  if (args.apiToken) {
    return {
      type: "api_token",
      host,
      port,
      token: args.apiToken,
      tokenType: "bearer",
    };
  }

  if (args.privateKey) {
    return {
      type: "private_key",
      host,
      port,
      username,
      privateKey: args.privateKey,
    };
  }

  if (args.password || DEFAULT_PASSWORD) {
    return {
      type: "password",
      host,
      port,
      username,
      password: args.password || DEFAULT_PASSWORD || "",
    };
  }

  // Default to SSH agent if no other credentials provided
  return {
    type: "ssh_agent",
    host,
    port,
    username,
  };
}

/**
 * Execute commands on a single device using protocol abstraction
 */
async function executeSingleDevice(
  host: string,
  commands: string[],
  protocolType: ProtocolType = DEFAULT_PROTOCOL,
  credentialArgs: {
    username?: string;
    password?: string;
    privateKey?: string;
    apiToken?: string;
    port?: number;
  } = {}
): Promise<CommandExecutionResult> {
  let protocol: DeviceProtocol | undefined;

  try {
    // Create protocol instance
    protocol = ProtocolFactory.create(protocolType);

    // Build credentials
    const credentials = buildCredentials({
      host,
      ...credentialArgs,
    });

    // Connect to device
    await protocol.connect(credentials);

    // Execute commands
    const result = await protocol.execute(commands);

    // Disconnect
    await protocol.disconnect();

    return {
      device: host,
      commands,
      output: result.output,
      timestamp: result.timestamp,
      duration: result.duration,
      protocol: protocolType,
    };
  } catch (error) {
    // Ensure disconnection on error
    if (protocol) {
      try {
        await protocol.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }

    return {
      device: host,
      commands,
      output: "",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      protocol: protocolType,
    };
  }
}

/**
 * Execute commands on multiple devices in parallel
 */
async function executeBatchDevices(
  hosts: string[],
  commands: string[],
  protocolType: ProtocolType = DEFAULT_PROTOCOL,
  credentialArgs: {
    username?: string;
    password?: string;
    privateKey?: string;
    apiToken?: string;
    port?: number;
  } = {}
): Promise<CommandExecutionResult[]> {
  const executions = hosts.map((host) =>
    executeSingleDevice(host, commands, protocolType, credentialArgs)
  );
  return Promise.all(executions);
}

// MCP Server setup
const server = new Server(
  {
    name: "netcontext-network-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, (): { tools: typeof TOOLS } => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "execute_commands": {
        const host = args?.host as string;
        const commands = args?.commands as string[];
        const protocol = (args?.protocol as ProtocolType) || DEFAULT_PROTOCOL;
        const username = args?.username as string | undefined;
        const password = args?.password as string | undefined;
        const privateKey = args?.privateKey as string | undefined;
        const apiToken = args?.apiToken as string | undefined;
        const port = args?.port as number | undefined;

        if (!host || !commands || commands.length === 0) {
          throw new Error("host and commands parameters are required");
        }

        // Validate protocol
        if (!ProtocolFactory.isSupported(protocol)) {
          const protocolStr = String(protocol);
          throw new Error(
            `Unsupported protocol: ${protocolStr}. Supported: ${ProtocolFactory.getSupportedProtocols().join(", ")}`
          );
        }

        const result = await executeSingleDevice(host, commands, protocol, {
          username,
          password,
          privateKey,
          apiToken,
          port,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !!result.error,
        };
      }

      case "execute_bundle": {
        // Note: This would require integration with docs-mcp server
        // For now, return a message indicating the bundle execution pattern
        const host = args?.host as string;
        const vendor = args?.vendor as string;
        const bundle = args?.bundle as string;

        if (!host || !vendor || !bundle) {
          throw new Error("host, vendor, and bundle parameters are required");
        }

        return {
          content: [
            {
              type: "text",
              text:
                `To execute bundle '${bundle}' for vendor '${vendor}' on ${host}:\n\n` +
                `1. Use @netcontext/docs-mcp to retrieve the bundle:\n` +
                `   get_command_bundle(vendor="${vendor}", bundle="${bundle}")\n\n` +
                `2. Extract commands from the bundle response\n\n` +
                `3. Use execute_commands with the extracted commands:\n` +
                `   execute_commands(host="${host}", commands=[...])\n\n` +
                `This integration can be automated in a future version.`,
            },
          ],
        };
      }

      case "batch_execute": {
        const hosts = args?.hosts as string[];
        const commands = args?.commands as string[];
        const protocol = (args?.protocol as ProtocolType) || DEFAULT_PROTOCOL;
        const username = args?.username as string | undefined;
        const password = args?.password as string | undefined;
        const privateKey = args?.privateKey as string | undefined;
        const apiToken = args?.apiToken as string | undefined;
        const port = args?.port as number | undefined;

        if (!hosts || !commands || hosts.length === 0 || commands.length === 0) {
          throw new Error("hosts and commands parameters are required");
        }

        // Validate protocol
        if (!ProtocolFactory.isSupported(protocol)) {
          const protocolStr = String(protocol);
          throw new Error(
            `Unsupported protocol: ${protocolStr}. Supported: ${ProtocolFactory.getSupportedProtocols().join(", ")}`
          );
        }

        const results = await executeBatchDevices(hosts, commands, protocol, {
          username,
          password,
          privateKey,
          apiToken,
          port,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  summary: {
                    total: hosts.length,
                    successful: results.filter((r) => !r.error).length,
                    failed: results.filter((r) => r.error).length,
                  },
                  results,
                },
                null,
                2
              ),
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
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NetContext Network MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
