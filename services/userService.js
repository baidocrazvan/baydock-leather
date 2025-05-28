import db from '../db.js';
import { getAllUserAddresses } from "./addressService.js";

// Get all users from db
export async function getAllUsers(search = '', limit = 10, offset = 0) {
    let query = `
      SELECT id, first_name, last_name, email, created_at, role
      FROM users
    `;

    let params = [];

    if (search) {
      query += `
        WHERE id::TEXT LIKE $1 
        OR LOWER(first_name) LIKE $1 
        OR LOWER(last_name) LIKE $1 
        OR LOWER(email) LIKE $1
      `;
      params.push(`%${search.toLowerCase()}%`);
    }

    query += `
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    // Get paginated results
    const result = await db.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users${search ? ` WHERE id::TEXT LIKE $1 OR LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 OR LOWER(email) LIKE $1` : ''}`;
    const countResult = await db.query(countQuery, search ? [`%${search.toLowerCase()}%`] : []);

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
}

// Get a specific user's information
export async function getUserDetails(userId) {
  // Get user basic info
    const user = await db.query(
      `SELECT * FROM users WHERE id = $1`, [userId]);

    if (!user.rows[0]) {
      throw new Error(`User ${userId} not found`); // Domain-specific error
    }

    // Get all addresses
    const addresses = await getAllUserAddresses(userId);

    // Get all orders
    const orders = await db.query(
      `SELECT 
        o.id, o.status, o.total_price, o.created_at,
        sa.city, sa.county
        FROM orders o
        JOIN shipping_addresses sa ON o.shipping_address_id = sa.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC`,
        [userId]);

    return {
        user: user.rows[0],
        addresses: addresses,
        orders: orders.rows
    };  
}

export async function isEmailAlreadyRegistered(email) {
  const result = await db.query(
    `SELECT 1 FROM users WHERE email = $1 AND is_confirmed = TRUE`,
    [email]
  );
  return result.rows.length > 0;
}