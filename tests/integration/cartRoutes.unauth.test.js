import request from "supertest";
import session from "supertest-session";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import {
  getCartData,
  updateCartItem,
  updateCartQuantity,
  validateQuantity
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
    
    const mockCartItems = { rows: [
        {
          id: 1,
          name: "Product A",
          price: '10.99',
          thumbnail: "product-a.jpg",
        }
    ],
};

    
  beforeEach(() => {
      app.request.session = { cart: [] }; // Clear the session cart
  });

  describe("GET /cart (Guest)", () => {
    

    it("should render the cart page with items from the session cart", async () => {
        // Create a new test session for each test, otherwise cart contents carry over between tests
        const testSession = session(app);
        // Initialize session cart with cart contents
        app.request.session = {
            cart: [{ productId: "1", quantity: 2 }],
          };
      // Mock response fetching products from db
      db.query.mockResolvedValue(mockCartItems);
  
      const res = await testSession
        .get("/cart")
        .expect(200)
        .expect("Content-Type", /html/);
  
      expect(res.text).toContain("Product A");
      expect(res.text).toContain("21.98"); 
      
    });
  });

  describe("POST /:id (Guest)", () => {
    
    it("should add a product to the session cart", async () => {
        const testSession = session(app);

      // Make the POST request to add a product wihout a cart initalized
      await testSession
        .post("/cart/1")
        .send({ quantity: 2 })
        .expect(302);

    // Verify the session cart using the temporary route
    const res = await testSession.get("/inspect-session").expect(200);
    expect(res.body.cart).toEqual([{ productId: "1", quantity: 2 }]);
  });
  
  it("should update the quantity if the product already exists in the session cart", async () => {
    const testSession = session(app);
    
    app.request.session = {
      cart: [{ productId: "1", quantity: 2 }],
    };

    // Make the POST request to update quantity of product that already exists in cart
    await testSession
      .post("/cart/1")
      .send({ quantity: 2 })
      .expect(302);

    
    const res = await testSession.get("/inspect-session").expect(200);
    expect(res.body.cart).toEqual([{ productId: "1", quantity: 4 }]);
  });

});

  describe("PATCH / (Guest)", () => {
    it("should update the quantity of a product in the session cart", async () => {
        const testSession = session(app);

        app.request.session = {
            cart: [{ productId: "1", quantity: 2 }],
        };

        // Mock req.body contents with .send()
        await testSession
        .patch("/cart")
        .send({productId: "1", quantity: 5})
        .expect(302);

        const res = await testSession.get("/inspect-session").expect(200);
        expect(res.body.cart).toEqual([{ productId: "1", quantity: 5}]);
    })

    it("should flash an error message if the product is not in the session cart", async () => {
        const testSession = session(app);
    
        await testSession
          .patch("/cart")
          .send({ productId: "1", quantity: 5 }) 
          .expect(302);
    
          
          const res = await testSession.get("/cart").expect(200);
          expect(res.text).toContain("Product not found inside cart.");
    });
  });

  describe("DELETE /delete/:id (Guest)", () => {
    it("should delete a product from user's session cart", async () => {
        const testSession = session(app);

        app.request.session = {
            cart: [{ productId: "1", quantity: 2 }],
        };

        await testSession
            .delete("/cart/delete/1")
            .expect(302);
        
        const res = await testSession.get("/inspect-session").expect(200);
        expect(res.body.cart).toEqual([]);
    })

    it("should flash an error message if the product is not in the session cart", async () => {
        const testSession = session(app);
    
        await testSession
          .delete("/cart/delete/1")
          .expect(302);
          
        const res = await testSession.get("/cart").expect(200);
        expect(res.text).toContain("Specified item is not present in your cart.");
    });
  });

  describe("DELETE /delete (Guest)", () => {
    it("should clear session cart of all contents", async () => {
        const testSession = session(app);

        app.request.session = {
            cart: [{ productId: "1", quantity: 10}]
        }

        await testSession
            .delete("/cart/delete")
            .expect(302);
        
        const res = await testSession.get("/cart").expect(200);
        expect(res.text).toContain("Cart cleared successfully");
        const inspect = await testSession.get("/inspect-session").expect(200);
        expect(inspect.body.cart).toEqual([]);
    })
  });
}) 