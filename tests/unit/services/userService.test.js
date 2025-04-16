import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllUserAddresses } from "../../../services/addressService.js";
import { getAllUsers, getUserDetails } from "../../../services/userService.js";

// Mock the dependencies
vi.mock("../../../db.js");
vi.mock("../../../services/addressService.js");

// Import the mocked db
import db from "../../../db.js";


describe("User Service", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
  
    describe("getAllUsers()", () => {
      it("should return all users without sensitive data", async () => {
        // Mock database response
        db.query.mockResolvedValue({
          rows: [
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              created_at: new Date(),
              role: "user"
            }
          ]
        });
         
        const users = await getAllUsers();
  
        expect(users).toEqual([
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            created_at: expect.any(Date),
            role: "user"
          }
        ]);
    });
       
    it("should handle empty user list", async () => {
        db.query.mockResolvedValue({ rows: [] });
        const users = await getAllUsers();
        expect(users).toEqual([]);
      });
    });
  
    describe("getUserDetails()", () => {
      it("should return complete user details", async () => {
        const mockUserId = 1;
  
        // Mock database responses
        db.query
          .mockResolvedValueOnce({ // User query
            rows: [{
              id: 1,
              first_name: "Razvan",
              last_name: "Baidoc",
              email: "baidocrazvan@yahoo.com"
            }]
          })
          .mockResolvedValueOnce({ // Orders query
            rows: [{
              id: 101,
              status: "completed",
              total_price: 99.99
            }]
          });
  
        // Mock address service
        getAllUserAddresses.mockResolvedValue([
          { id: 1, city: "Oradea" }
        ]);
  
        const result = await getUserDetails(mockUserId);
  
        expect(result).toEqual({
          user: {
            id: 1,
            first_name: "Razvan",
            last_name: "Baidoc",
            email: "baidocrazvan@yahoo.com"
          },
          addresses: [
            { id: 1, city: "Oradea" }
          ],
          orders: [
            { id: 101, status: "completed", total_price: 99.99 }
          ]
        });
  
        expect(getAllUserAddresses).toHaveBeenCalledWith(mockUserId);
      });
  
      it("should handle user not found", async () => {
        db.query.mockResolvedValue({ rows: [] });
  
        await expect(getUserDetails(999))
            .rejects.toThrow("User 999 not found");
      });
    });
});