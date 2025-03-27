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

// Get specific product by ID
export async function getProductById(productId) {
    try{
        const result = await db.query(`SELECT * FROM products WHERE id = $1`, [productId]);
        return result.rows[0];
    } catch(err) {
        console.error("Error getting product:", err);
    }
}


// Get all products by category

export async function getProductsByCategory(category) {
    try {

        const result = await db.query(
            `SELECT * FROM products WHERE category = $1`,
            [category]
        );
        console.log(result.rows);
        return result.rows;        

    } catch(err) {
        console.error(err);
    }
}