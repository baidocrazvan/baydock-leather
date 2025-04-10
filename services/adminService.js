import db from '../db.js'

// Get all orders (for admin) 
export async function getAllOrders() {
    try {

        // Get info about all orders and their associated shipping addresses
        const result = await db.query(
            `SELECT
                o.id AS order_id,
                o.status AS order_status,
                o.created_at AS order_date,
                o.total_price AS order_total,
                o.user_id,
                sa.first_name,
                sa.last_name,
                sa.city,
                sa.county,
                sa.phone_number
             FROM
                orders o
            JOIN
                shipping_addresses sa ON o.shipping_address_id = sa.id
            ORDER BY
                o.created_at DESC`
        );
        
        return result.rows;
    } catch(err) {
        throw new Error("Database error");   
    }
}
