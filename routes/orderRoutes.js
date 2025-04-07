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
          return res.status(404).json({ error: "No orders found" });
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

    res.render("order-history.ejs", { orders } );
        
  } catch(err) {
      console.error("Error getting order history: ", err);
  }
}); 

// GET page containing all the details of a specific order for authenticated user with ownership validation
router.get("/:id", authenticate, async (req, res) => {
    try {
      const userId = req.user.id
      const orderId = req.params.id;

      // Check whether the order the user is trying to access belongs to him
      const userOwnershipCheck = await db.query(
        `SELECT id FROM orders
        WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
      );

      if (userOwnershipCheck.rows.length === 0) {
        req.flash("error", "Order not found");
        return res.redirect("/orders/history");
      }

      // Get order id, date, status and price, then shipping address details, billing address details, and product details
      // Use left join in case shipping address is the same as billing address
      const result = await db.query(
          `SELECT
              o.id AS order_id,
              o.status AS order_status,
              o.total_price,
              o.payment_method,
              o.created_at,
              sa.first_name AS shipping_first_name,
              sa.last_name AS shipping_last_name,
              sa.address AS shipping_address,
              sa.city AS shipping_city,
              sa.county AS shipping_county,
              sa.country AS shipping_country,
              sa.postal_code AS shipping_postal_code,
              sa.phone_number AS shipping_phone,
              ba.first_name AS billing_first_name,
              ba.last_name AS billing_last_name,
              ba.address AS billing_address,
              ba.city AS billing_city,
              ba.county AS billing_county,
              ba.country AS billing_country,
              ba.postal_code AS billing_postal_code,
              ba.phone_number AS billing_phone,
              p.id AS product_id,
              p.name AS product_name,
              p.thumbnail,
              oi.quantity,
              oi.price AS product_price
          FROM
              orders o
          JOIN
              shipping_addresses sa ON o.shipping_address_id = sa.id
          LEFT JOIN
              shipping_addresses ba ON o.billing_address_id = ba.id
          JOIN
              order_items oi ON o.id = oi.order_id
          JOIN
              products p ON oi.product_id = p.id
          WHERE
              o.user_id = $1 AND o.id = $2`,
          [userId, orderId]
          );

        if (result.rows.length === 0) {
            req.flash("error", "Order not found.");
            return res.redirect("/orders");
          }
    console.log(result.rows[0].created_at);
    // Transform query results
    const orderDetails = {
    id: result.rows[0].order_id,
    status: result.rows[0].order_status,
    total: result.rows[0].total_price,
    payment: result.rows[0].payment_method,
    date: new Date(result.rows[0].created_at).toLocaleDateString(),
    shippingAddress: {
        name: `${result.rows[0].shipping_first_name} ${result.rows[0].shipping_last_name}`,
        street: result.rows[0].shipping_address,
        city: `${result.rows[0].shipping_city} ${result.rows[0].shipping_county}`,
        country: result.rows[0].shipping_country,
        postalCode: result.rows[0].shipping_postal_code,
        phoneNumber: result.rows[0].shipping_phone_number,
    },
    billingAddress: {
      name: `${result.rows[0].billing_first_name || result.rows[0].shipping_first_name} ${result.rows[0].billing_last_name || result.rows[0].shipping_last_name}`,
        street: result.rows[0].billing_address || result.rows[0].shipping_address,
        city: `${result.rows[0].billing_city || result.rows[0].shipping_city}${result.rows[0].billing_county ? ', ' + result.rows[0].billing_county : result.rows[0].shipping_county ? ', ' + result.rows[0].shipping_county : ''}`,
        country: result.rows[0].billing_country || result.rows[0].shipping_country,
        postalCode: result.rows[0].billing_postal_code || result.rows[0].shipping_postal_code,
        phone: result.rows[0].billing_phone || result.rows[0].shipping_phone
      },
    products: result.rows.map(row => ({
        productId: row.product_id,
        name: row.product_name,
        thumbnail: row.thumbnail,
        quantity: row.quantity,
        price: row.product_price,
        subtotal: (row.quantity * row.product_price).toFixed(2)
    })),
    };
      console.log(orderDetails.date);
      res.render('order.ejs', {
        order: orderDetails,
        sameAddress: orderDetails.shippingAddress.street === orderDetails.billingAddress.street,
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