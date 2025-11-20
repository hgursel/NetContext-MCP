/**
 * Protocol factory for instantiating protocol handlers
 */

import { DeviceProtocol } from "./base.js";
import { SSHProtocol } from "./ssh.js";

/**
 * Supported protocol types
 */
export type ProtocolType = "ssh" | "http" | "websocket";

/**
 * Protocol factory for creating protocol instances
 */
export class ProtocolFactory {
  private static protocols = new Map<ProtocolType, new () => DeviceProtocol>();

  /**
   * Register a protocol implementation
   */
  static register(type: ProtocolType, implementation: new () => DeviceProtocol): void {
    this.protocols.set(type, implementation);
  }

  /**
   * Create a protocol instance
   * @param type - Protocol type to create
   * @returns Protocol instance
   * @throws Error if protocol type is not supported
   */
  static create(type: ProtocolType): DeviceProtocol {
    const ProtocolClass = this.protocols.get(type);

    if (!ProtocolClass) {
      throw new Error(
        `Unsupported protocol type: ${type}. Supported types: ${Array.from(
          this.protocols.keys()
        ).join(", ")}`
      );
    }

    return new ProtocolClass();
  }

  /**
   * Check if a protocol type is supported
   */
  static isSupported(type: string): type is ProtocolType {
    return this.protocols.has(type as ProtocolType);
  }

  /**
   * Get list of supported protocol types
   */
  static getSupportedProtocols(): ProtocolType[] {
    return Array.from(this.protocols.keys());
  }
}

// Register SSH protocol by default
ProtocolFactory.register("ssh", SSHProtocol);

// Future protocol registrations will be added here:
// ProtocolFactory.register("http", HTTPProtocol);
// ProtocolFactory.register("websocket", WebSocketProtocol);
