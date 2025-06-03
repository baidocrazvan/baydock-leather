import { describe, it, expect } from "vitest";
import { addressSchema } from "../../../schemas/addressSchema.js";

describe("addressSchema", () => {
  it("should validate a valid address input", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
      is_billing: true,
      is_shipping: true,
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeUndefined(); // No validation errors
  });

  it("should fail if firstName is missing", () => {
    const input = {
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("First name is required");
  });

  it("should fail if lastName is missing", () => {
    const input = {
      firstName: "Johnny",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("Last name is required");
  });

  it("should fail if address is missing", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("Address is required");
  });

  it("should fail if city is missing", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("City is required");
  });

  it("should fail if county is missing", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe("County is required");
  });

  it("should fail if phoneNumber is invalid", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "1234567890", // Invalid phone number
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe(
      "Phone number must start with +40 and be a valid mobile number",
    );
  });

  it("should fail if postalCode is invalid", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "12345", // Invalid postal code
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe(
      "Must be a valid 6-character post code",
    );
  });

  it("should allow optional fields (is_billing and is_shipping)", () => {
    const input = {
      firstName: "Johnny",
      lastName: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Ilfov",
      phoneNumber: "+40771711988",
      postalCode: "123456",
    };

    const { error } = addressSchema.validate(input, { abortEarly: false });
    expect(error).toBeUndefined(); // No validation errors
  });
});
