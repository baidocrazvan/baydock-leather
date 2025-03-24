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

// Get details of a specific order
router.get("/orders/:id", authenticate, async (req, res) => {
    try{
        const userId = req.user.id
    const orderId = req.params.id;

    // Get order details
    const result = await db.query(
        `SELECT
            o.id AS order_id,
            o.status AS order_status,
            o.total_price,
            sa.first_name,
            sa.last_name,
            sa.address,
            sa.city,
            sa.county,
            sa.postal_code,
            sa.phone_number,
            p.name AS product_name,
            oi.quantity,
            oi.price AS product_price
        FROM
            orders o
        JOIN
            shipping_addresses sa ON o.shipping_address_id = sa.id
        JOIN
            order_items oi ON o.id = oi.order_id
        JOIN
            products p ON oi.product_id = p.id
        WHERE
            o.user_id = $1 AND o.id = $2`,
        [userId, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Order not found" });
          }

    // Format the response
    const order = {
    orderId: result.rows[0].order_id,
    status: result.rows[0].order_status,
    total: result.rows[0].total_price,
    shippingAddress: {
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        address: result.rows[0].address,
        city: result.rows[0].city,
        county: result.rows[0].county,
        postalCode: result.rows[0].postal_code,
        phoneNumber: result.rows[0].phone_number,
    },
    products: result.rows.map(row => ({
        name: row.product_name,
        quantity: row.quantity,
        price: row.product_price,
    })),
    };
  
      res.json(order);

    } catch(err) {
        console.error("Error getting order: ", err);
    }
    
}); 

// Get a user's order history, after join group result by order and shipping details, order by creation date
// Use json_agg and json_build_object to turn each orders' products into a JSON array.
router.get("/orders", authenticate, async (req, res) => {
    
    try {
        const userId = req.user.id;
        const result = await db.query(
            `SELECT
               o.id AS order_id,
               o.status AS order_status,
               o.created_at AS order_date,
               sa.first_name,
               sa.last_name,
               sa.address,
               sa.city,
               sa.county,
               sa.postal_code,
               sa.phone_number,
               json_agg(json_build_object(
                 'name', p.name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )) AS products
             FROM
               orders o
             JOIN
               shipping_addresses sa ON o.shipping_address_id = sa.id
             JOIN
               order_items oi ON o.id = oi.order_id
             JOIN
               products p ON oi.product_id = p.id
             WHERE
               o.user_id = $1
             GROUP BY
               o.id, sa.first_name, sa.last_name, sa.address, sa.city, sa.county, sa.postal_code, sa.phone_number
             ORDER BY
               o.created_at DESC`,
            [userId]
          );

          if (result.rows.length === 0) {
            return res.status(404).json({ error: "No orders found" });
          }

          // Format the response
        const orders = result.rows.map(row => ({
        orderId: row.order_id,
        status: row.order_status,
        orderDate: row.order_date,
        shippingAddress: {
          firstName: row.first_name,
          lastName: row.last_name,
          address: row.address,
          city: row.city,
          county: row.county,
          postalCode: row.postal_code,
          phoneNumber: row.phone_number,
        },
        products: row.products,
      }));
  
      res.json(orders);
          
    } catch(err) {
        console.error("Error getting order history: ", err);
    }
}); 

// Place an order using transactions
router.post("/orders", authenticate, async (req, res) => {

    // Get a client from the pool
    const client = await db.connect(); 
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const { shippingAddressId } = req.body;
        
        // Check shipping address
        const shippingAddress = await client.query(
        `SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2`,
        [shippingAddressId, userId]
        );
        if (shippingAddress.rows.length === 0) {
            // Rollback the transaction if shipping address does not exist
            await client.query('ROLLBACK'); 
            return res.status(400).json({ error: "Invalid shipping address" });
      }

        // Check if cart is empty
        const cartItems = await db.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
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
        const orderId = await createOrder(userId, shippingAddressId, totalPrice);

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

// TODO: Add route that can make admin change order status from PENDING

export default router;