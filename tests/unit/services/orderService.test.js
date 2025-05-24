import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateOrderPrice,
  createOrder,
  addOrderItems,
  updateProductStock,
  clearCart,
  getOrderDetails,
} from "../../../services/orderService.js";

// Mock the database
vi.mock("../../../db.js");

import db from "../../../db.js";

describe("Order Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.query.mockClear();
    });

    describe("calculateOrderPrice()", () => {
        it("should calculate the correct total price", async () => {
            const mockUserId = 1;
            const mockTotal = "99.99";

            db.query.mockResolvedValue({
                rows: [{ total_price: mockTotal }]
            });

            const result = await calculateOrderPrice(mockUserId);

            expect(result).toBe(mockTotal);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("SUM(p.price * c.quantity)"),
                [mockUserId]
            );
        });

        it("should return null when cart is empty", async () => {
            db.query.mockResolvedValue({ rows: [{ total_price: null }] });
            
            const result = await calculateOrderPrice(1);
            expect(result).toBeNull();
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("SUM(p.price * c.quantity)"),
                [1]
            );
          }); 
    });

    describe("createOrder()", () => {
        it("should create an order and return the order ID", async () => {
          const mockOrderId = 123;
          const mockOrderData = {
            userId: 1,
            subtotal: 80.00,
            shippingCost: 19.99,
            totalPrice: 99.99,
            shippingAddressId: 1,
            billingAddressId: 2,
            paymentMethod: "cash",
            shippingMethodId: 1
          };
    
          db.query.mockResolvedValue({
            rows: [{ id: mockOrderId }]
          });
    
          const result = await createOrder(
            mockOrderData.userId,
            mockOrderData.subtotal,
            mockOrderData.shippingCost,
            mockOrderData.totalPrice,
            mockOrderData.shippingAddressId,
            mockOrderData.billingAddressId,
            mockOrderData.paymentMethod,
            mockOrderData.shippingMethodId
          );
    
          expect(result).toBe(mockOrderId);
          expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO orders"),
            [
              mockOrderData.userId,
              mockOrderData.subtotal,
              mockOrderData.shippingCost,
              mockOrderData.totalPrice,
              mockOrderData.shippingAddressId,
              mockOrderData.billingAddressId,
              mockOrderData.paymentMethod,
              mockOrderData.shippingMethodId
            ]
          );
        });

        it("should handle empty cart", async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
          
            await addOrderItems(1, 1);
          
            expect(db.query).toHaveBeenCalledTimes(1); // Only the cart query
            expect(db.query).not.toHaveBeenCalledWith(
              expect.stringContaining("INSERT INTO order_items")
            ); // Ensure no inserts are made
        });
    });

    describe("addOrderItems()", () => {
        it("should add all cart items to order_items", async () => {
          const mockOrderId = 123;
          const mockUserId = 1;
          const mockCartItems = [
            { product_id: 1, quantity: 2, price: 10.00 },
            { product_id: 2, quantity: 1, price: 15.00 }
          ];
    
          // Mock the cart items query
          db.query.mockResolvedValueOnce({
            rows: mockCartItems
          });
    
          // Mock the order items insert (called twice)
          db.query.mockResolvedValue({});
    
          await addOrderItems(mockOrderId, mockUserId);
    
          // Verify cart items query
          expect(db.query).toHaveBeenNthCalledWith(1,
            expect.stringContaining("SELECT c.product_id"),
            [mockUserId]
          );
    
          // Verify order items inserts
          expect(db.query).toHaveBeenNthCalledWith(2,
            expect.stringContaining("INSERT INTO order_items"),
            [mockOrderId, mockCartItems[0].product_id, mockCartItems[0].quantity, mockCartItems[0].price]
          );
          expect(db.query).toHaveBeenNthCalledWith(3,
            expect.stringContaining("INSERT INTO order_items"),
            [mockOrderId, mockCartItems[1].product_id, mockCartItems[1].quantity, mockCartItems[1].price]
          );
        });
    
        it("should handle empty cart", async () => {
          db.query.mockResolvedValueOnce({ rows: [] });
          
          await addOrderItems(1, 1);
          // Only the cart query should be called, no inserts
          expect(db.query).toHaveBeenCalledTimes(1);
        });
    });


    describe("updateProductStock()", () => {
        it("should update stock for all cart items", async () => {
          const mockUserId = 1;
          const mockCartItems = [
            { product_id: 1, quantity: 2 },
            { product_id: 2, quantity: 1 }
          ];
    
          // Mock the cart items query
          db.query.mockResolvedValueOnce({
            rows: mockCartItems
          });
    
          // Mock the stock updates (called twice)
          db.query.mockResolvedValue({});
    
          await updateProductStock(mockUserId);
    
          // Verify cart items query
          expect(db.query).toHaveBeenNthCalledWith(1,
            expect.stringContaining("SELECT product_id, quantity"),
            [mockUserId]
          );
    
          // Verify stock updates
          expect(db.query).toHaveBeenNthCalledWith(2,
            expect.stringContaining("UPDATE products SET stock"),
            [mockCartItems[0].quantity, mockCartItems[0].product_id]
          );
          expect(db.query).toHaveBeenNthCalledWith(3,
            expect.stringContaining("UPDATE products SET stock"),
            [mockCartItems[1].quantity, mockCartItems[1].product_id]
          );
        });
    });


    describe("clearCart()", () => {
        it("should delete all cart items for user", async () => {
          const mockUserId = 1;
          
          await clearCart(mockUserId);
          
          expect(db.query).toHaveBeenCalledWith(
            "DELETE FROM carts WHERE user_id = $1",
            [mockUserId]
          );
        });
    });

    describe("getOrderDetails()", () => {
        const mockOrderId = 5;
        const mockUserId = 1;
        const mockOrderData = {
        rows: [{
            order_id: mockOrderId,
            order_status: "pending",
            total_price: 99.99,
            payment_method: "cash",
            created_at: new Date(),
            shipping_first_name: "Johnny",
            shipping_last_name: "Cash",
            shipping_address: "Strada Lunga 23A",
            shipping_city: "Oradea",
            shipping_county: "Bihor",
            shipping_country: "Romania",
            shipping_postal_code: "410495",
            shipping_phone_number: "+40771711988",
            billing_first_name: "Johnny",
            billing_last_name: "Cash",
            billing_address: "Strada Lunga 23A",
            billing_city: "Oradea",
            billing_county: "Bihor",
            billing_country: "Romania",
            billing_postal_code: "410495",
            billing_phone: "+40771711988",
            product_id: 1,
            product_name: "Product A",
            thumbnail: "product-a.jpg",
            quantity: 2,
            product_price: 10.00
        }]
        };

        it("should return order details for valid order (user check)", async () => {
        // Mock ownership check
        db.query.mockResolvedValueOnce({
            rows: [{ id: mockOrderId }]
        });
        
        // Mock order details query
        db.query.mockResolvedValueOnce(mockOrderData);

        const result = await getOrderDetails(mockOrderId, mockUserId);

        expect(result.id).toBe(mockOrderId);
        expect(result.products).toHaveLength(1);
        expect(db.query).toHaveBeenNthCalledWith(1,
            "SELECT id FROM orders WHERE id = $1 AND user_id = $2",
            [mockOrderId, mockUserId]
        );
        });

        it("should return order details for admin (no user check)", async () => {
        // Mock order details query (no ownership check)
        db.query.mockResolvedValueOnce(mockOrderData);

        const result = await getOrderDetails(mockOrderId);

        expect(result.id).toBe(mockOrderId);
        expect(db.query).toHaveBeenCalledTimes(1); // Only the main query
        });

        it("should throw error when order not found", async () => {
        db.query.mockResolvedValueOnce({ rows: [] }); // Ownership check fails
        
        await expect(getOrderDetails(mockOrderId, mockUserId))
            .rejects.toThrow("Order not found or access denied");
        });

        it("should throw error when order details not found", async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: mockOrderId }] }) // Ownership exists
                    .mockResolvedValueOnce({ rows: [] }); // But no order details
        
        await expect(getOrderDetails(mockOrderId, mockUserId))
            .rejects.toThrow("Order details not found");
        });

        it("should handle missing billing address", async () => {
        const mockData = JSON.parse(JSON.stringify(mockOrderData));
        mockData.rows[0].billing_first_name = null; // Simulate missing billing
        
        db.query.mockResolvedValueOnce({ rows: [{ id: mockOrderId }] })
                    .mockResolvedValueOnce(mockData);

        const result = await getOrderDetails(mockOrderId, mockUserId);
        
        // Billing address should fall back to shipping address
        expect(result.billingAddress.name).toBe("Johnny Cash");
        });
    })
})