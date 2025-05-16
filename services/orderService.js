import db from '../db.js'

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

// Get a user's lastest 5 orders
export async function getRecentUserOrders(userId) {
    const result = await db.query(
        `SELECT o.id, o.total_price, o.status, o.created_at, sa.first_name, sa.last_name 
        FROM orders o
        JOIN shipping_addresses sa ON o.billing_address_id = sa.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 5`,
        [userId]
    );
    return result.rows;
}

export async function getUserOrders(userId, { limit = 10, offset = 0 } = {}) {
  try {
    const query = `
      SELECT
        o.id AS order_id,
        o.status AS order_status,
        o.created_at AS order_date,
        o.total_price AS order_total,
        sa.first_name,
        sa.last_name,
        sa.city,
        sa.county
      FROM orders o
      JOIN shipping_addresses sa ON o.shipping_address_id = sa.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [userId, limit, offset]);
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1', 
      [userId]
    );
    
    return {
      orders: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  } catch(err) {
    throw new Error(err);
  }
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


// Get a specific order's complete information
export async function getOrderDetails(orderId, userId = null) {
    // If userId is provided, enforce ownership. 
    const ownershipCheck = userId 
        ? await db.query(
            `SELECT id FROM orders WHERE id = $1 AND user_id = $2`, 
            [orderId, userId]
            )
        : { rows: [{ id: orderId }] }; // Mock successfull result for admin bypass

    if (ownershipCheck.rows.length === 0) {
    throw new Error("Order not found or access denied");
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
            o.id = $1`,
        [orderId]
        );

      if (result.rows.length === 0) {
        throw new Error("Order details not found");
        }

    // Transform query results
    return {
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
            phoneNumber: result.rows[0].shipping_phone,
        },
        billingAddress: {
            name: `${result.rows[0].billing_first_name || result.rows[0].shipping_first_name} ${result.rows[0].billing_last_name || result.rows[0].shipping_last_name}`,
            street: result.rows[0].billing_address || result.rows[0].shipping_address,
            city: `${result.rows[0].billing_city || result.rows[0].shipping_city}${result.rows[0].billing_county ? ', ' + result.rows[0].billing_county : result.rows[0].shipping_county ? ', ' + result.rows[0].shipping_county : ''}`,
            country: result.rows[0].billing_country || result.rows[0].shipping_country,
            postalCode: result.rows[0].billing_postal_code || result.rows[0].shipping_postal_code,
            phoneNumber: result.rows[0].billing_phone || result.rows[0].shipping_phone
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
}