import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../../../schemas/authSchemas";

describe("loginSchema", () => {
  it("should validate a valid login input", () => {
    const input = {
      email: "test@example.com",
      password: "Password123",
    };

    const { error } = loginSchema.validate(input, { abortEarly: false });
    expect(error).toBeUndefined(); // No validation errors
  });

  it("should fail if email is missing", () => {
    const input = {
      password: "Password123",
    };

    const { error } = loginSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("Email is required");
  });

  it("should fail if password is missing", () => {
    const input = {
      email: "test@example.com",
    };

    const { error } = loginSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("Password is required");
  });

  it("should fail if email is invalid", () => {
    const input = {
      email: "invalid-email",
      password: "Password123",
    };

    const { error } = loginSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("Invalid email format");
  });
});

describe("registerSchema", () => {
  it("should validate a valid registration input", () => {
    const input = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "Password123",
      cpassword: "Password123",
    };

    const { error } = registerSchema.validate(input, { abortEarly: false });
    expect(error).toBeUndefined();
  });

  it("should fail validation for a password without an uppercase letter", () => {
    const input = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      cpassword: "password123",
    };

    const { error } = registerSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain(
      "Password must contain at least 1 uppercase letter and 1 number"
    );
  });

  it("should fail validation for mismatched passwords", () => {
    const input = {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "Password123",
      cpassword: "DifferentPassword",
    };

    const { error } = registerSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("Passwords do not match");
  });
});
