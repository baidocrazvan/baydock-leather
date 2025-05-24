import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import { getActiveUserAddresses } from "../../services/addressService.js";
import { getRecentUserOrders } from "../../services/orderService.js";

// Mock dependencies
vi.mock("../../services/addressService.js");
vi.mock("../../services/orderService.js");
vi.mock('../../middleware/middleware.js', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 1,
      first_name: "Johnny",
      last_name: "Test",
      email: "test@example.com",
      role: "admin",
      created_at: new Date()
    };
    req.isAuthenticated = () => true;
    next();
  },
  isAdmin: (req, res, next) => next(),
  redirectIfAuthenticated: (req, res, next) => next(),
}));

describe("User Routes", () => {
  const mockUser = {
    id: 1,
    first_name: "Johnny",
    last_name: "Test",
    email: "test@example.com",
    role: "user",
    created_at: new Date()
  };

  const mockAddresses = [
    {
      id: 1,
      user_id: 1,
      first_name: "Johnny",
      last_name: "Cash",
      address: "Str Lunga 23A",
      city: "Bucuresti",
      county: "Bucuresti",
      country: "Romania",
      postal_code: "12345",
      phone_number: "+40712345678",
      is_shipping: true,
      is_billing: true,
      is_active: true,
    },
  ];

  const mockOrders = [
    {
      id: 1,
      user_id: 1,
      total_price: 99.99,
      status: "completed",
      created_at: new Date(),
      shipping_address_id: 1,
      billing_address_id: 1,
      payment_method: "card"
    },
    {
      id: 2,
      user_id: 1,
      total_price: 49.99,
      status: "pending",
      created_at: new Date(Date.now() - 86400000),
      shipping_address_id: 1,
      billing_address_id: 1,
      payment_method: "cash"
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });


  describe("GET /account", () => {
    it("should render the account page with user data, addresses, and orders for authenticated users", async () => {
      // Mock the address service to return addresses
      getActiveUserAddresses.mockResolvedValue(mockAddresses);
      getRecentUserOrders.mockResolvedValue(mockOrders);

      const res = await request(app)
        .get("/user/account")
        .expect(200)
        .expect("Content-Type", /html/); 

      // Verify user details
      expect(res.text).toContain("Welcome back, Johnny"); // Check for user name in the HTML
      expect(res.text).toContain("Test");

      // Verify addresses
      expect(res.text).toContain("Str Lunga 23A");
      expect(res.text).toContain("Bucuresti");

      // Verify orders
      expect(res.text).toContain("Recent Orders");
      expect(res.text).toContain("€99.99");
      expect(res.text).toContain("€49.99");
      expect(res.text).toContain("completed");
      expect(res.text).toContain("pending");
      expect(res.text).toContain("View All Orders");
    });

    it("should show no orders message when no orders exist", async () => {
      getActiveUserAddresses.mockResolvedValue(mockAddresses);
      getRecentUserOrders.mockResolvedValue([]);

      const res = await request(app)
        .get("/user/account")
        .expect(200);

      expect(res.text).toContain("You haven't placed any orders yet");
      expect(res.text).toContain("Start Shopping");
      expect(res.text).not.toContain("View All Orders");
    });

    it("should handle errors from both address and order services", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      getActiveUserAddresses.mockRejectedValue(new Error("Address error"));
      getRecentUserOrders.mockRejectedValue(new Error("Order error"));

      const res = await request(app)
        .get("/user/account")
        .expect(200);

      expect(res.text).toContain("No shipping address saved");
      expect(res.text).toContain("You haven't placed any orders yet");
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /addresses', () => {
    it("should render the addresses page with user addresses for authenticated users", async () => {

      // Mock the address service to return addresses
      getActiveUserAddresses.mockResolvedValue(mockAddresses);

      const res = await request(app)
        .get("/user/addresses")
        .expect(200)
        .expect("Content-Type", /html/); // Expect HTML content

      // Verify that the response contains addresses
      expect(res.text).toContain("Str Lunga 23A");
      expect(res.text).toContain("Your Addresses");
    });

    it("should handle errors from the address service ", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock the address service to throw an error
      getActiveUserAddresses.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .get("/user/addresses")
        .expect(200)
        .expect("Content-Type", /html/);

        // No address details should be displayed
        expect(res.text).not.toContain("Str Lunga 23A");
        
        expect(res.text).toContain("You haven't added any addresses yet.")

        consoleErrorSpy.mockRestore();
    });
  });

  describe("Order Display", () => {
    it("should handle bad order data gracefully", async () => {
      getActiveUserAddresses.mockResolvedValue(mockAddresses);
      getRecentUserOrders.mockResolvedValue([
        { id: 1, invalid_field: "test" } 
      ]);

      const res = await request(app)
        .get("/user/account")
        .expect(200);

      // Should still render without crashing
      expect(res.text).toContain("Recent Orders");
    });
  });
});