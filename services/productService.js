import db from '../db.js'

// Get all products, with or without sort query

export async function getAllProducts(sort, order = 'asc') {
    try {

        let query = `SELECT * FROM products`;

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
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
        let query = `SELECT * FROM products WHERE CATEGORY = $1`;

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, [category]);
        return result.rows;

    } catch(err) {
        console.error(err);
    }
}

export async function getProductsBySearch(search, sort, order = 'asc') {
    try {
        const searchTerm = `%${search}%`;
        let query = `SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1`

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, [searchTerm])
        console.log("Search term used:", searchTerm);
        console.log("Filtered by search:", result.rows);
        return result.rows;
    } catch(err) {
        console.error("Search error:", err);
        throw err; // Don't swallow errors
    }
}