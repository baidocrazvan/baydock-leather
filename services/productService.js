import db from '../db.js'

// Get all products, with or without sort query

export async function getAllProducts(sort, order = 'asc') {
    try {

        let query = `SELECT * FROM products`;

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query);
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
export async function getProductsByCategory(category, sort, order = 'asc') {
    try {
        let query = `SELECT * FROM PRODUCTS WHERE CATEGORY = $1`;

        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, [category]);
        return result.rows;

    } catch(err) {
        console.error(err);
    }
}