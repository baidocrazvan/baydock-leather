import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { validateQuantity, getCartItems, updateCartItem, updateCartQuantity } from "../services/cartService.js"

const router = express.Router();

// Get a user's cart items
router.get("/", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItems = await getCartItems(userId);
        
        // Get total order price  
        const cartTotal = cartItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        )  
        // Get total order price with .reduce() to
        const totalOrderPrice = cartItems
        res.render("cart.ejs", {
            cartItems,
            cartTotal
        })

        
    } catch(err) {
        console.error("Cart error:", err.message);
        req.flash('error', "Cart cannot be loaded at this moment. Please try again.");
        res.redirect("/");
    }
    
});

// Add a product to user's cart
router.post("/:id", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity)) throw new Error("Invalid quantity");

        console.log("Request Body:", req.body); // Log the request body
        console.log("Parsed Quantity:", quantity); // Log the parsed quantity
        console.log("Product id:", productId); // Log product id

        // Validate quantity
        validateQuantity(quantity);

        // If the product is already in the cart, add the new quantity to existing quantity, otherwise just add product to cart
        await updateCartItem(userId, productId, quantity);

        req.flash('success', 'Product added to cart!');
        res.redirect(`/products/${productId}`);

    } catch(err) {
        console.error("Cart error:", err.message);
        req.flash('error', err.message);
        res.redirect(`/products/${req.params.id}`);
    }
});

// Update the quantity of a product already in cart
router.put("/", authenticate, async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user.id;
    
      await updateCartQuantity(userId, productId, quantity);
  
      req.flash('success', 'Cart updated!');
      res.redirect("/cart");
    } catch (err) {
      console.error("Error updating cart:", err);
      req.flash("error", err.message);
      res.redirect("/cart");
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