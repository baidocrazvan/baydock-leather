import db from '../db.js';

// Validate user's quantity input
export function validateQuantity(quantity) {
    if (isNaN(quantity)) throw new Error("Quantity must be a number.");
    if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
}

// Fetch all products from user's cart in order of latest added
export async function getCartData(userId) {
    const query = 
        `SELECT 
        p.id,
        p.name,
        p.price,
        p.stock,
        p.thumbnail,
        c.quantity,
        (p.price * c.quantity) AS total_price
        FROM carts c 
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC`

    try {
        const cartItems = await db.query(query, [userId]);
        const cartTotal = cartItems.rows.reduce(
            (sum, item) => sum + parseFloat(item.total_price),
            0
        ).toFixed(2);
        
        return {
            items: cartItems.rows,
            total: cartTotal
        };

    } catch(err) {
        console.error("Error getting cart products from database:", err);
        throw new Error("Failed to fetch cart items");
    }
    
}

// Add or update cart item with transaction
export async function updateCartItem(userId, productId, quantity) {
    // Get a client from pool
    const client = await db.connect();
    try {
        await client.query("BEGIN");

        // Get product stock from db
        const stockResult = await client.query(
            // use FOR UPDATE to lock row and prevent race condition
            `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
            [productId]
        );
        if (!stockResult.rows[0]) throw new Error("Product not found");
        const stock = stockResult.rows[0].stock;

        // Check if product is already in cart
        const cartResult = await client.query(
            // use FOR UPDATE again to prevent race condition
            `SELECT quantity FROM carts WHERE user_id = $1 AND product_id = $2 FOR UPDATE`,
            [userId, productId]
        );

        const existingItem = cartResult.rows[0];
        let totalQuantity = quantity;

        if (existingItem) {
            // If product already exists in cart, add it's quantity from cart to recently chosen quantity
            totalQuantity += existingItem.quantity;
            if (totalQuantity > stock) throw new Error("Not enough products in stock");
            
            await client.query(
                `UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3`,
                [totalQuantity, userId, productId]
            );
        } else {
            if (quantity > stock) throw new Error("Not enough products in stock");
            
            await client.query(
                `INSERT INTO carts (user_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [userId, productId, quantity]
            );
        }

        await client.query("COMMIT");
        return { message: "Product added to cart" };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        // Return client to pool
        client.release();
    }
}

// Update product quantity from inside the cart using transaction
export async function updateCartQuantity(userId, productId, newQuantity) {
    const client = await db.connect(); // For transaction
    try {
        await client.query('BEGIN');

        validateQuantity(newQuantity);

        // Check that the item we plan on updating exists and get it's stock
        const cartItem = await client.query(
            `SELECT c.*, p.stock 
            FROM carts c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1 AND c.product_id = $2`,
            [userId, productId]
            );
            if (cartItem.rows.length === 0) {
            throw new Error("Product not found in cart.");
            }

            // Check stock (assuming `stock` is available in the cart query)
        const stock = cartItem.rows[0].stock;
        if (newQuantity > stock) {
            throw new Error(`Only  ${stock} units available in stock.`);
        }

        // Update quantity
        await client.query(
            `UPDATE carts SET quantity = $1 WHERE user_id = $2 AND product_id = $3`,
            [newQuantity, userId, productId]
            );
        
        await client.query('COMMIT');

        } catch(err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            // Release client
            client.release();
          }
}