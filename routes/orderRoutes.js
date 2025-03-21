import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import {
    calculateTotalPrice,
    createOrder,
    addOrderItems,
    clearCart,
    updateProductStock,
 } from "../services/orderService.js";

const router = express.Router();

// Get a user's order history
router.get("/orders", (req, res) => {

}); 

// Get details of a specific order
router.get("/orders/:id", (req, res) => {

}); 

// Place an order using transactions
router.post("/orders", authenticate, async (req, res) => {
    const client = await db.connect(); // Get a client from the pool
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const shippingAddress = req.body.shippingAddress;
        
        // Check if cart is empty
        const cartItems = await db.query("SELECT * FROM carts WHERE user_id = $1", [userId]);
        if (cartItems.rows.length === 0) {
            // Rollback transaction if cart is empty
            await client.query('ROLLBACK'); 
            return res.status(400).json({ error: "Cart is empty" });
        }

        // Check if there is enough stock before sending the order (some products may be sold after user has added them to his cart)
        const checkStock = await db.query(
            `SELECT p.name FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1 AND c.quantity > p.stock`,
            [userId]
          );
          if (checkStock.rows.length > 0) {
            // Rollback transaction if not enough stock
            await client.query('ROLLBACK'); 
            return res.status(400).json({
                error: "There is not enough quantity in stock for these items: ",
                items: checkStock.rows, 
            });
          }

        // Calculate the total price
        const totalPrice = await calculateTotalPrice(userId);

        // Create order
        const orderId = await createOrder(userId, shippingAddress, totalPrice);

        // Move items from carts table to order_items table
        await addOrderItems(orderId, userId);

        // Update product stock
        await updateProductStock(userId);

        // Clear the cart
        await clearCart(userId);

        // If every step worked, commit transaction
        await client.query('COMMIT') 
        res.status(201).json({ message: "Order sent successfully.", orderId });

        } catch(err) {
            // Rollback transaction if err
            await client.query('ROLLBACK');
            console.error("Error creating order: ", err);
            res.status(500).json({error: "Failed to create order" });

        } finally {
            // Release client back to the pool
            client.release();
        }
        
})

export default router;