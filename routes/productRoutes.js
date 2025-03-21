import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";
import { authenticate, isAdmin } from "../middleware/middleware.js";

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


// Get all products
router.get("/products", async (req, res) => {
    try {
      const result = await db.query(`SELECT * FROM products`);
      res.json(result.rows);
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
      
  }); 

// Get a product by id
router.get("/products/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const result = await db.query(`SELECT * FROM products WHERE id = $1`, [id]);
        res.json(result.rows);
    } catch(err) {
        console.error(err);
    }
    }); 


// Add a new product (admin)
router.post("/products", authenticate, isAdmin, upload.fields([
    { name: "thumbnail", maxCount: 1}, // Thumbnail (single file)
    { name: "images", maxCount: 10} // Other images (up to 10 files)
  ]), async (req, res) => {
    
    try {
      const { name, description, price, category, stock } = req.body;
      const thumbnail = `/images/products/${req.files.thumbnail[0].filename}`; // Thumbnail path
      const images = req.files.images.map(file => `/images/products/${file.filename}`); // Array of images paths
      // Save the product to db
      await db.query(`
        INSERT INTO products (name, description, price, category, stock, images, thumbnail)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ name, description, price, category, stock, images, thumbnail]);
      
      res.status(201).json({ message: "Product added successfully", thumbnail, images });
    } catch(err) {
      console.error("Error adding product", err);
      res.status(500).json({error: "Failed to add product" });
    }
  });


// RESTful PATCH for partial update a product
router.patch("/products/:id", authenticate, isAdmin, upload.fields([
    { name: "thumbnail", maxCount: 1},
    { name: "images", maxCount: 10}
  ]), async (req, res) => {
  
    const id = req.params.id;
    const { name, description, price, category, stock } = req.body;
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
     console.log(`Fields to update: ${fields}`);
  
    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update "});
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
        return res.status(404).json({ message: "Product not found"});
      }
      
      res.json(result.rows[0]);
  
    } catch(err) {
      res.status(500).json({ error: "Failed to update product" });
    } 
  }); 


// RESTful PUT for full update of a product
router.put("/products/:id", authenticate, isAdmin, upload.fields([
    { name: "thumbnail", maxCount: 1}, // Thumbnail (single file)
    { name: "images", maxCount: 10} // Other images (up to 10 files)
  ]), async (req, res) => {
    
    const id = req.params.id;
    try {
      const { name, description, price, category, stock } = req.body;
      const thumbnail = `/images/products/${req.files.thumbnail[0].filename}`; // Thumbnail path
      const images = req.files.images.map(file => `/images/products/${file.filename}`); // Array of images paths
      // update product in db
      const result = await db.query(
        `UPDATE products SET name = $1,
        description = $2, price = $3, category = $4,
        stock = $5, thumbnail = $6, images = $7
        WHERE id = $8 
        RETURNING *`,
      [name, description, price, category, stock, thumbnail, images, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      res.json(result.rows[0]);
  
    } catch(err) {
      console.error("Error:", err);
      res.status(500).json({error: "Failed to update product" });
    }
  });
  
  
  //Delete a product (admin)
router.delete("/products/:id", authenticate, isAdmin, (req, res) => {
    const id = req.params.id;
    try{
        const result = db.query(`DELETE FROM products WHERE id = $1`, [id]);
        res.status(200).json({ message: "Product deleted succesfully"});
    } catch(err) {
        console.error(err);
    }

}); 

export default router;