import db from "../db.js";

// Get all products, with or without sort query - for user routes

export async function getAllProducts(sort, order = "asc", minPrice, maxPrice) {
  try {
    let query = `SELECT * FROM products WHERE is_active = TRUE`;
    const params = [];
    let paramCount = 1;

    // Add price range filtering if provided
    if (minPrice && maxPrice) {
      query += ` AND price >= $${paramCount++} AND price <= $${paramCount++}`;
      params.push(minPrice, maxPrice);
    }

    // Check if sort query exists and is valid
    const validSortColumns = ["price", "created_at"];
    if (sort && validSortColumns.includes(sort)) {
      // Add sort value and order to query if it is
      query += ` ORDER BY ${sort} ${order === "desc" ? "DESC" : "ASC"}`;
    }

    const result = await db.query(query, params);
    return result.rows;
  } catch (err) {
    console.error("Error getting products: ", err);
  }
}

// Get specific product by ID - for both user and admin routes
export async function getProductById(productId) {
  try {
    const result = await db.query(`SELECT * FROM products WHERE id = $1`, [
      productId,
    ]);
    return result.rows[0];
  } catch (err) {
    console.error("Error getting product:", err);
  }
}

// Get all products by category - for user routes
export async function getProductsByCategory(
  category,
  sort,
  order = "asc",
  minPrice,
  maxPrice
) {
  try {
    let query = `SELECT * FROM products WHERE CATEGORY = $1 AND is_active = TRUE`;
    const params = [category];
    let paramCount = 2;

    if (minPrice && maxPrice) {
      query += ` AND price >= $${paramCount++} AND price <= $${paramCount++}`;
      params.push(minPrice, maxPrice);
    }

    // Check if sort query exists and is valid
    const validSortColumns = ["price", "created_at"];
    if (sort && validSortColumns.includes(sort)) {
      // Add sort value and order to query if it is
      query += ` ORDER BY ${sort} ${order === "desc" ? "DESC" : "ASC"}`;
    }

    const result = await db.query(query, params);
    return result.rows;
  } catch (err) {
    console.error(err);
  }
}

// Get a product by search term - for user routes
export async function getProductsBySearch(
  search,
  sort,
  order = "asc",
  minPrice,
  maxPrice
) {
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

    // Check if sort query exists and is valid
    const validSortColumns = ["price", "created_at"];
    if (sort && validSortColumns.includes(sort)) {
      // Add sort value and order to query if it is
      query += ` ORDER BY ${sort} ${order === "desc" ? "DESC" : "ASC"}`;
    }

    const result = await db.query(query, params);
    return result.rows;
  } catch (err) {
    console.error("Search failed:", err);
    throw err;
  }
}

// Create product function

export async function createProduct(productData) {
  // Add size options based on category
  let sizeOptions = null;
  if (["belts", "watchstraps"].includes(productData.category)) {
    sizeOptions =
      productData.category === "belts"
        ? [
            "80cm",
            "85cm",
            "90cm",
            "95cm",
            "100cm",
            "105cm",
            "110cm",
            "115cm",
            "120cm",
          ]
        : ["14mm", "16mm", "18mm", "20mm", "22mm"];
  }

  const result = await db.query(
    `INSERT INTO products
    (name, description, detailed_description, price, category, stock, images, thumbnail, size_options)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      productData.name,
      productData.description,
      productData.detailed_description,
      productData.price,
      productData.category,
      productData.stock,
      productData.images,
      productData.thumbnail,
      sizeOptions,
    ]
  );

  return result.rows[0];
}
