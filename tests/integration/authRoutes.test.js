import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import passport from "passport";
import db from "../../db.js";
import bcrypt from "bcryptjs";
import { sendConfirmationEmail } from "../../services/emailService.js";

// Mock the database and bcrypt
vi.mock("../../db.js");
vi.mock("bcryptjs");
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

vi.mock("../../services/emailService.js", () => ({
  generateConfirmationToken: vi.fn(() => "mock-token"),
  sendConfirmationEmail: vi.fn().mockResolvedValue(true),
  sendResetEmail: vi.fn().mockResolvedValue(true)
}));

vi.mock("../../db.js", () => ({
  default: {
    query: vi.fn()
  }
}));

describe("Auth Routes", () => {
  let testSession;

  beforeEach(() => {
    // Create a new session for each test
    testSession = request.agent(app);
    vi.clearAllMocks();
    
  });

  // Test data
  const mockUser = {
    id: 1,
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    password: "hashedpassword",
    role: "user",
  };

  describe("GET Routes", () => {
    it("should render the login page", async () => {
      const res = await testSession
        .get("/auth/login")
        .expect(200)
        .expect("Content-Type", /html/);

      expect(res.text).toContain("Login"); // Check if the login page is rendered
    });

    it("should render the register page", async () => {
      const res = await testSession
        .get("/auth/register")
        .expect(200)
        .expect("Content-Type", /html/);

      expect(res.text).toContain("Register"); // Check if the register page is rendered
    });
  });

  describe("POST /register", () => {
    const mockUser = {
      id: 1,
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      password: "Hashed-password1",
      role: "user",
      is_confirmed: false,
      confirmation_token: "mock-token",
      confirmation_token_expires: new Date(Date.now() + 600000)
    };

    beforeEach(() => {
      db.query.mockReset();
      db.query
        // Mock no existing user
        .mockResolvedValueOnce({ rows: [] })  // Check confirmed user
        .mockResolvedValueOnce({ rows: [] })  // Check unconfirmed user
        .mockResolvedValueOnce({ rows: [] })  // Recent attempt
        // Mock token expiration check
        .mockResolvedValueOnce({ rows: [{ expires: new Date(Date.now() + 600000) }] })
        // Mock user creation
        .mockResolvedValueOnce({ rows: [mockUser] })
        // Mock cart insertion
        .mockResolvedValueOnce({ rows: [] });
    });

    it("should redirect to login after successful registration", async () => {

      const res = await testSession
        .post("/auth/register")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "Password123",
          cpassword: "Password123",
        })
        .expect(302) // Redirect
        .expect("Location", "/auth/login");

        expect(sendConfirmationEmail).toHaveBeenCalled();
    });

    it("should reject mismatched passwords", async () => {
      const res = await testSession
        .post("/auth/register")
        .type("form")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "Password123",
          cpassword: "DifferentPassword",
        })
        .expect(302) // Redirect
        .expect("Location", "/auth/register");
    });

    it("should reject an existing email", async () => {
      // Mock database response for existing CONFIRMED user
      db.query
        .mockResolvedValueOnce({ rows: [{ ...mockUser, is_confirmed: true }] }) // Existing confirmed user
        .mockResolvedValueOnce({ rows: [] });

      const res = await testSession
        .post("/auth/register")
        .type("form")
        .send({
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "Password123",
          cpassword: "Password123",
        })
        .expect(302) // Redirect
        
      expect(res.header.location).toBe("/auth/login");
    });
  });

  describe("POST /login", () => {
    beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for successful authentication
    vi.spyOn(passport, "authenticate").mockImplementation((strategy, callback) => {
      return (req, res, next) => {
        // Default to successful authentication unless overridden in specific tests
        callback(null, { 
          id: 1,
          email: "test@example.com",
          is_confirmed: true,
          first_name: "Test",
          last_name: "User"
        }, null);
      };
    });

    // Mock database queries
    db.query.mockImplementation(async (query) => {
      if (query.includes("SELECT * FROM users WHERE email")) {
        return { 
          rows: [{
            id: 1,
            email: "test@example.com",
            password: await bcrypt.hash("Password123", 10),
            is_confirmed: true
          }] 
        };
      }
      if (query.includes("DELETE FROM pending_carts")) {
        return { rows: [] }; // No pending carts
      }
      return { rows: [] };
    });
  });
  
    it("should login with valid credentials", async () => {
      const res = await testSession
        .post("/auth/login")
        .type("form")
        .send({
          email: "test@example.com",
          password: "Password123"
        })
        .expect(302)
        .expect("Location", "/");
  
      // Verify session was established
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  
    it("should reject invalid credentials", async () => {
      // Override passport mock for
    vi.spyOn(passport, "authenticate").mockImplementationOnce((strategy, callback) => {
      return (req, res, next) => {
        callback(null, false, { message: "Invalid credentials" });
      };
    });
  
      const res = await testSession
        .post("/auth/login")
        .type("form")
        .send({
          email: "test@example.com",
          password: "wrongpassword"
        })
        .expect(302)
        .expect("Location", "/auth/login");
    });

    it("should reject unconfirmed users", async () => {
    // Override passport mock for this test
    vi.spyOn(passport, "authenticate").mockImplementationOnce((strategy, callback) => {
      return (req, res, next) => {
        callback(null, { 
          id: 1,
          email: "test@example.com",
          is_confirmed: false 
        }, null);
      };
    });

    const res = await testSession
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "Password123"
      })
      .expect(302)
      .expect("Location", "/auth/login");


    // Check that user has not been authenticated
    const authCheck = await testSession.get("/account/dashboard"); // Try protected route
    expect(authCheck.status).not.toBe(200);
  });
  });
  
  describe("Email Confirmation", () => {
    it("should confirm email with valid token", async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Token exists
        .mockResolvedValueOnce({ rows: [] }); // Update success

      const res = await request(app)
        .post("/auth/confirm")
        .send({ token: "valid-token" })
        .expect(302);

      expect(res.header.location).toBe("/auth/login");
    });

    it("should reject invalid token", async () => {
      db.query.mockResolvedValueOnce({ rows: [] }); // No token found

      const res = await request(app)
        .post("/auth/confirm")
        .send({ token: "invalid" })
        .expect(302);

      expect(res.header.location).toBe("/auth/register");
    });
  });

  describe("Rate Limiting", () => {
  it("should block after 5 registration attempts", async () => {
    // Mock successful registration (except last attempt)
    db.query.mockResolvedValue({ rows: [] });
    
    // First 4 attempts should succeed
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/auth/register")
        .send({
          firstName: "Test",
          lastName: "User",
          email: `test${i}@example.com`,
          password: "password123",
          cpassword: "password123"
        })
        .expect(302);
    }

    // 5th attempt should be blocked
    const res = await request(app)
      .post("/auth/register")
      .send({
        firstName: "Test",
        lastName: "User",
        email: "test5@example.com",
        password: "password123",
        cpassword: "password123"
      });

    expect(res.header.location).toBe("/auth/register");
  });
});
});

