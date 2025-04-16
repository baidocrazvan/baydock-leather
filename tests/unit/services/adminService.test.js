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
  
    it("should return all orders without search term", async () => {
        db.query.mockResolvedValue({ rows: mockOrders });
    
        const result = await getAllOrders();
        
        expect(result).toEqual(mockOrders);
        expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY o\.created_at DESC$/);
    });
  
    it("should return filtered orders with search term", async () => {
        const searchTerm = "123";
        db.query.mockResolvedValue({ rows: [mockOrders[0]] });
    
        const result = await getAllOrders(searchTerm);
        
        expect(result).toEqual([mockOrders[0]]);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("WHERE o.id::TEXT LIKE $1"),
            [`%${searchTerm}%`]
        );
        expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY o\.created_at DESC$/);
    });
  
    it("should return empty array when no orders match search", async () => {
        const searchTerm = "999";
        db.query.mockResolvedValue({ rows: [] });
    
        const result = await getAllOrders(searchTerm);
        
        expect(result).toEqual([]);
    });
  
    it("should handle database errors", async () => {
        const errorMessage = "Database connection failed";
        db.query.mockRejectedValue(new Error(errorMessage));
    
        await expect(getAllOrders()).rejects.toThrow(errorMessage);
    });
  
  });