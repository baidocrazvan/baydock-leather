import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import { getAllProducts, getProductById } from "../../services/productService.js";
import { getAllOrders } from "../../services/adminService.js";
import { getOrderDetails } from "../../services/orderService.js";
import { getAllUsers, getUserDetails } from "../../services/userService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/adminService.js");
vi.mock("../../services/productService.js");
vi.mock("../../services/orderService.js");
vi.mock("../../services/userService.js");

describe("Admin Routes", () => {
    // Mock authentication and admin middleware
    vi.mock("../../middleware/middleware.js", () => ({
        authenticate: (req, res, next) => {
        req.user = {
            id: 1,
            first_name: "Admin",
            last_name: "User",
            email: "admin@example.com",
            role: "admin"
        };
        req.isAuthenticated = () => true;
        next();
        },
        isAdmin: (req, res, next) => next()
    }));

    const mockProduct = {
        id: 1,
        name: "Test Product",
        price: 99.99,
        stock: 10,
        thumbnail: "images/thumbnail.jpg"
    };

    const mockOrder = {
        order_id: 1,
        order_status: "pending",
        order_date: new Date(),
        order_total: 199.98,
        first_name: "Johnny",
        last_name: "Test"
    };

    const mockOrderDetails = {
        id: 1,
        status: "pending",
        total: 199.98,
        payment: "cash",
        date: "2023-01-01",
        shippingAddress: {
          name: "Johnny Test",
          street: "Str Lunga 23A",
          city: "Oradea",
          country: "Romania",
          postalCode: "123456",
          phoneNumber: "+40771711988"
        },
        billingAddress: {
          name: "Johnny Test",
          street: "Str Lunga 23A",
          city: "Oradea",
          country: "Romania",
          postalCode: "123456",
          phoneNumber: "+40771711988"
          },
        products: [
          {
            productId: 1,
            name: "Test Product",
            thumbnail: "test.jpg",
            quantity: 2,
            price: 99.99,
            subtotal: "199.98"
          }
        ]
    };

    const mockUser = {
        id: 1,
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        created_at: new Date(),
        role: "user"
    };

    const mockUserDetails = {
        user: {
          id: 1,
          first_name: "Test",
          last_name: "User",
          email: "test@example.com"
        },
        addresses: [
          {
            id: 1,
            address: "Str Lunga 23A",
            city: "Oradea"
          }
        ],
        orders: [
          {
            id: 1,
            status: "completed",
            total_price: 99.99
          }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Supress console.error
        vi.spyOn(console, "error").mockImplementation(() => {});

        // Default mocks
        getAllProducts.mockResolvedValue([mockProduct]);
        getProductById.mockResolvedValue(mockProduct);
        getAllOrders.mockResolvedValue([mockOrder]);
        getOrderDetails.mockResolvedValue(mockOrderDetails);
        getAllUsers.mockResolvedValue([mockUser]);
        getUserDetails.mockResolvedValue(mockUserDetails);
        vi.mock("../../middleware/validationMiddleware.js", () => ({
          validateRegister: (req, res, next) => next(), // Mock validateRegister to always pass
          validateLogin: (req, res, next) => next(),    // Mock validateLogin to always pass
          validateAddress: (req, res, next) => next(), // Mock validateAddress to always pass
        }));
    });

    afterEach(() => {
      // Restore console.error 
      vi.restoreAllMocks();
    })

    describe("GET /dashboard", () => {
        it("should render admin dashboard with products", async () => {
          const res = await request(app)
            .get("/admin/dashboard")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("Test Product");
          expect(getAllProducts).toHaveBeenCalled();
        });
    
        it("should redirect on error", async () => {
          getAllProducts.mockRejectedValue(new Error("DB error"));
    
          const res = await request(app)
            .get("/admin/dashboard")
            .expect(302)
            .expect("Location", "/");
        });
    });

    describe("GET /modify-product/:id", () => {
        it("should render product edit page", async () => {
          const res = await request(app)
            .get("/admin/modify-product/1")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("Modify product");
          expect(getProductById).toHaveBeenCalledWith("1");
        });
    });

    describe("GET /orders", () => {
        it("should render orders list", async () => {
          const res = await request(app)
            .get("/admin/orders")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("User orders:");
          expect(getAllOrders).toHaveBeenCalledWith("");
        });
    
        it("should handle search term", async () => {
          const res = await request(app)
            .get("/admin/orders?search=1")
            .expect(200);
    
          expect(getAllOrders).toHaveBeenCalledWith("1");
        });
    
        it("should redirect on error", async () => {
          getAllOrders.mockRejectedValue(new Error("DB error"));
    
          const res = await request(app)
            .get("/admin/orders")
            .expect(302)
            .expect("Location", "/admin/dashboard");
        });
    });
    
    describe("GET /orders/:id", () => {
        it("should render order details", async () => {
        getOrderDetails.mockResolvedValue(mockOrderDetails)
          const res = await request(app)
            .get("/admin/orders/1")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("Order number #1");
          expect(getOrderDetails).toHaveBeenCalledWith("1");
        });
    
        it("should redirect on error", async () => {
          getOrderDetails.mockRejectedValue(new Error("Order not found"));
    
          const res = await request(app)
            .get("/admin/orders/999")
            .expect(302)
            .expect("Location", "/admin/orders");
        });
    });

    describe("PATCH /orders/:id", () => {
        it("should update order status", async () => {
          db.query.mockResolvedValue({ rowCount: 1 });
    
          const res = await request(app)
            .patch("/admin/orders/1")
            .send({ status: "completed" })
            .expect(302)
            .expect("Location", "/admin/orders/1");
    
          expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE orders SET status = $1"),
            ["completed", "1"]
          );
        });
    
        it("should handle update error", async () => {
          db.query.mockRejectedValue(new Error("DB error"));
    
          const res = await request(app)
            .patch("/admin/orders/1")
            .send({ status: "completed" })
            .expect(302)
            .expect("Location", "/admin/orders");

            // Verify that the database query was called with the correct arguments
            expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE orders SET status = $1"),
            ["completed", "1"]
            );
        });
    });

    describe("GET /users", () => {
        it("should render users list", async () => {
          const res = await request(app)
            .get("/admin/users")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("User Management");
          expect(getAllUsers).toHaveBeenCalled();
        });
    
        it("should redirect on error", async () => {
          getAllUsers.mockRejectedValue(new Error("DB error"));
    
          const res = await request(app)
            .get("/admin/users")
            .expect(302)
            .expect("Location", "/admin/dashboard.ejs");

        });
    });

    describe("GET /users/:id", () => {
        it("should render user details", async () => {
          const res = await request(app)
            .get("/admin/users/1")
            .expect(200)
            .expect("Content-Type", /html/);
    
          expect(res.text).toContain("User Details:");
          expect(getUserDetails).toHaveBeenCalledWith("1");
        });
    
        it("should redirect on error", async () => {
          getUserDetails.mockRejectedValue(new Error("User not found"));
    
          const res = await request(app)
            .get("/admin/users/999")
            .expect(302)
            .expect("Location", "/admin/users");
        });
    });

    describe("GET /create", () => {
      it("should render the admin registration page", async () => {
        const res = await request(app)
          .get("/admin/create")
          .expect(200)
          .expect("Content-Type", /html/);
    
        expect(res.text).toContain("Create new admin account");
      });
    })

    describe("POST /create", () => {
      it("should create a new admin account", async () => {
        
        db.query.mockResolvedValueOnce({ rows: [] }); // Simulate no existing email
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Second query: insert new user
    
        const res = await request(app)
          .post("/admin/create")
          .send({
            lastName: "Admin",
            firstName: "User",
            email: "admin@example.com",
            password: "Password123",
            cpassword: "Password123",
          })
          .expect(302)
          .expect("Location", "/admin/dashboard");
    
        expect(db.query).toHaveBeenNthCalledWith(
          1,
          "SELECT * FROM users WHERE email = $1",
          ["admin@example.com"]
        );

        expect(db.query).toHaveBeenNthCalledWith(
          2,
          "INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)",
          [
            "User",
            "Admin",
            "admin@example.com",
            expect.any(String), // hashed password
            "admin"
          ]
        );

      });
    })
});