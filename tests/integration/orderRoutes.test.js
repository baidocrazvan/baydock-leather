import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import {
  calculateTotalPrice,
  createOrder,
  addOrderItems,
  clearCart,
  updateProductStock,
  getOrderDetails
} from "../../services/orderService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/orderService.js");

vi.mock("../../middleware/middleware.js", () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 1,
      first_name: "Johnny",
      last_name: "Test",
      email: "test@example.com",
      role: "admin"
    };
    req.isAuthenticated = () => true;
    next();
  },
  isAdmin: (req, res, next) => next()
}));

describe("Order Routes with authentication", () => {

    const mockOrder = {
      id: 1,
      user_id: 1,
      total_price: 333.33,
      status: "pending",
      created_at: new Date(),
      shipping_address_id: 1,
      billing_address_id: 1,
      payment_method: "cash" 
    };

    const order = {
      id: 5,
      status: "pending",
      total: 99.99,
      payment: "cash",
      date: "19/04/2025",
      shippingAddress: {
        name: "Johnny Cash",
        street: "Strada Lunga 23A",
        city: "Oradea, Romania",
        country: "Romania",
        postalCode: "410495",
        phoneNumber: "+40771711988"
      },
      billingAddress: {
        name: "Johnny Cash",
        street: "Strada Lunga 23A",
        city: "Oradea, Romania",
        country: "Romania",
        postalCode: "410495",
        phone: "+40771711988"
      },
      products: [
        {
          productId: 1,
          name: "Product A",
          thumbnail: "product-a.jpg",
          quantity: 2,
          price: 10,
          subtotal: "20.00"
        }
      ]
    }

    const mockOrderHistory = [
      {
        order_id: 1,
        order_status: "pending",
        order_date: new Date(),
        order_total: 59.45,
        first_name: "Johnny",
        last_name: "Cash"
      }
    ];


    describe("GET /history", () => {

        it("should render order history for authenticated user", async () => {
            // Mock db response
            db.query.mockResolvedValue({ rows: mockOrderHistory });
        
            const res = await request(app)
                .get("/orders/history")
                .expect(200)
                .expect("Content-Type", /html/);
        
            expect(res.text).toContain("My orders");
            expect(res.text).toContain("Johnny");
        });

        it("should handle empty order history", async () => {
            db.query.mockResolvedValue({ rows: [] });
      
            const res = await request(app)
              .get("/orders/history")
              .expect(200)
              .expect("Content-type", /html/);
      
            expect(res.text).toContain("Sorry, there is no order history to display.");
        });  
    });

    describe("GET /:id", () => {
        it("should render order details for valid order", async () => {
          
          getOrderDetails.mockResolvedValue(order);
          
          const res = await request(app)
            .get("/orders/1")
            .expect(200);
    
          expect(res.text).toContain("Order number");
          expect(getOrderDetails).toHaveBeenCalledWith("1", mockOrder.user_id);
        });
    
        it("should reject unauthorized access to orders", async () => {
          getOrderDetails.mockRejectedValue(new Error("Unauthorized"));
    
          const res = await request(app)
            .get("/orders/999")
            .expect(302)
            .expect("Location", "/orders");
    
          expect(res.headers.location).toBe("/orders");
        });
    });


    describe("POST /new-order", () => {
      let mockClient;

      beforeEach(() => {
          // Mock the database client
          mockClient = {
            query: vi.fn(),
            release: vi.fn(),
          };

          // Mock db.connect to return the mock client
          db.connect.mockResolvedValue(mockClient);

          // Mock service functions
          calculateTotalPrice.mockResolvedValue(100.0);
          createOrder.mockResolvedValue(1); // Mock order ID
          addOrderItems.mockResolvedValue();
          updateProductStock.mockResolvedValue();
          clearCart.mockResolvedValue();
      });
      
      it("should successfully create a new order and redirect to the order page", async () => {
          // Mock database responses
          mockClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ is_shipping: true }] }) // Shipping address
          .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 2 }] }) // Cart items
          .mockResolvedValueOnce({ rows: [] }) // Stock check
          .mockResolvedValueOnce({ rows: [] }); // COMMIT
    
          const res = await request(app)
          .post("/orders/new-order")
          .send({
            shippingAddressId: 1,
            billingAddressId: 1,
            paymentMethod: "cash",
          })
          .expect(302) 
          .expect("Location", "/orders/1"); // Success redirect to the order page
    
          expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
          expect(mockClient.query).toHaveBeenNthCalledWith(
            2,
            "SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2",
            [1, 1]
          );
          expect(mockClient.query).toHaveBeenNthCalledWith(
            3,
            "SELECT * FROM carts WHERE user_id = $1",
            [1]
          );
          expect(mockClient.query).toHaveBeenNthCalledWith(
            4,
            `SELECT p.name FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1 AND c.quantity > p.stock`,
            [1]
          );
          expect(mockClient.query).toHaveBeenNthCalledWith(5, "COMMIT");
    
          // Verify service function calls
          expect(calculateTotalPrice).toHaveBeenCalledWith(1);
          expect(createOrder).toHaveBeenCalledWith(1, 100.0, 1, 1, "cash");
          expect(addOrderItems).toHaveBeenCalledWith(1, 1);
          expect(updateProductStock).toHaveBeenCalledWith(1);
          expect(clearCart).toHaveBeenCalledWith(1);
      });
    });
});