import db from '../db.js';

// Validate user's quantity input
export function validateQuantity(quantity) {
    if (isNaN(quantity)) throw new Error("Quantity must be a number.");
    if (quantity <= 0) throw new Error("Quantity must be greater than 0.");
}

// Add or update cart item with transaction
export async function updateCartItem(userId, productId, quantity) {
    // Get item from pool
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