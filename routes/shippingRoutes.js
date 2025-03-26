import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

// Add a shipping address to user account
router.post("/shipping-addresses", authenticate, async (req, res) => {
    try{

        const userId = req.user.id;
        const { firstName, lastName, address, city, county, postalCode, phoneNumber } = req.body;
        const result = await db.query(
            `INSERT INTO shipping_addresses 
            (user_id, first_name, last_name, address, city, county, postal_code, phone_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [userId, firstName, lastName, address, city, county, postalCode, phoneNumber]
        );

        res.status(200).json({ message: "Shipping address added successfully", addressId: result.rows[0].id});
    } catch(err) {
        console.error("Error adding shipping adress: ", err);
        res.status(500).json({ error: "Failed to add shipping address."})
    }
});

// Get all shipping addresses from user account
router.get("/shipping-addresses", authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
  
      const result = await db.query(
        `SELECT * FROM shipping_addresses WHERE user_id = $1`,
        [userId]
      );
  
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching shipping addresses:", err);
      res.status(500).json({ error: "Failed to fetch shipping addresses" });
    }
  });


// Get a specific shipping address from user account
router.get("/shipping-addresses/:id", authenticate, async (req, res) => {
  try {

    const userId = req.user.id;
    const result = await db.query(`SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
    res.json(result.rows[0]);
    
  } catch(err) {
    console.error("Failed to get shipping address: ", err);
  }
})

  // TO DO: Add delete route to delete shipping addresses()

router.delete("/shipping-addresses/:id", authenticate, async (req, res) => {
  try {

    const userId = req.user.id;
    await db.query(`DELETE FROM shipping_addresses WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
    res.status(201).json("Address deleted successfully.");

  } catch(err) {
    console.error("Failed to delete shipping address:" , err);
  }
})

  export default router;