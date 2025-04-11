import db from '../db.js';
import { getAllUserAddresses } from "./addressService.js";

// Get all users from db
export async function getAllUsers() {
    const result = await db.query(`
      SELECT id, first_name, last_name, email, created_at, role
      FROM users
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

// Get a specific user's information
export async function getUserDetails(userId) {
    // Get user basic info
    const user = await db.query(`
        SELECT * FROM users WHERE id = $1
    `, [userId]);

    // Get all addresses
    const addresses = await getAllUserAddresses(userId);

    // Get all orders
    const orders = await db.query(`
        SELECT 
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