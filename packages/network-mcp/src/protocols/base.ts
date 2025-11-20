/**
 * Base protocol interface and abstract class for device communication
 */

import { DeviceCredentials, ExecutionResult, ProtocolMetadata } from "../types/credentials.js";

/**
 * Base protocol interface that all protocol implementations must follow
 */
export interface DeviceProtocol {
  /**
   * Protocol metadata
   */
  readonly metadata: ProtocolMetadata;

  /**
   * Establish connection to the device
   * @param credentials - Device credentials
   * @throws Error if connection fails
   */
  connect(credentials: DeviceCredentials): Promise<void>;

  /**
   * Execute commands on the device
   * @param commands - Array of commands to execute
   * @returns Execution result with output
   * @throws Error if execution fails
   */
  execute(commands: string[]): Promise<ExecutionResult>;

  /**
   * Disconnect from the device
   */
  disconnect(): Promise<void>;

  /**
   * Check if connection is healthy and device is reachable
   * @returns true if device is healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;

  /**
   * Check if currently connected to device
   */
  isConnected(): boolean;
}

/**
 * Abstract base class providing common protocol functionality
 */
export abstract class BaseProtocol implements DeviceProtocol {
  protected credentials?: DeviceCredentials;
  protected connected = false;
  protected connectionTime?: Date;

  abstract readonly metadata: ProtocolMetadata;

  /**
   * Validate and sanitize commands before execution
   */
  protected sanitizeCommands(commands: string[]): string[] {
    const DANGEROUS_PATTERNS = [
      /\b(rm|del|format|erase)\b/i, // Destructive commands
      /\bwrite\s+erase\b/i, // Write erase command
      /&&|;|\||`|\$\(/, // Command chaining
      /\.\.\//, // Path traversal
      /<|>/, // Redirection
    ];

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

  /**
   * Sanitize error messages to prevent credential leaks
   */
  protected sanitizeError(error: Error): Error {
    const safeMessage = error.message.replace(/(password|key|token)[=:]\s*\S+/gi, "$1=***");
    return new Error(safeMessage);
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connection uptime in seconds
   */
  protected getConnectionUptime(): number {
    if (!this.connectionTime) return 0;
    return Math.floor((Date.now() - this.connectionTime.getTime()) / 1000);
  }

  // Abstract methods that implementations must provide
  abstract connect(credentials: DeviceCredentials): Promise<void>;
  abstract execute(commands: string[]): Promise<ExecutionResult>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}

/**
 * Protocol error types
 */
export class ProtocolError extends Error {
  constructor(
    message: string,
    public readonly protocol: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}

export class ConnectionError extends ProtocolError {
  constructor(message: string, protocol: string) {
    super(message, protocol, "CONNECTION_ERROR");
    this.name = "ConnectionError";
  }
}

export class AuthenticationError extends ProtocolError {
  constructor(message: string, protocol: string) {
    super(message, protocol, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class ExecutionError extends ProtocolError {
  constructor(message: string, protocol: string) {
    super(message, protocol, "EXECUTION_ERROR");
    this.name = "ExecutionError";
  }
}

export class TimeoutError extends ProtocolError {
  constructor(message: string, protocol: string) {
    super(message, protocol, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}
