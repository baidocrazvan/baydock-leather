import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import {
    calculateTotalPrice,
    createOrder,
    addOrderItems,
    clearCart,
    updateProductStock,
    getOrderDetails
 } from "../services/orderService.js";

const router = express.Router();

// Get a user's order history, after join group result by order and shipping details, order by creation date
router.get("/history", authenticate, async (req, res) => {
    
  try {
      const userId = req.user.id;
      const result = await db.query(
          `SELECT
             o.id AS order_id,
             o.status AS order_status,
             o.created_at AS order_date,
             o.total_price AS order_total,
             sa.first_name,
             sa.last_name
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
          req.flash("error", "Failed to get order history");
          return res.render("/user/account");
        }

        // Format the response
      const orders = result.rows.map(row => ({
      orderId: row.order_id,
      orderStatus: row.order_status,
      orderDate: new Date(row.order_date).toLocaleDateString(),
      orderTotal: row.order_total,
      shippingAddress: {
        firstName: row.first_name,
        lastName: row.last_name,
      }
    }));

    res.render("orders/order-history.ejs", { orders } );
        
  } catch(err) {
      console.error("Error getting order history: ", err);
      return res.render("/user/account");
  }
}); 

// GET page containing all the details of a specific order for authenticated user with ownership validation
router.get("/:id", authenticate, async (req, res) => {
    try {
      const order = await getOrderDetails(req.params.id, req.user.id);

      res.render('orders/order.ejs', {
        order,
        sameAddress: order.shippingAddress.street === order.billingAddress.street,
        user: req.user
      });

    } catch(err) {
        console.error("GET Error getting order by id: ", err);
        req.flash("error", "Failed to load order details");
        res.redirect("/orders");
    }
    
}); 

// Place an order using transactions
router.post("/new-order", authenticate, async (req, res) => {

    // Get a client from the pool
    const client = await db.connect(); 
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const { shippingAddressId, billingAddressId, paymentMethod } = req.body;
        
        // Validate shipping and billing address
        const shippingAddress = await client.query(
        `SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2`,
        [shippingAddressId, userId]
        );
        // Rollback the transaction if shipping address does not exist or does not have is_shipping set to true
        if (shippingAddress.rows.length === 0 || !shippingAddress.rows[0].is_shipping) {
            await client.query('ROLLBACK');
            req.flash('error', "Invalid shipping address"); 
            return res.redirect("/cart/checkout");
        }

        // Check billing address if different from shipping address
        if (billingAddressId && billingAddressId !== shippingAddressId) {
          const billingAddress = await client.query(
          `SELECT * FROM shipping_addresses WHERE id = $1 and user_id = $2`,
          [billingAddressId, userId]
        );
        // Rollback the transaction if billing address does not exist or does not have is_billing set to true
        if (billingAddress.rows.length === 0 || !billingAddress.rows[0].is_billing) {
            await client.query('ROLLBACK');
            req.flash('error', "Invalid shipping address"); 
            return res.redirect("/cart/checkout");
        }
        }
        

        // Check if cart is empty
        const cartItems = await db.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
        if (cartItems.rows.length === 0) {
            // Rollback transaction if cart is empty
            await client.query('ROLLBACK'); 
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
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
            req.flash('error', `Not enough stock for: ${outOfStockItems}`);
            return res.redirect('/cart');
          }

        // Calculate the total price
        const totalPrice = await calculateTotalPrice(userId);

        // Create order
        const orderId = await createOrder(userId, totalPrice, shippingAddressId, billingAddressId, paymentMethod);

        // Move items from carts table to order_items table
        await addOrderItems(orderId, userId);

        // Update product stock
        await updateProductStock(userId);

        // Clear the cart
        await clearCart(userId);

        // If every step worked, commit transaction
        await client.query('COMMIT') 
        req.flash('success', 'Order placed successfully!');
        res.redirect(`/orders/${orderId}`);

        } catch(err) {
            // Rollback transaction if err
            await client.query('ROLLBACK');
            console.error("Error creating order: ", err);
            req.flash('error', 'Failed to create order. Please try again.');
            res.redirect('/cart/checkout');
        } finally {
            // Release client back to the pool
            client.release();
        }
        
})

// TODO: Add route that can make admin change order status from PENDING

export default router;