import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getActiveUserAddresses, getAllUserAddresses, getUserAddress } from "../services/addressService.js";

const router = express.Router();

// GET Render page for adding address
router.get("/shipping-address", authenticate, async (req, res) => {
  res.render("add-address.ejs");
})

// POST Add a shipping address to user account
router.post("/shipping-address", authenticate, async (req, res) => {
    try{

        const userId = req.user.id;
        const { firstName, lastName, address, city, county, postalCode, phoneNumber, fromCheckout } = req.body;

        // Check if user has existing addresses
        const existingAddresses = await db.query(
        'SELECT id FROM shipping_addresses WHERE user_id = $1 AND is_active = TRUE', 
        [userId]
    );
        // If not, set both default and billing values to true
        const isShipping = existingAddresses.rows.length === 0;
        const isBilling = existingAddresses.rows.length === 0;

        const result = await db.query(
            `INSERT INTO shipping_addresses 
            (user_id, is_shipping, is_billing, first_name, last_name, address, city, county, postal_code, phone_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [userId, isShipping, isBilling, firstName, lastName, address, city, county, postalCode, phoneNumber]
        );

        req.flash("success", "Address added successfully")
        if (fromCheckout) {
          return res.redirect("/cart/checkout");
        } else {
          return res.redirect("/customer/account")
        }

        
    } catch(err) {
        console.error("POST error /shipping-address when adding shipping adress: ", err);
        req.flash("error", "Unable to add address")
        return res.redirect("/");
    }
});


// GET Render page for editing a specific shipping address
router.get("/shipping-address/edit/:id", authenticate, async (req, res) => {
  try {
    const address = await getUserAddress(req.user.id, req.params.id);
    res.render("modify-address.ejs", {
      addressId: req.params.id,
      address: address
    })
    
  } catch(err) {
    console.error("GET error failed to get specific shipping address: ", err);

    if (err.message === 'ADDRESS_NOT_FOUND') {
      req.flash('error', 'Address not found or no longer available');
      return res.redirect('/customer/addresses');
    }

    req.flash('error', 'Failed to load address');
    res.redirect('/customer/addresses');
  }
})

// PUT Request for editing a specific shipping address
router.put("/shipping-address/edit/:id", authenticate, async (req, res) => {
    try {
      const { 
      first_name,
      last_name,
      address, city,
      county, country,
      phone_number,
      postal_code,
      is_shipping,
      is_billing
    } = req.body;

    //Convert checkbox values to bool

    const isShipping = is_shipping === "on";
    const isBilling = is_billing === "on";

    // Grab a client from pg pool and use transaction to update address
    const client = await db.connect();
      try {
        // If needed, reset shipping address status
        if (isShipping) {
          await client.query(
            `UPDATE shipping_addresses 
            SET is_shipping = false 
            WHERE user_id = $1 AND is_shipping = true AND id != $2`,
            [req.user.id, req.params.id]
          );
        }

        // If needed, reset billing address status defaults
        if (isBilling) {
          await client.query(
            `UPDATE shipping_addresses 
            SET is_billing = false 
            WHERE user_id = $1 AND is_billing = true AND id != $2`,
            [req.user.id, req.params.id]
          );
        }
          // Update the address
        const result = await client.query(
          `UPDATE shipping_addresses
          SET first_name = $1,
          last_name = $2,
          address = $3,
          city = $4,
          county = $5,
          country = $6,
          phone_number = $7,
          postal_code = $8,
          is_shipping = $9,
          is_billing = $10,
          updated_at = NOW()
          WHERE id = $11
          AND user_id = $12
          RETURNING *`,
          [ 
            first_name,
            last_name,
            address,
            city, county,
            country,
            phone_number,
            postal_code,
            isShipping,
            isBilling,
            req.params.id,
            req.user.id 
          ]
        );

        await client.query('COMMIT');
        req.flash("success", "Address updated successfully");
        res.redirect("/customer/addresses");

      } catch(err) {
        await client.query("ROLLBACK");
        throw err;  
      } finally {
        client.release();
      }
    
    } catch(err) {
      console.error("PUT error updating address:" , err);
      req.flash('error', 'Failed to update address');
      res.redirect("/customer/addresses");
    }
})

// PATCH route for changing default shipping/billing address at checkout
router.patch("/shipping-address/default", authenticate, async (req, res) => {
    const userId = req.user.id;
    const { shippingAddressId, billingAddressId } = req.body;

    try {
      // Set all addresses to non-default
      await db.query(
        `UPDATE shipping_addresses
        SET is_shipping = false, is_billing = false
        WHERE user_id = $1`,
        [userId]
      );

      // Set new shipping default if different from current default shipping address
      if (shippingAddressId) {
        await db.query(
          `UPDATE shipping_addresses
          SET is_shipping = true
          WHERE id = $1 AND user_id = $2`,
          [shippingAddressId, userId]
        );
      }

      if (billingAddressId) {
        await db.query(
          `UPDATE shipping_addresses
          SET is_billing = true
          WHERE id = $1 AND user_id = $2`,
          [billingAddressId, userId]
        )
      }

      req.flash('success', "Default addresses have updated successfully.")
      res.redirect('/cart/checkout');

    } catch(err) {
      console.error("PATCH error updating default addresses at checkout", err);
      req.flash("error", "Failed to update default addresses");
    }
})
  
// Soft DELETE a shipping address
router.delete("/shipping-address/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `UPDATE shipping_addresses
      SET is_active = FALSE, deleted_at = NOW()
      WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);

    if (result.rows === 0) {
      req.flash("error", "Address not found");
    } else {
      req.flash("success", "Address removed")
    }

    res.redirect("/customer/addresses");

  } catch(err) {
    console.error("DELETE soft delete error while deleting address" , err);
    req.flash("error", "Error deleting specified address");
    res.redirect("/customer/addresses");
  }
})

  export default router;