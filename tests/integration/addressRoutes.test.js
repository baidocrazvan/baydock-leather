import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import { validateAddress } from "../../middleware/validationMiddleware.js"
import { getUserAddress } from "../../services/addressService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/addressService.js");

describe("Address routes", () => {
    
    // Mock authentication
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

    // Mock validation middleware
    vi.mock("../../middleware/validationMiddleware.js", () => ({
        validateAddress: (req, res, next) => next(),
        validateLogin: (req, res, next) => next(),
        validateRegister: (req, res, next) => next(),
      }));

    const mockAddress = {
        id: 1,
        user_id: 1,
        first_name: "Johnny",
        last_name: "Test",
        address: "Str Lunga 23A",
        city: "Oradea",
        county: "Bihor",
        postal_code: "123456",
        phone_number: "+40771711988",
        is_shipping: true,
        is_billing: true,
        is_active: true
      };

    beforeEach(() => {
        vi.clearAllMocks();
    })

     // Default mocks
    getUserAddress.mockResolvedValue(mockAddress);

    describe("GET /shipping-address", () => {
        it("should render the add address page", async () => {
          const res = await request(app)
            .get("/address/shipping-address")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("Add Address");
        });
    });

    describe("POST /shipping-address", () => {
        it("should add a new shipping address", async () => {
            db.query.mockResolvedValueOnce({ rows: [] }) // Simulate no existing addresses
              .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Simulate success
      
            const res = await request(app)
              .post("/address/shipping-address")
              .send({
                firstName: "Johnny",
                lastName: "Test",
                address: "Str Lunga 23A",
                city: "Oradea",
                county: "Bihor",
                postalCode: "123456",
                phoneNumber: "+40771711988",
                fromCheckout: false
              })
              .expect(302)
              .expect("Location", "/user/account");
      
            expect(db.query).toHaveBeenCalledWith(
              expect.stringContaining("INSERT INTO shipping_addresses"),
              expect.arrayContaining([1, true, true]) // userId, isShipping, isBilling
            );
        });
        
        it("should redirect to checkout when fromCheckout is true", async () => {
            db.query.mockResolvedValueOnce({ rows: [] })
              .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
            const res = await request(app)
              .post("/address/shipping-address")
              .send({
                firstName: "Johnny",
                lastName: "Test",
                address: "Str Lunga 23A",
                city: "Oradea",
                county: "Bihor",
                postalCode: "123456",
                phoneNumber: "+40771711988",
                fromCheckout: true,
              })
              .expect(302)
              .expect("Location", "/cart/checkout");
        });
        
        it("should handle database errors", async () => {
            db.query.mockRejectedValue(new Error("DB error"));
      
            const res = await request(app)
              .post("/address/shipping-address")
              .send({
                firstName: "Johnny",
                lastName: "Test",
                address: "Str Lunga 23A",
                city: "Oradea",
                county: "Bihor",
                postalCode: "123456",
                phoneNumber: "+40771711988",
              })
              .expect(302)
              .expect("Location", "/");
          });
    })
    
    describe("GET /shipping-address/edit/:id", () => {
        it("should render edit page with address data", async () => {
          const res = await request(app)
            .get("/address/shipping-address/edit/1")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("Edit Address");
          expect(getUserAddress).toHaveBeenCalledWith(1, "1");
        });
    
        it("should handle address not found", async () => {
          getUserAddress.mockRejectedValue(new Error("ADDRESS_NOT_FOUND"));
    
          const res = await request(app)
            .get("/address/shipping-address/edit/999")
            .expect(302)
            .expect("Location", "/customer/addresses");
        });
    });

    describe("PUT /shipping-address/edit/:id", () => {
        it("should update an address", async () => {
            const mockClient = {
              query: vi.fn()
                .mockResolvedValueOnce({}) // Reset shipping
                .mockResolvedValueOnce({}) // Reset billing
                .mockResolvedValueOnce({ rows: [mockAddress] }),
              release: vi.fn()
            };
            db.connect.mockResolvedValue(mockClient);
      
            const res = await request(app)
              .put("/address/shipping-address/edit/1")
              .send({
                firstName: "Updated",
                lastName: "Updated",
                address: "Updated address",
                city: "Updated city",
                county: "Updated county",
                phoneNumber: "+406616229877",
                postalCode: "543213",
                is_shipping: "on",
                is_billing: "on"
              })
              .expect(302)
              .expect("Location", "/user/addresses");
      
            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });
        
        it("should handle update errors", async () => {
            const mockClient = {
              query: vi.fn().mockRejectedValue(new Error("DB error")),
              release: vi.fn()
            };
            db.connect.mockResolvedValue(mockClient);
      
            const res = await request(app)
              .put("/address/shipping-address/edit/1")
              .send({
                firstName: "Updated",
                lastName: "Updated",
                address: "Updated address twice",
                city: "Updated city",
                county: "Updated county twice",
                phoneNumber: "+406616229877",
                postalCode: "543213",
                is_shipping: "on",
                is_billing: "on"
              })
              .expect(302)
              .expect("Location", "/customer/addresses");
      
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
          });
    })

    describe("PATCH /shipping-address/default", () => {
        it("should update default shipping and billing addresses", async () => {
            db.query.mockResolvedValueOnce({}) // Reset all
              .mockResolvedValueOnce({}) // Set shipping
              .mockResolvedValueOnce({}); // Set billing
          
            const res = await request(app)
              .patch("/address/shipping-address/default")
              .send({
                shippingAddressId: 1,
                billingAddressId: 2,
              })
              .expect(302)
              .expect("Location", "/cart/checkout");
          
            // Verify the first query resets all shipping and billing flags
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining(`UPDATE shipping_addresses SET is_shipping = false, is_billing = false`),
                [1]
            );

            // // Verify the second query sets the shipping address
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining(`UPDATE shipping_addresses SET is_shipping = true`),
                [1, 1]
            );

            // // Verify the third query sets the billing address
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining(`UPDATE shipping_addresses SET is_billing = true`),
                [2, 1]
            );
        });
    });

    describe("DELETE /shipping-address/:id", () => {
        it("should soft delete an address", async () => {
          db.query.mockResolvedValue({ rowCount: 1 });
    
          const res = await request(app)
            .delete("/address/shipping-address/1")
            .expect(302)
            .expect("Location", "/customer/addresses");
    
          expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE shipping_addresses SET is_active = FALSE"),
            ["1", 1]
          );
        });
    
        it("should handle address not found", async () => {
          db.query.mockResolvedValue({ rowCount: 0 });
    
          const res = await request(app)
            .delete("/address/shipping-address/999")
            .expect(302)
            .expect("Location", "/customer/addresses");
        });
      });
})