import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

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

  // TO DO: Add delete route to delete shipping addresses()

  export default router;