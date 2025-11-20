/**
 * Credential types for device authentication across all protocols
 */

/**
 * Base credential interface
 */
export interface BaseCredentials {
  host: string;
  port?: number;
}

/**
 * Username/password authentication
 */
export interface PasswordCredentials extends BaseCredentials {
  type: "password";
  username: string;
  password: string;
}

/**
 * SSH private key authentication
 */
export interface PrivateKeyCredentials extends BaseCredentials {
  type: "private_key";
  username: string;
  privateKey: string;
  passphrase?: string;
}

/**
 * SSH agent authentication
 */
export interface SSHAgentCredentials extends BaseCredentials {
  type: "ssh_agent";
  username: string;
  agentSocket?: string; // Optional path to SSH agent socket
}

/**
 * API token/bearer token authentication
 */
export interface APITokenCredentials extends BaseCredentials {
  type: "api_token";
  token: string;
  tokenType?: "bearer" | "api_key"; // Default: bearer
}

/**
 * Union type for all credential types
 */
export type DeviceCredentials =
  | PasswordCredentials
  | PrivateKeyCredentials
  | SSHAgentCredentials
  | APITokenCredentials;

/**
 * Legacy credential format for backward compatibility
 */
export interface LegacyDeviceCredentials {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

/**
 * Convert legacy credentials to new format
 */
export function convertLegacyCredentials(legacy: LegacyDeviceCredentials): DeviceCredentials {
  if (legacy.privateKey) {
    return {
      type: "private_key",
      host: legacy.host,
      port: legacy.port,
      username: legacy.username,
      privateKey: legacy.privateKey,
    };
  }

  if (legacy.password) {
    return {
      type: "password",
      host: legacy.host,
      port: legacy.port,
      username: legacy.username,
      password: legacy.password,
    };
  }

  // Default to SSH agent if no password or key provided
  return {
    type: "ssh_agent",
    host: legacy.host,
    port: legacy.port,
    username: legacy.username,
  };
}

/**
 * Command execution result
 */
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  timestamp: string;
  duration?: number; // Execution time in milliseconds
}

/**
 * Protocol metadata
 */
export interface ProtocolMetadata {
  name: string;
  version: string;
  supportedAuthMethods: Array<"password" | "private_key" | "ssh_agent" | "api_token">;
  defaultPort?: number;
}
