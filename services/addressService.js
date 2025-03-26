import db from '../db.js'

export async function getUserAddresses(userId) {
    const result = await db.query(
       `SELECT * FROM shipping_addresses WHERE user_id = $1`,
        [userId]
    );
    return result.rows;
} 