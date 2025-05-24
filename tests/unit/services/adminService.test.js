import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllOrders } from "../../../services/adminService.js";

// Mock the database
vi.mock("../../../db.js");

import db from "../../../db.js";

describe("Admin Service - getAllOrders()", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
  
    const mockOrders = [
      {
        order_id: 1,
        order_status: "pending",
        order_date: new Date(),
        order_total: "99.99",
        user_id: 1,
        first_name: "Johnny",
        last_name: "Cash",
        city: "Bucuresti",
        county: "Ilfov",
        phone_number: "+40771822766"
      },
      {
        order_id: 2,
        order_status: "pending",
        order_date: new Date(),
        order_total: "49.99",
        user_id: 2,
        first_name: "Mick",
        last_name: "Jagger",
        city: "Cluj-Napoca",
        county: "Cluj",
        phone_number: "+40662933877"
      }
    ];

    const mockCountResult = { rows: [{ count: "2" }] };
  
    it("should return all orders without search term", async () => {
      db.query
        .mockResolvedValueOnce({ rows: mockOrders }) // First call for orders
        .mockResolvedValueOnce(mockCountResult);     // Second call for count

      const result = await getAllOrders();
      
      expect(result).toEqual({
        orders: mockOrders,
        total: 2
      });
      expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY o\.created_at DESC/);

    });
  
    it("should return filtered orders with search term", async () => {
        const searchTerm = "123";
        db.query
          .mockResolvedValueOnce({ rows: [mockOrders[0]] }) // Filtered orders
          .mockResolvedValueOnce({ rows: [{ count: "1" }] }); // Count for filtered
    
        const result = await getAllOrders(searchTerm);
        
        expect(result).toEqual({
          orders: [mockOrders[0]],
          total: 1
        });

        // Check the first query (orders query)
        expect(db.query.mock.calls[0][0]).toMatch(/WHERE o\.id::TEXT LIKE \$1/);
        expect(db.query.mock.calls[0][1]).toEqual([
          `%${searchTerm}%`,
          10,  // default limit
          0    // default offset
        ]);

        // Check the second query (count query)
        expect(db.query.mock.calls[1][0]).toBe("SELECT COUNT(*) FROM orders WHERE id::TEXT LIKE $1");
        expect(db.query.mock.calls[1][1]).toEqual([`%${searchTerm}%`]);
    });
  
    it("should return empty array when no orders match search", async () => {
        const searchTerm = "999";
        db.query
          .mockResolvedValueOnce({ rows: [] }) // No orders
          .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // No count
    
        const result = await getAllOrders(searchTerm);
        
        expect(result).toEqual({
          orders: [],
          total: 0
        });
    });
  
    it("should handle database errors", async () => {
        const errorMessage = "Database connection failed";
        db.query.mockRejectedValue(new Error(errorMessage));
    
        await expect(getAllOrders()).rejects.toThrow(errorMessage);
    });
  
  });