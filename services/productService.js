import db from '../db.js'

// Get all products

export async function getAllProducts() {
    try {
        const result = await db.query(`SELECT * FROM PRODUCTS`);
        return result.rows;
    } catch(err) {
        console.error("Error getting products: ", err);
    }
}

export async function getProductById(productId) {
    try{
        const result = await db.query(`SELECT * FROM products WHERE id = $1`, [productId]);
        return result.rows[0];
    } catch(err) {
        console.error("Error getting product:", err);
    }
}