import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getUserAddress } from "../services/addressService.js";

const router = express.Router();

// Add a shipping address to user account
router.post("/shipping-addresses", authenticate, async (req, res) => {
    try{

        const userId = req.user.id;
        const { firstName, lastName, address, city, county, postalCode, phoneNumber } = req.body;

        // Check if user has existing addresses
        const existingAddresses = await db.query(
        'SELECT id FROM shipping_addresses WHERE user_id = $1', 
        [userId]
    );
        // If not, set both default and billing values to true
        const isDefault = existingAddresses.rows.length === 0;
        const isBilling = existingAddresses.rows.length === 0;

        const result = await db.query(
            `INSERT INTO shipping_addresses 
            (user_id, is_default, is_billing, first_name, last_name, address, city, county, postal_code, phone_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [userId, isDefault, isBilling, firstName, lastName, address, city, county, postalCode, phoneNumber]
        );

        res.status(200).json({ message: "Shipping address added successfully", addressId: result.rows[0].id});
    } catch(err) {
        console.error("Error adding shipping adress: ", err);
        res.status(500).json({ error: "Failed to add shipping address."})
    }
});

// Get all shipping addresses from user account
// router.get("/shipping-addresses", authenticate, async (req, res) => {
//     try {
//       const userId = req.user.id;
  
//       const result = await db.query(
//         `SELECT * FROM shipping_addresses WHERE user_id = $1`,
//         [userId]
//       );
  
//       res.json(result.rows);
//     } catch (err) {
//       console.error("Error fetching shipping addresses:", err);
//       res.status(500).json({ error: "Failed to fetch shipping addresses" });
//     }
//   });


// Render page for editing a specific shipping address
router.get("/shipping-address/edit/:id", authenticate, async (req, res) => {
  try {
    const address = await getUserAddress(req.user.id, req.params.id);
    res.render("modify-address.ejs", {
      addressId: req.params.id,
      address: address
    })
    
  } catch(err) {
    console.error("Failed to get shipping address: ", err);
  }
})

// Request for editing a specific shipping address
router.post("/shipping-address/edit/:id", authenticate, async (req, res) => {
    try {
      const { first_name, last_name, address, city, county, country, phone_number, postal_code } = req.body;
      const result = await db.query(
        `UPDATE shipping_addresses
        SET first_name = $1,
        last_name = $2,
        address = $3,
        city = $4,
        county = $5,
        country = $6,
        phone_number = $7,
        postal_code = $8
        WHERE id = $9
        AND user_id = $10
        RETURNING *`,
        [ first_name, last_name, address, city, county, country, phone_number, postal_code, req.params.id, req.user.id ]
      );
      console.log("Updated address:", result.rows[0]);
      res.redirect("/customer/account");
    } catch(err) {
      console.error(err);
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