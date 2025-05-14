import db from '../db.js'

// Get all products, with or without sort query - for user routes

export async function getAllProducts(sort, order = 'asc', minPrice, maxPrice) {
    try {

        let query = `SELECT * FROM products WHERE is_active = TRUE`;
        const params = [];
        let paramCount = 1;

        // Add price range filtering if provided
        if (minPrice && maxPrice) {
            query += ` AND price >= $${paramCount++} AND price <= $${paramCount++}`
            params.push(minPrice, maxPrice);
        }

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, params);
        return result.rows;

    } catch(err) {
        console.error("Error getting products: ", err);
    }
}

// Get specific product by ID - for both user and admin routes
export async function getProductById(productId) {
    try{
        const result = await db.query(`SELECT * FROM products WHERE id = $1`, [productId]);
        return result.rows[0];
    } catch(err) {
        console.error("Error getting product:", err);
    }
}


// Get all products by category - for user routes
export async function getProductsByCategory(category, sort, order = 'asc', minPrice, maxPrice) {
    try {
        let query = `SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE`;
        const params = [category];
        let paramCount = 2;

         if (minPrice && maxPrice) {
            query += ` AND price >= $${paramCount++} AND price <= $${paramCount++}`;
            params.push(minPrice, maxPrice);
        }

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, params);
        return result.rows;

    } catch(err) {
        console.error(err);
    }
}

// Get a product by search term - for user routes
export async function getProductsBySearch(search, sort, order = 'asc', minPrice, maxPrice) {
    try {
        const searchTerm = `%${search}%`;
        let query = `SELECT * FROM products 
        WHERE (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
        AND is_active = TRUE`;
        let params = [searchTerm];
        let paramCount = 2;

        if (minPrice && maxPrice) {
            query += ` AND price >= $${paramCount++} AND price <= $${paramCount++}`;
            params.push(minPrice, maxPrice);
        }

        // check if sort query exists and is valid
        const validSortColumns = ['price', 'created_at'];
        if (sort && validSortColumns.includes(sort)) {
            // add sort value and order to query if it is
            query += ` ORDER BY ${sort} ${order === 'desc' ? 'DESC' : 'ASC'}`;
        }

        const result = await db.query(query, params)
        console.log("search query: ", query);
        console.log("params: ", params);
        console.log("paramcount: ", paramCount);
        console.log("Search term used:", searchTerm);
        console.log("Filtered by search:", result.rows);
        return result.rows;
    } catch(err) {
        console.error("Search failed:", err);
        throw err;
    }
}