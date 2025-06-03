import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateQuantity,
  getCartData,
  updateCartItem,
  updateCartQuantity,
} from "../../../services/cartService.js";

vi.mock("../../../db.js");

import db from "../../../db.js";

describe("Cart Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateQuantity()", () => {
    it("should accept valid quantities (up to 10)", () => {
      expect(() => validateQuantity(1)).not.toThrow();
      expect(() => validateQuantity(10)).not.toThrow();
    });

    it("should reject non-number quantities", () => {
      expect(() => validateQuantity("cat")).toThrow(
        "Quantity must be a number.",
      );
      expect(() => validateQuantity("null")).toThrow(
        "Quantity must be a number.",
      );
    });

    it("Should reject zero and negative numbers", () => {
      expect(() => validateQuantity(0)).toThrow(
        "Quantity must be greater than zero",
      );
      expect(() => validateQuantity(-5)).toThrow(
        "Quantity must be greater than zero",
      );
    });
  });

  describe("getCartData()", () => {
    beforeEach(() => {
      // Mock client with transaction support
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(mockClient);
    });

    it("should return cart items and total", async () => {
      const mockUserId = 1;
      const mockCartItems = [
        {
          id: 1,
          name: "Product 1",
          price: 100,
          stock: 5,
          thumbnail: "images/test1",
          is_active: true,
          quantity: 2,
          total_price: "200.00",
        },
        {
          id: 2,
          name: "Product 2",
          price: 50,
          stock: 5,
          thumbnail: "images/test2",
          is_active: true,
          quantity: 3,
          total_price: "150.00",
        },
      ];

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: mockCartItems }) // Main query
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(mockClient);

      const result = await getCartData(mockUserId);

      expect(result).toEqual({
        items: mockCartItems,
        total: "350.00",
        message: "",
      });

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM carts"),
        [mockUserId],
      );
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });

    it("should throw error on database failure", async () => {
      // Suppress console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      //  Mock client that will fail the cart items query
      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // 'BEGIN' succeeds
          .mockRejectedValueOnce(new Error("DB connection failed")), // Main query fails
        release: vi.fn(),
      };

      // Mock db.connect to return mock client
      db.connect.mockResolvedValue(mockClient);

      await expect(getCartData(1)).rejects.toThrow("DB connection failed");
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle removed and adjusted items", async () => {
      const mockUserId = 1;
      const mockCartItems = [
        {
          id: 1,
          name: "Product 1",
          price: 100,
          stock: 0, // To be removed
          thumbnail: "images/test1",
          is_active: true,
          quantity: 2,
          total_price: "200.00",
        },
        {
          id: 2,
          name: "Product 2",
          price: 50,
          stock: 2, // To be adjusted (quantity was 3)
          thumbnail: "images/test2",
          is_active: true,
          quantity: 3,
          total_price: "150.00",
        },
        {
          id: 3,
          name: "Product 3",
          price: 75,
          stock: 5,
          thumbnail: "images/test3",
          is_active: false, // To be deactivated
          quantity: 1,
          total_price: "75.00",
        },
      ];

      const mockClient = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: mockCartItems }) // Main query
          // DELETE calls for items 1 and 3
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({})
          // UPDATE call for item 2
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}), // COMMIT,
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(mockClient);

      const result = await getCartData(mockUserId);

      expect(result).toEqual({
        items: [
          {
            ...mockCartItems[1],
            quantity: 2, // Adjusted to stock
          },
        ],
        total: "100.00",
        message:
          "1 item removed because they were discontinued. and 1 item removed because they are out of stock. and 1 item quantity adjusted because of limited stock.",
      });
    });
  });

  describe("updateCartItem()", () => {
    const mockUserId = 1;
    const mockProductId = 1;
    const mockQuantity = 2;

    beforeEach(() => {
      // Reset mocks for each test
      db.connect.mockResolvedValue({
        query: vi.fn(),
        release: vi.fn(),
      });
    });

    it("should add new item to cart when not present", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ stock: 10 }] }) // Stock check
          .mockResolvedValueOnce({ rows: [] }) // Cart check (empty)
          .mockResolvedValueOnce({}) // INSERT
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      const result = await updateCartItem(
        mockUserId,
        mockProductId,
        mockQuantity,
      );
      expect(result).toEqual({ message: "Product added to cart" });
      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(client.query).toHaveBeenCalledWith(
        "SELECT stock FROM products WHERE id = $1 FOR UPDATE",
        [mockProductId],
      );
      expect(client.query).toHaveBeenCalledWith("COMMIT");
    });

    it("should update quantity when item exists in cart", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ stock: 10 }] }) // Stock check
          .mockResolvedValueOnce({ rows: [{ quantity: 1 }] }) // Cart check (exists)
          .mockResolvedValueOnce({}) // UPDATE
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      const result = await updateCartItem(
        mockUserId,
        mockProductId,
        mockQuantity,
      );

      expect(result).toEqual({ message: "Product added to cart" });
      expect(client.query).toHaveBeenCalledWith(
        "UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
        [3, mockUserId, mockProductId], // 1 existing + 2 new
      );
    });

    it("should throw error when not enough stock", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ stock: 2 }] }) // Only 2 in stock
          .mockResolvedValueOnce({ rows: [{ quantity: 1 }] }), // Already has 1
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      await expect(updateCartItem(mockUserId, mockProductId, 2)) // Would make total 3
        .rejects.toThrow("Not enough products in stock");
    });

    it("should rollback on error", async () => {
      const client = {
        query: vi.fn().mockRejectedValueOnce(new Error("DB error")),
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      await expect(
        updateCartItem(mockUserId, mockProductId, mockQuantity),
      ).rejects.toThrow("DB error");
      expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  describe("updateCartQuantity()", () => {
    const mockUserId = 1;
    const mockProductId = 101;
    const mockNewQuantity = 3;

    it("should update quantity when valid", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ stock: 5 }] }) // Cart item with stock
          .mockResolvedValueOnce({}) // UPDATE
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      await updateCartQuantity(mockUserId, mockProductId, mockNewQuantity);

      expect(client.query).toHaveBeenCalledWith(
        "UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
        [mockNewQuantity, mockUserId, mockProductId],
      );
      expect(client.query).toHaveBeenCalledWith("COMMIT");
    });

    it("should reject zero or negative quantities", async () => {
      await expect(
        updateCartQuantity(mockUserId, mockProductId, 0),
      ).rejects.toThrow("Quantity must be greater than zero.");

      await expect(
        updateCartQuantity(mockUserId, mockProductId, -1),
      ).rejects.toThrow("Quantity must be greater than zero.");
    });

    it("should throw error when product not in cart", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [] }), // Empty cart
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      await expect(
        updateCartQuantity(mockUserId, mockProductId, mockNewQuantity),
      ).rejects.toThrow("Product not found in cart.");
    });

    it("should throw error when insufficient stock", async () => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ stock: 2 }] }), // Only 2 in stock
        release: vi.fn(),
      };
      db.connect.mockResolvedValue(client);

      await expect(
        updateCartQuantity(mockUserId, mockProductId, 3),
      ).rejects.toThrow("Only  2 units available in stock.");
    });
  });
});
