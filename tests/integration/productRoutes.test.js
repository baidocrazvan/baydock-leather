import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import app from "../../app.js";
import db from "../../db.js";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
} from "../../services/productService.js";

// Mock dependencies
vi.mock("../../db.js");
vi.mock("../../services/productService.js");
// Multer mock
vi.mock("multer", () => {
  const multer = () => ({
    fields: () => (req, res, next) => {
      // Simulate file processing
      req.files = {
        thumbnail: [{ filename: "test-thumbnail.jpg" }],
        images: [
          { filename: "test-image1.jpg" },
          { filename: "test-image2.jpg" },
        ],
      };
      next();
    },
  });
  multer.diskStorage = () => vi.fn();
  return { default: multer };
});

vi.mock("../../middleware/middleware.js", () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 1,
      first_name: "Johnny",
      last_name: "Test",
      email: "test@example.com",
      role: "admin",
    };
    req.isAuthenticated = () => true;
    next();
  },
  isAdmin: (req, res, next) => next(),
  redirectIfAuthenticated: (req, res, next) => next(),
}));

describe("Product Routes", () => {
  const mockProducts = [
    {
      id: 1,
      name: "Product A",
      price: 10.99,
      category: "belts",
      thumbnail: "images/test",
      images: ["images/test", "images/test2"],
      is_active: true,
    },
    {
      id: 2,
      name: "Product B",
      price: 15.99,
      category: "wallets",
      thumbnail: "images/test",
      images: ["images/test", "images/test2"],
      is_active: true,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("GET /products", () => {
    it("should render all products", async () => {
      getAllProducts.mockResolvedValue(mockProducts);

      const res = await request(app)
        .get("/products")
        .expect(200)
        .expect("Content-Type", /html/);

      expect(res.text).toContain("Product A");
      expect(res.text).toContain("Product B");
      expect(getAllProducts).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it("should filter by category", async () => {
      getProductsByCategory.mockResolvedValue([mockProducts[0]]);

      const res = await request(app)
        .get("/products?category=belts")
        .expect(200);

      expect(res.text).toContain("Product A");
      expect(res.text).not.toContain("Product B");
      expect(getProductsByCategory).toHaveBeenCalledWith(
        "belts",
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it("should sort products", async () => {
      getAllProducts.mockResolvedValue([...mockProducts]);

      await request(app).get("/products?sort=price&order=desc").expect(200);

      expect(getAllProducts).toHaveBeenCalledWith(
        "price",
        "desc",
        undefined,
        undefined
      );
    });

    it("should show 404 when no products found", async () => {
      getAllProducts.mockResolvedValue([]);

      const res = await request(app).get("/products").expect(404);

      expect(res.text).toContain("no items to display");
    });
  });

  describe("GET /products/:id", () => {
    it("should render single product page", async () => {
      getProductById.mockResolvedValue(mockProducts[0]);
      const res = await request(app).get("/products/1").expect(200);
      expect(res.text).toContain("Product A");
      expect(getProductById).toHaveBeenCalledWith("1");
    });

    it("should show 404 for non-existent product", async () => {
      getProductById.mockResolvedValue(undefined);
      const res = await request(app).get("/products/999").expect(404);
      expect(res.text).toContain("Product not found");
    });
  });

  describe("POST /products", () => {
    it("should create product (admin)", async () => {
      db.query.mockResolvedValue({ rows: [{ id: 3 }] });
      await request(app)
        .post("/products")
        .send({
          name: "New Product",
          description: "Original Description",
          detailed_description: "Original Detailed Description",
          price: 25.99,
          category: "belts",
          stock: 10,
          images: "test-image1.jpg",
          thumbnail: "test-thumbnail.jpg",
        })
        .expect(302)
        .expect("Location", "/admin/dashboard");
    });
  });

  describe("POST /products/:id/reactivate", () => {
    const productId = 123;

    describe("when reactivation succeeds", () => {
      beforeEach(() => {
        db.query.mockResolvedValue({ rowCount: 1 });
      });

      it("should reactivate the product and redirect successfully", async () => {
        await request(app)
          .post(`/products/${productId}/reactivate`)
          .expect(302)
          .expect("Location", "/admin/products");

        // Verify database query
        expect(db.query).toHaveBeenCalledWith(
          "UPDATE products SET is_active = TRUE WHERE id = $1",
          [productId]
        );
      });
    });

    describe("when reactivation fails", () => {
      beforeEach(() => {
        db.query.mockRejectedValue(new Error("Database error"));
      });

      it("should redirect with error message", async () => {
        await request(app)
          .post(`/products/${productId}/reactivate`)
          .expect(302)
          .expect("Location", "/admin/products");

        expect(db.query).toHaveBeenCalledWith(
          "UPDATE products SET is_active = TRUE WHERE id = $1",
          [productId]
        );
      });
    });

    describe("when product doesn't exist", () => {
      it("should handle non-existent product gracefully", async () => {
        db.query.mockResolvedValue({ rowCount: 0 }); // No rows updated

        await request(app)
          .post(`/products/${productId}/reactivate`)
          .expect(302)
          .expect("Location", "/admin/products");
      });
    });
  });

  describe("PATCH /products/:id", () => {
    it("should update product (admin)", async () => {
      await request(app)
        .post("/products/1?_method=PATCH")
        .send({
          name: "Updated Product",
          description: "Original Description",
          price: 25.99,
          category: "Original Category",
          stock: 100,
        })
        .expect(302)
        .expect("Location", "/admin/dashboard");
    });
  });

  describe("DELETE /products/:id", () => {
    it("should delete product (admin)", async () => {
      // Mock the DELETE query
      db.query.mockImplementation((query) => {
        if (query === "DELETE FROM products WHERE id = $1") {
          return { rowCount: 1 }; // Simulate successful deletion
        }
        // Mock session-related queries
        if (query.startsWith("INSERT INTO 'session'")) {
          return {}; // Simulate session update
        }
        throw new Error(`Unexpected query: ${query}`);
      });

      await request(app)
        .post("/products/1?_method=DELETE") // Using method override
        .expect(302)
        .expect("Location", "/admin/products");

      // Verify the DELETE query
      expect(db.query).toHaveBeenCalledWith(
        "UPDATE products SET is_active = FALSE WHERE id = $1",
        [1]
      );
    });
  });
});
