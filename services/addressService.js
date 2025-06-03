import db from "../db.js";

// Get all (active) addresses from user account
export async function getActiveUserAddresses(userId) {
  try {
    const result = await db.query(
      `SELECT * FROM shipping_addresses WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );
    return result.rows;
  } catch (err) {
    console.error("DB failed to get shipping addresses:", err);
    throw err;
  }
}

// Get ALL(both active and inactive) existing addresses from user account (for admin view)
export async function getAllUserAddresses(userId) {
  try {
    const result = await db.query(
      `SELECT * FROM shipping_addresses WHERE user_id = $1`,
      [userId],
    );
    return result.rows;
  } catch (err) {
    console.error("DB failed to get shipping addresses:", err);
    throw err;
  }
}

// Get a specific (active) shipping address from user account
export async function getUserAddress(userId, addressId) {
  try {
    const result = await db.query(
      `SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [addressId, userId],
    );
    if (!result.rows[0]) {
      throw new Error("ADDRESS_NOT_FOUND");
    }
    return result.rows[0];
  } catch (err) {
    console.error("DB failed to get shipping address:", err);
    throw err;
  }
}
