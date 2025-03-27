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