/**
 * Tests for input validation and path traversal prevention
 */

describe("Vendor Name Validation", () => {
  const validVendorPattern = /^[a-z0-9-]+$/;

  test("should accept valid vendor names", () => {
    const validNames = ["hp-aruba-procurve", "cisco-ios-xe", "juniper-junos", "arista-eos"];

    validNames.forEach((name) => {
      expect(validVendorPattern.test(name)).toBe(true);
    });
  });

  test("should reject vendor names with path traversal attempts", () => {
    const invalidNames = ["../../etc/passwd", "../config", "./hidden", "/absolute/path"];

    invalidNames.forEach((name) => {
      expect(validVendorPattern.test(name)).toBe(false);
    });
  });

  test("should reject vendor names with special characters", () => {
    const invalidNames = ["vendor$name", "vendor name", "vendor;name", "vendor|name"];

    invalidNames.forEach((name) => {
      expect(validVendorPattern.test(name)).toBe(false);
    });
  });

  test("should reject uppercase vendor names", () => {
    const invalidNames = ["HP-Aruba", "CISCO", "Juniper"];

    invalidNames.forEach((name) => {
      expect(validVendorPattern.test(name)).toBe(false);
    });
  });
});

describe("Role Name Validation", () => {
  const validRolePattern = /^[a-z0-9-]+$/;

  test("should accept valid role names", () => {
    const validRoles = ["access", "distribution", "core", "security-hardening"];

    validRoles.forEach((role) => {
      expect(validRolePattern.test(role)).toBe(true);
    });
  });

  test("should reject role names with path traversal attempts", () => {
    const invalidRoles = ["../../../etc", "./local", "/etc/shadow"];

    invalidRoles.forEach((role) => {
      expect(validRolePattern.test(role)).toBe(false);
    });
  });
});

describe("YAML Safety", () => {
  test("FAILSAFE_SCHEMA should prevent code execution", () => {
    const yaml = require("js-yaml");
    const maliciousYaml = `
!!js/function >
  function() { return 'malicious'; }()
`;

    // FAILSAFE_SCHEMA should throw on dangerous YAML
    expect(() => {
      yaml.load(maliciousYaml, { schema: yaml.FAILSAFE_SCHEMA });
    }).toThrow();
  });

  test("FAILSAFE_SCHEMA should safely parse valid YAML", () => {
    const yaml = require("js-yaml");
    const safeYaml = `
vendor: hp-aruba-procurve
bundles:
  health_check:
    description: "Test bundle"
    commands:
      - show version
`;

    const parsed = yaml.load(safeYaml, { schema: yaml.FAILSAFE_SCHEMA });
    expect(parsed.vendor).toBe("hp-aruba-procurve");
    expect(parsed.bundles.health_check.commands).toContain("show version");
  });
});
