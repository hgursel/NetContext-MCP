#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "ssh2";

// Environment configuration
const DEFAULT_USERNAME = process.env.DEVICE_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.DEVICE_PASSWORD;
const DEFAULT_PORT = parseInt(process.env.DEVICE_PORT || "22", 10);
const SSH_TIMEOUT = parseInt(process.env.SSH_TIMEOUT || "10000", 10);
const VERIFY_HOST_KEY = process.env.SSH_VERIFY_HOST_KEY !== "false"; // Default to true

// Command sanitization patterns
const DANGEROUS_PATTERNS = [
  /\b(rm|del|format|erase)\b/i, // Destructive commands (standalone)
  /\bwrite\s+erase\b/i, // Write erase command
  /&&|;|\||`|\$\(/, // Command chaining
  /\.\.\//, // Path traversal
  /<|>/, // Redirection
];

/**
 * Sanitize and validate commands before execution
 * Prevents command injection and dangerous operations
 */
function sanitizeCommands(commands: string[]): string[] {
  return commands.map((cmd) => {
    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(cmd)) {
        throw new Error(`Potentially dangerous command blocked: ${cmd}`);
      }
    }

    // Trim whitespace
    const sanitized = cmd.trim();

    // Reject empty commands
    if (sanitized.length === 0) {
      throw new Error("Empty command not allowed");
    }

    // Reject commands longer than 1000 characters
    if (sanitized.length > 1000) {
      throw new Error("Command exceeds maximum length of 1000 characters");
    }

    return sanitized;
  });
}

// Type definitions
interface DeviceCredentials {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

interface CommandExecutionResult {
  device: string;
  commands: string[];
  output: string;
  error?: string;
  timestamp: string;
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "execute_commands",
    description:
      "Execute a list of commands on a network device via SSH. Returns the combined output.",
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
        username: {
          type: "string",
          description: "SSH username (optional, uses DEVICE_USERNAME env var if not provided)",
        },
        password: {
          type: "string",
          description: "SSH password (optional, uses DEVICE_PASSWORD env var if not provided)",
        },
        port: {
          type: "number",
          description: "SSH port (optional, default 22)",
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

// SSH Helper functions
async function executeSSHCommands(
  credentials: DeviceCredentials,
  commands: string[]
): Promise<string> {
  // Sanitize commands before execution
  const sanitizedCommands = sanitizeCommands(commands);

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = "";
    let connectionClosed = false;

    conn
      .on("ready", () => {
        // Execute commands in a single shell session
        conn.shell((err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream
            .on("close", () => {
              connectionClosed = true;
              conn.end();
              resolve(output);
            })
            .on("data", (data: Buffer) => {
              output += data.toString();
            });

          // Send sanitized commands
          sanitizedCommands.forEach((cmd) => {
            stream.write(`${cmd}\n`);
          });

          // Exit shell
          setTimeout(() => {
            if (!connectionClosed) {
              stream.end("exit\n");
            }
          }, 1000);
        });
      })
      .on("error", (err) => {
        connectionClosed = true;
        // Sanitize error messages to prevent credential leaks
        const safeMessage = err.message.replace(/(password|key)[=:]\s*\S+/gi, "$1=***");
        reject(new Error(safeMessage));
      })
      .connect({
        host: credentials.host,
        port: credentials.port || DEFAULT_PORT,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        readyTimeout: SSH_TIMEOUT,
        // Host key verification
        hostVerifier: VERIFY_HOST_KEY ? undefined : (): boolean => true, // If verification disabled, accept all
      });

    // Timeout fallback
    setTimeout(() => {
      if (!connectionClosed) {
        conn.end();
        reject(new Error(`SSH connection timeout after ${SSH_TIMEOUT}ms`));
      }
    }, SSH_TIMEOUT + 5000);
  });
}

async function executeSingleDevice(
  host: string,
  commands: string[],
  username?: string,
  password?: string
): Promise<CommandExecutionResult> {
  const credentials: DeviceCredentials = {
    host,
    username: username || DEFAULT_USERNAME,
    password: password || DEFAULT_PASSWORD,
  };

  try {
    const output = await executeSSHCommands(credentials, commands);
    return {
      device: host,
      commands,
      output,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      device: host,
      commands,
      output: "",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

async function executeBatchDevices(
  hosts: string[],
  commands: string[],
  username?: string,
  password?: string
): Promise<CommandExecutionResult[]> {
  const executions = hosts.map((host) => executeSingleDevice(host, commands, username, password));
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
        const username = args?.username as string | undefined;
        const password = args?.password as string | undefined;

        if (!host || !commands || commands.length === 0) {
          throw new Error("host and commands parameters are required");
        }

        const result = await executeSingleDevice(host, commands, username, password);

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
        const username = args?.username as string | undefined;
        const password = args?.password as string | undefined;

        if (!hosts || !commands || hosts.length === 0 || commands.length === 0) {
          throw new Error("hosts and commands parameters are required");
        }

        const results = await executeBatchDevices(hosts, commands, username, password);

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
