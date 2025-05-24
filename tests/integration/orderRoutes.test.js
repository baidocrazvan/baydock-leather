import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import {
  calculateOrderPrice,
  createOrder,
  addOrderItems,
  clearCart,
  updateProductStock,
  getOrderDetails,
  getUserOrders
} from "../../services/orderService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/orderService.js", () => ({
  calculateOrderPrice: vi.fn(),
  createOrder: vi.fn(),
  addOrderItems: vi.fn(),
  clearCart: vi.fn(),
  updateProductStock: vi.fn(),
  getOrderDetails: vi.fn(),
  getUserOrders: vi.fn().mockResolvedValue({
    orders: [], 
    total: 0
  })
}));

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
  isAdmin: (req, res, next) => next(),
  redirectIfAuthenticated: (req, res, next) => next(),
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
      subtotal: 99.99,
      total: 99.99,
      shippingCost: 0,
      payment: "cash",
      date: "19/04/2025",
      shippingMethod: {
        id: 1,
        name: "Cargus",
        price: 0,
        description: "Courier delivery",
        deliveryDays: {
          min: 1,
          max: 3
        }
      },
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
        phoneNumber: "+40771711988"
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
    
    describe("GET /history", () => {

        it("should render order history for authenticated user", async () => {
            // Mock db response
            getUserOrders.mockResolvedValue({
              orders: [{
                order_id: 1,
                order_status: "pending",
                order_date: new Date(),
                order_total: 59.45,
                first_name: "Johnny",
                last_name: "Cash",
                city: "Oradea",
                county: "Bihor"
              }],
              total: 1
            });
        
            const res = await request(app)
                .get("/orders/history")
                .expect(200)
                .expect("Content-Type", /html/);
        
            expect(res.text).toContain("My Orders");
            expect(res.text).toContain("Johnny");
        });

        it("should handle empty order history", async () => {
            getUserOrders.mockResolvedValue({ orders: [], total: 0 });
      
            const res = await request(app)
              .get("/orders/history")
              .expect(200)
              .expect("Content-type", /html/);
      
            expect(res.text).toContain("No orders found.");
        });  
    });

    describe("GET /:id", () => {
        it("should render order details for valid order", async () => {
          
          getOrderDetails.mockResolvedValue(order);
          
          const res = await request(app)
            .get("/orders/5")
            .expect(200);
    
          expect(res.text).toContain("Order #5");
          expect(getOrderDetails).toHaveBeenCalledWith("5", mockOrder.user_id);
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

          // Mock all the required database responses
          mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Shipping method
            .mockResolvedValueOnce({ rows: [{ id: 1, is_shipping: true }] }) // Shipping address
            .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 2 }] }) // Cart items
            .mockResolvedValueOnce({ rows: [] }) // Stock check
            .mockResolvedValueOnce({ rows: [] }) // COMMIT
            

          // Mock service functions
          calculateOrderPrice.mockResolvedValue(100.0);
          createOrder.mockResolvedValue(1); // Mock order ID
          addOrderItems.mockResolvedValue();
          updateProductStock.mockResolvedValue();
          clearCart.mockResolvedValue();
      });
      
      it("should successfully create a new order and redirect to the order page", async () => {
          const res = await request(app)
          .post("/orders/new-order")
          .send({
            shippingAddressId: 1,
            billingAddressId: 1,
            paymentMethod: "cash",
            shippingMethodId: 1
          })
          .expect(302) 
          .expect("Location", "/orders/1"); // Success redirect to the order page
    
          expect(mockClient.query).toHaveBeenNthCalledWith(1, "BEGIN");
          expect(mockClient.query).toHaveBeenNthCalledWith(6, "COMMIT");
    
          // Verify service function calls
          expect(calculateOrderPrice).toHaveBeenCalledWith(1);
          expect(createOrder).toHaveBeenCalledWith(1, 100.0, 0, 100.0 , 1, 1, "cash", 1);
          expect(addOrderItems).toHaveBeenCalledWith(1, 1);
          expect(updateProductStock).toHaveBeenCalledWith(1);
          expect(clearCart).toHaveBeenCalledWith(1);
      });
    });
});