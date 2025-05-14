import db from '../db.js';

// Validate user's quantity input
export function validateQuantity(quantity) {
    if (isNaN(quantity)) throw new Error("Quantity must be a number.");
    if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
}

// Fetch all products from user's cart in order of latest added
export async function getCartData(userId) {
    const client = await db.connect();
    const query = 
        `SELECT 
        p.id,
        p.name,
        p.price,
        p.stock,
        p.thumbnail,
        p.is_active,
        c.quantity,
        (p.price * c.quantity) AS total_price
        FROM carts c 
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC`

    try {
        await client.query("BEGIN");
        const cartItems = await client.query(query, [userId]);

        let removedItems = 0;
        let adjustedItems = 0;
        let deactivatedItems = 0;

         // Process each item
        for (const item of cartItems.rows) {
            if (!item.is_active || item.stock <= 0) {
                // Remove items from cart if they are deactivated or out of stock
                await client.query(
                    `DELETE FROM carts 
                     WHERE user_id = $1 AND product_id = $2`,
                    [userId, item.id]
                );
                removedItems++;;
                if (!item.is_active) deactivatedItems++;
            } 
            else if (item.quantity > item.stock) {
                // Adjust quantity if stock is insufficient but exists
                await client.query(
                    `UPDATE carts SET quantity = $1 
                     WHERE user_id = $2 AND product_id = $3`,
                    [item.stock, userId, item.id]
                );
                adjustedItems++;
            }
        }

        await client.query("COMMIT");

        // Filter out removed items 
        const validatedItems = cartItems.rows
            .filter(item => item.is_active && item.stock > 0)
            .map(item => ({
                ...item,
                quantity: Math.min(item.quantity, item.stock),
            }));

        // Calculate cart total
        const cartTotal = validatedItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        ).toFixed(2);

        // Generate message
        let message = null;
        let messages = [];
        if (removedItems > 0 || adjustedItems > 0) {
            if (deactivatedItems > 0) {
                messages.push(`${deactivatedItems} ${deactivatedItems === 1 ? 'item' : 'items'} removed because they were deactivated`);
            }
            if (removedItems - deactivatedItems > 0) {
                messages.push(`${removedItems - deactivatedItems} ${removedItems - deactivatedItems === 1 ? 'item' : 'items'} removed because they are out of stock`);
            }
            if (adjustedItems > 0) {
                messages.push(`${adjustedItems} ${adjustedItems === 1 ? 'item quantity' : 'item quantities'} adjusted because of limited stock`);
            }
            message = messages.join(' and ');
        }

        message = messages.join(" and ");
        return {
            items: validatedItems,
            total: cartTotal,
            message
        };

    } catch(err) {
        await client.query('ROLLBACK');
        console.error("Cart validation error:", err);
        throw err; 
    } finally {
        client.release();
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

            // Check stock 
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