import request from "supertest";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import {
  getCartData,
  updateCartItem,
  updateCartQuantity,
} from "../../services/cartService.js";
import { getActiveUserAddresses } from "../../services/addressService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/cartService.js");
vi.mock("../../services/addressService.js");

beforeAll(() => {
  // Add a temporary route to inspect the session
  app.get("/inspect-session", (req, res) => {
    res.json({ cart: req.session.cart });
  });
});

describe("Cart routes", () => {
  // Mock authentication
  vi.mock("../../middleware/middleware.js", () => ({
    authenticate: (req, res, next) => {
      console.log("Mocked authenticate middleware called");
      req.user = {
        id: 1,
        first_name: "Johnny",
        last_name: "Test",
        email: "test@example.com",
        role: "user",
      };
      req.isAuthenticated = () => true;
      next();
    },
    isAdmin: (req, res, next) => next(),
    redirectIfAuthenticated: (req, res, next) => next(),
  }));

  const mockCartItems = [
    {
      id: 1,
      name: "Product A",
      price: "10.99",
      stock: 10,
      thumbnail: "product-a.jpg",
      quantity: 2,
      total_price: 21.98,
    },
  ];

  const mockCartTotal = 21.98;

  const mockAddresses = [
    {
      id: 1,
      user_id: 1,
      first_name: "Johnny",
      last_name: "Test",
      street: "Str Lunga 23A",
      city: "Oradea",
      country: "Romania",
      postal_code: "12345",
      phone_number: "+40771711988",
      is_shipping: true,
      is_billing: true,
    },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Mock the behavior of an authenticated user
    app.request.isAuthenticated = () => true;
    app.request.user = {
      id: 1,
      first_name: "Johnny",
      last_name: "Test",
      email: "test@example.com",
      role: "user",
    };
    getActiveUserAddresses.mockResolvedValue(mockAddresses);
  });

  describe("GET /cart", () => {
    it("should render cart page with products from database", async () => {
      // Mock db response for authenticated users
      getCartData.mockResolvedValue({
        items: mockCartItems,
        total: mockCartTotal,
      });

      const res = await request(app)
        .get("/cart")
        .expect(200)
        .expect("Content-Type", /html/);

      expect(res.text).toContain("Product A");
      expect(res.text).toContain("21.98");
      expect(getCartData).toHaveBeenCalledWith(1); // Ensure user ID is passed
    });
  });

  describe("POST /:id ", () => {
    it("should add a product to the database cart", async () => {
      updateCartItem.mockResolvedValue({ message: "Product added to cart" });

      await request(app).post("/cart/1").send({ quantity: 2 }).expect(302);

      // Ensure user ID, product ID, and quantity are passed to service function
      expect(updateCartItem).toHaveBeenCalledWith(1, "1", 2);
    });
  });

  describe("PATCH / ", () => {
    it("should update the quantity of a product in the database cart", async () => {
      updateCartQuantity.mockResolvedValue();

      await request(app)
        .patch("/cart")
        .send({ productId: "1", quantity: 3 })
        .expect(302);

      expect(updateCartQuantity).toHaveBeenCalledWith(1, "1", 3);
    });
  });

  describe("DELETE /delete/:id ", () => {
    it("should remove a product from the database cart", async () => {
      db.query.mockResolvedValueOnce({ rows: [{ product_id: "1" }] });

      await request(app).delete("/cart/delete/1").expect(302);

      expect(db.query).toHaveBeenCalledWith(
        `DELETE FROM carts WHERE user_id = $1 AND product_id = $2`,
        [1, "1"]
      );
    });
  });

  describe("DELETE /delete ", () => {
    it("should clear the database cart", async () => {
      // Mock the SELECT query to return cart items
      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, product_id: 101, quantity: 2 }],
        })
        // Mock the DELETE query to simulate clearing the cart
        .mockResolvedValueOnce({ rowCount: 1 });

      await request(app).delete("/cart/delete").expect(302);

      expect(db.query).toHaveBeenCalledWith(
        `DELETE FROM carts WHERE user_id = $1`,
        [1]
      );
    });
  });
});
