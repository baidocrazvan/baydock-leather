import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

// Get a user's cart items
router.get("/cart", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = 
        `SELECT products.id AS product_id,
        products.name, products.description, products.price, products.category, products.stock, products.thumbnail, carts.quantity, carts.created_at
        FROM carts JOIN products ON carts.product_id = products.id
        WHERE carts.user_id = $1`
        const result = await db.query(query, [userId]);
        res.json(result.rows);
    } catch(err) {
        console.error("Error fetching cart:", err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
    
});

// Add a product to user's cart
router.post("/cart/:id", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity);

        console.log("Request Body:", req.body); // Log the request body
        console.log("Parsed Quantity:", quantity); // Log the parsed quantity

        // Validate quantity
        if (isNaN(quantity)) {
            return res.status(400).json({ error: "Quantity must be a number."});
        }
        if (quantity <= 0) {
            res.status(400).json({ error: "Quantity must be greater than 0."})
        }

        //Check if product exists
        const product = await db.query(`SELECT * FROM products WHERE id = $1`, [productId]);
        if (product.rows.length === 0) {
            return res.status(404).json({ error: "Product not found"});
        }
        
        // Check if there are enough products in stock
        const stock = product.rows[0].stock;

        // Check if product is already in the cart
        const cartItem = await db.query(`SELECT * FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId]);
        let totalQuantity = quantity;

        // If the product is already in the cart, add the new quantity to existing quantity
        if (cartItem.rows.length > 0) {
            totalQuantity += cartItem.rows[0].quantity;
        }

        // Make sure total quantity does not exceed the stock
        if (totalQuantity > stock) {
            return res.status(400).json({ error: "Not enough products in stock"});
        }

        // Add or update the product in the cart
        if (cartItem.rows.length > 0) {
            // Update existing cart item.
            await db.query(`UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3`, [totalQuantity, userId, productId])
        } else {
            // Insert new cart item
            await db.query(`INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)`, [userId, productId, quantity]);
        }
        //Return success response
        res.status(201).json({ message: "Products added to cart"});

    } catch(err) {
        console.error("Error adding product to cart:", err);
        res.status(500).json({ error: "Failed to add to cart "});
    }
});

// Update the quantity of a product already in cart
router.put("/cart", async (req, res) => {
    try {
       const userId = req.user.id
        const { productId, quantity } = req.body;

        // Check that new quantity is greater than zero
        if (quantity <= 0) {
            return res.status(400).json({ error: "Quantity must be greater than zero."});
        }

        // Check that the item we plan on updating exists
        const cartItem = await db.query(`SELECT * FROM carts WHERE user_id = $1 AND product_id = $2`,
            [userId, productId]);
        if (cartItem.rows.length === 0) {
            return res.status(404).json({ error: "Product not found in cart" });
        }

        // Check that there are enough products in stock before changing the quantity
        const stock = cartItem.rows[0].stock;
        if (quantity > stock) {
            res.status(400).json({error: "You cannot add more to cart because there is not enough stock"});
        }

        // Update the quantity in the cart
        await db.query(`UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3`, [quantity, userId, productId]);

        //Return success response
        res.json({ message: "Cart updated successfully"});

    } catch(err) {
        console.error("Error updating cart:", err);
        res.status(500).json({ error: "Failed to update product quantity"});
    }
    
}); 

// Delete a product from user cart
router.delete("/cart/:id", authenticate, async (req, res) => {
    try {

    const userId = req.user.id;
    const productId = req.body.productId;

    //Check that the item exists inside the cart
    const cartItem = await db.query(`SELECT * FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId]); 
    if (cartItem.rows.length === 0) {
       return res.status(404).json({ error: "Product doesn't exist inside user's cart" });
    }

    // Delete the product from user's cart
    await db.query(`DELETE FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId])
    res.json({ message: "Product removed from cart successfully" });
   } catch(err) {
        console.error("Error: ", err);
        res.status(500).json({ error: "Failed to delete cart item"});
    }
    
})

// Empty the cart

router.delete("/cart", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const cartItems = await db.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
        if (cartItems.rows.length === 0) {
            return res.status(404).json({ error: "No products inside cart"});
        }

        await db.query(`DELETE FROM carts WHERE user_id = $1`, [userId]);
        res.json({ message: "Products succesfully removed from cart"});
    } catch(err) {
        console.error("Failed to delete cart contents: ", err);
    }
})

export default router;