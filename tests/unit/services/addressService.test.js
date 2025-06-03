import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActiveUserAddresses,
  getAllUserAddresses,
  getUserAddress,
} from "../../../services/addressService.js";

// Mock the database
vi.mock("../../../db.js");

import db from "../../../db.js";

describe("Address Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = 1;
  const mockAddressId = 10;
  const mockAddresses = [
    {
      id: 10,
      user_id: 1,
      first_name: "Razvan",
      last_name: "Baidoc",
      address: "Str Lugojului 9",
      city: "Oradea",
      is_active: true,
    },
    {
      id: 11,
      user_id: 1,
      first_name: "Johnny",
      last_name: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      is_active: false,
    },
  ];

  describe("getActiveUserAddresses()", () => {
    it("should return only active addresses for user", async () => {
      db.query.mockResolvedValue({
        rows: mockAddresses.filter((address) => address.is_active),
      });

      const result = await getActiveUserAddresses(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(10);
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM shipping_addresses WHERE user_id = $1 AND is_active = TRUE",
        [mockUserId],
      );
    });

    it("should return empty array when no active addresses", async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await getActiveUserAddresses(mockUserId);

      expect(result).toEqual([]);
    });

    it("should propagate database errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errorMessage = "Database connection failed";
      db.query.mockRejectedValue(new Error(errorMessage));

      await expect(getActiveUserAddresses(mockUserId)).rejects.toThrow(
        errorMessage,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getAllUserAddresses()", () => {
    it("should return all addresses for user regardless of status", async () => {
      db.query.mockResolvedValue({ rows: mockAddresses });

      const result = await getAllUserAddresses(mockUserId);

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM shipping_addresses WHERE user_id = $1",
        [mockUserId],
      );
    });

    it("should return empty array when user has no addresses", async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await getAllUserAddresses(mockUserId);

      expect(result).toEqual([]);
    });

    it("should propagate database errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errorMessage = "Database connection failed";
      db.query.mockRejectedValue(new Error(errorMessage));

      await expect(getAllUserAddresses(mockUserId)).rejects.toThrow(
        errorMessage,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getUserAddress()", () => {
    it("should return specific active address for user", async () => {
      db.query.mockResolvedValue({
        rows: [mockAddresses.find((addr) => addr.id === mockAddressId)],
      });

      const result = await getUserAddress(mockUserId, mockAddressId);

      expect(result.id).toBe(mockAddressId);
      expect(db.query).toHaveBeenCalledWith(
        "SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE",
        [mockAddressId, mockUserId],
      );
    });

    it("should throw ADDRESS_NOT_FOUND when address doesn't exist", async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(getUserAddress(mockUserId, 999)).rejects.toThrow(
        "ADDRESS_NOT_FOUND",
      );
    });

    it("should throw ADDRESS_NOT_FOUND when address is inactive", async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(getUserAddress(mockUserId, 11)) // Inactive address
        .rejects.toThrow("ADDRESS_NOT_FOUND");
    });

    it("should propagate database errors", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errorMessage = "Database connection failed";
      db.query.mockRejectedValue(new Error(errorMessage));

      await expect(getUserAddress(mockUserId, mockAddressId)).rejects.toThrow(
        errorMessage,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
