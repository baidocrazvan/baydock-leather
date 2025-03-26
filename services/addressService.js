import db from '../db.js'

// Get all addresses from user account
export async function getUserAddresses(userId) {
    try {
        const result = await db.query(
       `SELECT * FROM shipping_addresses WHERE user_id = $1`,
        [userId]
    );
    return result.rows;
    } catch(err) {
        console.error("Error getting user addresses:" , err);
    }
    
} 

// Get a specific shipping address from user account
export async function getUserAddress(userId, addressId) {
    try {
        const result = await db.query(
        `SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2`,
        [addressId, userId]
    );
        return result.rows[0];
    } catch(err) {
        console.err("Failed to get shipping address:" , err);
    }
    
}