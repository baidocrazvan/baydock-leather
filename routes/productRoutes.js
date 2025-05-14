import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getAllProducts, getProductById, getProductsByCategory, getProductsBySearch } from "../services/productService.js";

const router = express.Router();

// Set up storage for image files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "public/images/products");
    },
    filename: (req, file, cb) => {
      const prefix = Date.now() + "-" + Math.round(Math.random() * 100);
      const extension = path.extname(file.originalname);
      cb(null, prefix + extension); // Generate a unique file name.
    },
  });
  const upload = multer({ storage });


// Render all products page
router.get("/", async (req, res) => {
  try {
    let products;

    // filter by category, min-max price, price asc/desc or date added if specified in req.query, otherwise render all products
    const { category, sort, order, search, min_price, max_price } = req.query;

      if (search) {
        products = await getProductsBySearch(search, sort, order, min_price, max_price);
      } else if (category) {
        products = await getProductsByCategory(category, sort, order, min_price, max_price);
      } else {
        products = await getAllProducts(sort, order, min_price, max_price);
      }

    // 404 if there are  no products to be shown.   
    if (!products || products.length === 0) {
      return res.status(404).render("error.ejs", {
        error: 404,
        message: search
        ? `No products found matching "${search}"` 
        : category
            ? `No products found in ${category} category.`
            : "Oops. Seems like there are no items to display yet. Please come back later."
      });
    }
     console.log("Received query params:", req.query);
    res.render("products/list.ejs", {
      products: products,
      currentCategory: category,
      currentSort: sort,
      currentOrder: order,
      search: search,
      min_price: min_price || 0,
      max_price: max_price || 500
    });

  } catch(err) {
    console.error(err);
    return res.status(500).render("error.ejs", {
      message: "Something went wrong on our part. Please try again later."
    });
  }
  
});

// Render specific product page
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await getProductById(id);

    // If user is admin show the product page
    if (req.user?.role === 'admin') {
      return res.render("products/single.ejs", {
        product: product,
        adminPreview: !product.is_active
      });
    }

    // If product doesn't exist or is deactivated by admin
    if (!product || !product.is_active) {
      req.flash('error', 'This product is no longer available');
      return res.redirect('/products');
    }

    res.render("products/single.ejs", {
      product: product
    });

  } catch(err) {
    console.error(err);
    return res.status(500).render("error.ejs", {
      error: "500",
      message: "Something went wrong on our part. Please try again later."
    });
  }
    
   }); 


// Add a new product (admin)
router.post("/", authenticate, isAdmin, upload.fields([
    { name: "thumbnail", maxCount: 1}, // Thumbnail (single file)
    { name: "images", maxCount: 10} // Other images (up to 10 files)
  ]), async (req, res) => {
    
    try {
      const { name, description, detailed_description, price, category, stock } = req.body;
      const thumbnail = `/images/products/${req.files.thumbnail[0].filename}`; // Thumbnail path
      const images = req.files.images.map(file => `/images/products/${file.filename}`); // Array of images paths
      
      // Check if category value is valid
      const validCategories = ['belts', 'wallets', 'bags', 'watchstraps', 'minimalist', 'accessories'];
      if (!validCategories.includes(category)) {
        req.flash('error', 'Invalid product category');
        return res.redirect("/admin/add-product");
      }
      // Save the product to db
      await db.query(`
        INSERT INTO products (name, description, detailed_description, price, category, stock, images, thumbnail)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ name, description, detailed_description, price, category, stock, images, thumbnail]);

      req.flash("success" , "Product added successfully");
      return res.redirect("/admin/dashboard");

    } catch(err) {
      console.error("Error adding product", err);
      req.flash("error", "Error publishing product");
      return res.redirect("/admin/dashboard");
    }
  });


// PATCH for partial update a product (admin)
router.patch("/:id", authenticate, isAdmin, upload.fields([
    { name: "thumbnail", maxCount: 1},
    { name: "images", maxCount: 10}
  ]), async (req, res) => {
  
    const id = req.params.id;
    const { name, description, detailed_description, price, category, stock } = req.body;
    const fields = Object.keys(req.body)
    
    // If photos were uploaded for a patch, add them to the query
    if (req.files) {
      if (req.files.thumbnail) {
        const thumbnail = `/images/products/${req.files.thumbnail[0].filename}`; // Thumbnail path
        fields.push("thumbnail");
        req.body.thumbnail = thumbnail;
      }
      if (req.files.images) {
        const images = req.files.images.map(file => `/images/products/${file.filename}`); // Array of images paths
        fields.push("images");
        req.body.images = images; 
      }
    }
  
    if (fields.length === 0) {
      req.flash("error", "No fields to update");
      return res.redirect("/admin/dashboard");
    }
    
    const mappedQuery = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    console.log(`Generated: ${mappedQuery}`);
  
    const query = {
      text: `UPDATE products SET ${mappedQuery} WHERE id = $${fields.length + 1} RETURNING *`,
      values: [...fields.map((field) => req.body[field]), id]
    }
    console.log(`Query: ${query.text} and ${query.values}`);
    
    try {
      const result = await db.query(query);
      console.log(result.rows);
  
      if (result.rows.length === 0) {
        req.flash("error", "Product not found");
        return res.redirect("/admin/dashboard");
      }

      req.flash("success", "Product updated successfully");
      return res.redirect("/admin/dashboard");

    } catch(err) {
      console.error("PATCH error updating product:", err);
      req.flash("error", "Failed to update product");
      return res.redirect("/admin/dashboard");
    } 
  }); 

  
//Delete a product (admin)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    try{
        await db.query(
            `UPDATE products SET is_active = FALSE WHERE id = $1`,
            [id]
        );
        req.flash("success", "Product deactivated successfully");
        return res.redirect('/admin/products');
    } catch(err) {
        console.error("Product deactivation error:" , err);
        req.flash("error", "Error deactivating product");
        res.redirect("/admin/products");
    }
}); 

// Re-activate a product
router.post("/:id/reactivate", authenticate, isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    try{
      await db.query(
          `UPDATE products SET is_active = TRUE WHERE id = $1`,
          [id]
      );
      req.flash("success", "Product reactivated successfully");
      res.redirect("/admin/products");
    } catch(err) {
        console.error("Product reactivation error:" , err);
        req.flash("error", "Error reactivating product");
        res.redirect("/admin/products");
    }
});

export default router;