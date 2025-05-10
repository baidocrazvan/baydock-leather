import db from '../db.js'

// Get all orders (for admin) 
export async function getAllOrders(searchTerm = '', limit = 10, offset = 0) {
  try {
    let query = `
      SELECT
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
    `;
    
    let params = [];
    
    if (searchTerm) {
      query += ` WHERE o.id::TEXT LIKE $1`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Get paginated results
    const result = await db.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM orders${searchTerm ? ` WHERE id::TEXT LIKE $1` : ''}`;
    const countResult = await db.query(countQuery, searchTerm ? [`%${searchTerm}%`] : []);
    
    return {
      orders: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  } catch(err) {
    throw new Error(err);   
  }
}
