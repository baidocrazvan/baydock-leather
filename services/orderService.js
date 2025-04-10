import db from '../db.js'

// Check if cart is empty

// Get all orders (for admin)
export async function getAllOrders() {
    try {

        // Get info about all orders and their associated shipping addresses
        const result = await db.query(
            `SELECT
                o.id AS order_id,
                o.status AS order_status,
                o.created_at AS order_date,
                o.total_price AS order_total,
                sa.first_name,
                sa.last_name,
                sa.city,
                sa.county,
                sa.phone_number
             FROM
                orders o
            JOIN
                shipping_addresses sa ON o.shipping_address_id = sa.id
            ORDER BY
                o.created_at DESC`
        );
        
        return result.rows;
    } catch(err) {
        console.error("Error getting all orders from db:", err);       
    }
}

// Calculate order total price
export async function calculateTotalPrice(userId) {
    const result = await db.query(
        `SELECT SUM(p.price * c.quantity) AS total_price
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1`,
        [userId]
    );
    return result.rows[0].total_price;
}

// Create entry inside orders table
export async function createOrder(userId, totalPrice, shippingAddressId, billingAddressId, paymentMethod) {
    const result = await db.query(
        `INSERT INTO orders (user_id, total_price, shipping_address_id, billing_address_id, payment_method)
         VALUES($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, totalPrice, shippingAddressId, billingAddressId, paymentMethod]
    );
    // Return order id
    return result.rows[0].id;
}

// Create entry inside order_items table for each item ordered
export async function addOrderItems(orderId, userId) {
    // Get id, quantity and price of items inside the cart
    const cartItems = await db.query(
        `SELECT c.product_id, c.quantity, p.price
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1`,
        [userId]
    );

    for (const item of cartItems.rows) {
        await db.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price)
            VALUES ($1, $2, $3, $4)`,[orderId, item.product_id, item.quantity, item.price]
        );
    }
}

// Update stock inside products table after an order has been placed
export async function updateProductStock(userId) {
    const cartItems = await db.query(
        `SELECT product_id, quantity FROM carts WHERE user_id = $1`,
        [userId]
    );

    for (const item of cartItems.rows) {
        await db.query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.product_id]
        );
    }
}

// Clear user's cart
export async function clearCart(userId) {
    await db.query(
        `DELETE FROM carts WHERE user_id = $1`, [userId]
    );
}