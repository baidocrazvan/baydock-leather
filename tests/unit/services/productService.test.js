import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getProductsBySearch
} from "../../../services/productService.js";

// Mock the database
vi.mock("../../../db.js");

import db from "../../../db.js";

describe("Product Service", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("getAllProducts()", () => {
        const mockProducts = [
          { id: 1, name: "Product A", price: 10.99, created_at: new Date() },
          { id: 2, name: "Product B", price: 15.99, created_at: new Date() },
        ];
    
        it("should return all products without sorting", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getAllProducts();
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith("SELECT * FROM products WHERE is_active = TRUE",
                []
            );
        });

        it("should sort by price ascending", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
      
            const result = await getAllProducts("price", "asc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
              "SELECT * FROM products WHERE is_active = TRUE ORDER BY price ASC",
              []
            );
          });
      
        it("should sort by price descending", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getAllProducts("price", "desc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE is_active = TRUE ORDER BY price DESC",
                []
            );
        });
    
        it("should sort by created_at ascending", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getAllProducts("created_at", "asc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at ASC",
                []
            );
        });
    
        it("should ignore invalid sort column", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getAllProducts("invalid_column", "asc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith("SELECT * FROM products WHERE is_active = TRUE",
                []
            );
        });
    
        it("should handle database errors", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            db.query.mockRejectedValue(new Error("Database error"));
        
            const result = await getAllProducts();
            
            expect(result).toBeUndefined();
            consoleErrorSpy.mockRestore();
        });
    });

    describe("getProductById()", () => {
        const mockProduct = { 
          id: 1, 
          name: "Product A", 
          price: 10.99, 
          description: "Test product" 
        };
    
        it("should return product by ID", async () => {
            db.query.mockResolvedValue({ rows: [mockProduct] });
        
            const result = await getProductById(1);
            
            expect(result).toEqual(mockProduct);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE id = $1",
                [1]
            );
        });
    
        it("should return undefined when product not found", async () => {
            db.query.mockResolvedValue({ rows: [] });
        
            const result = await getProductById(999);
            
            expect(result).toBeUndefined();
        });
    
        it("should handle database errors", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            db.query.mockRejectedValue(new Error("Database error"));
        
            const result = await getProductById(1);
            
            expect(result).toBeUndefined();
            consoleErrorSpy.mockRestore();
        });
    });

    describe("getProductsByCategory()", () => {
        const mockProducts = [
          { id: 1, name: "Category A Product", category: "category_a" },
          { id: 2, name: "Another Category A Product", category: "category_a" },
        ];
    
        it("should return products by category without sorting", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getProductsByCategory("category_a");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE",
                ["category_a"]
            );
        });
    
        it("should sort by price ascending", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getProductsByCategory("category_a", "price", "asc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE ORDER BY price ASC",
                ["category_a"]
            );
        });
    
        it("should sort by created_at descending", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getProductsByCategory("category_a", "created_at", "desc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE ORDER BY created_at DESC",
                ["category_a"]
            );
        });
    
        it("should ignore invalid sort column", async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
        
            const result = await getProductsByCategory("category_a", "invalid_column", "asc");
            
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                "SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE",
                ["category_a"]
            );
        });
    
        it("should handle database errors", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            db.query.mockRejectedValue(new Error("Database error"));
        
            const result = await getProductsByCategory("category_a");
            
            expect(result).toBeUndefined();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('getProductsBySearch()', () => {
        const mockProducts = [
          { id: 1, name: 'Brown Leather Belt', description: 'Genuine leather', category: 'belts' },
          { id: 2, name: 'Blue Keychain', description: 'Handmade', category: 'keychains' }
        ];
        
        beforeEach(() => {
          vi.clearAllMocks();
        });
        
        it('should return products matching search term', async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
          
            const result = await getProductsBySearch('brown');
          
            expect(result).toEqual(mockProducts);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)'),
                ['%brown%']
            );
          });

        it('should find matches regardless of uppercase or lowercase characters in search term', async () => {
        db.query.mockResolvedValue({ rows: [mockProducts[0]] });
        
        const result = await getProductsBySearch('BrOwN');
        
        expect(result).toContainEqual(mockProducts[0]);
        expect(db.query).toHaveBeenCalledWith(
            expect.any(String),
            ['%BrOwN%']
        );
        });

        it('should search name, description, and category', async () => {
        db.query.mockResolvedValue({ rows: mockProducts });
        
        await getProductsBySearch('handmade');
        
        expect(db.query).toHaveBeenCalledWith(
            expect.stringMatching(/name ILIKE \$1 OR description ILIKE \$1 OR category ILIKE \$1/i),
            ['%handmade%']
        );
        });
          
        it('should sort by price ascending', async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
          
            await getProductsBySearch('leather', 'price', 'asc');
          
            expect(db.query).toHaveBeenCalledWith(
              expect.stringContaining('ORDER BY price ASC'),
              ['%leather%']
            );
          });
          
        it('should ignore invalid sort columns', async () => {
            db.query.mockResolvedValue({ rows: mockProducts });
            
            await getProductsBySearch('belt', 'invalid_column', 'asc');
            
            // Should not append ORDER BY for invalid columns
            expect(db.query).toHaveBeenCalledWith(
                expect.not.stringContaining('ORDER BY'),
                ['%belt%']
            );
        });
        
        it('should return empty array if no matches found', async () => {
            db.query.mockResolvedValue({ rows: [] });
          
            const result = await getProductsBySearch('nonexistent');
            expect(result).toEqual([]);
          });
          
        it('should throw errors properly', async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            db.query.mockRejectedValue(new Error('DB error'));
          
            await expect(getProductsBySearch('test')).rejects.toThrow('DB error');

            consoleErrorSpy.mockRestore();
        });
    })
})    
