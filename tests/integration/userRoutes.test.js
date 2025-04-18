import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import { getActiveUserAddresses } from "../../services/addressService.js";

// Mock dependencies
vi.mock("../../services/addressService.js");

describe("User Routes", () => {
  const mockUser = {
    id: 1,
    first_name: "Johnny",
    last_name: "Test",
    email: "test@example.com",
    role: "user",
  };

  const mockAddresses = [
    {
      id: 1,
      user_id: 1,
      address: "Str Lunga 23A",
      city: "Bucuresti",
      is_shipping: true,
      is_billing: true,
      is_active: true,
    },
  ];

  const loginUser = async () => {
    const res = await request(app)
      .post("/auth/login")
      .type("form")
      .send({
        email: mockUser.email,
        password: "Password123", // Mock password
      })
      .expect(302); // Login should redirect to the success page

    // Extract the session cookie from the response
    const cookies = res.headers["set-cookie"];
    return cookies.find((cookie) => cookie.startsWith("connect.sid"));
  };

  describe("GET /account", () => {
    it("should render the account page with user data and addresses for authenticated users", async () => {
      const sessionCookie = await loginUser();

      // Mock the address service to return addresses
      getActiveUserAddresses.mockResolvedValue(mockAddresses);

      const res = await request(app)
        .get("/user/account")
        .set("Cookie", sessionCookie) // Include the session cookie
        .expect(200)
        .expect("Content-Type", /html/); // Expect HTML content

      // Verify that the response contains user details and addresses
      expect(res.text).toContain("Test"); // Check for user name in the HTML
      expect(res.text).toContain("Str Lunga 23A"); // Check for address in the HTML
    });

    it("should render the account page with an empty addresses array if the address service fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const sessionCookie = await loginUser();
    
      // Mock the address service to throw an error
      getActiveUserAddresses.mockRejectedValue(new Error("Database error"));
    
      const res = await request(app)
        .get("/user/account")
        .set("Cookie", sessionCookie) // Include the session cookie
        .expect(200) // Expect the page to render successfully
        .expect("Content-Type", /html/); // Expect HTML content
    
      // Verify that the response contains user details and handles empty addresses gracefully
      expect(res.text).toContain("Test"); // Check for user name in the HTML
      expect(res.text).not.toContain("Str Lunga 23A"); // No address details should be displayed
      expect(res.text).toContain("You haven't added any addresses yet."); // Check for a message indicating no addresses are available

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /addresses', () => {
    it("should render the addresses page with user addresses for authenticated users", async () => {
      const sessionCookie = await loginUser();

      // Mock the address service to return addresses
      getActiveUserAddresses.mockResolvedValue(mockAddresses);

      const res = await request(app)
        .get("/user/addresses")
        .set("Cookie", sessionCookie) // Include the session cookie
        .expect(200)
        .expect("Content-Type", /html/); // Expect HTML content

      // Verify that the response contains addresses
      expect(res.text).toContain("Str Lunga 23A");
    });

    it("should handle errors from the address service ", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sessionCookie = await loginUser();

      // Mock the address service to throw an error
      getActiveUserAddresses.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .get("/user/addresses")
        .set("Cookie", sessionCookie) // Include the session cookie
        .expect(200)
        .expect("Content-Type", /html/);

        // No address details should be displayed
        expect(res.text).not.toContain("Str Lunga 23A");
        // Check for a message indicating no addresses are available
        expect(res.text).toContain("You haven't added any adresses yet.")

        consoleErrorSpy.mockRestore();
    });
  });
});