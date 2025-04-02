import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getUserAddress } from "../services/addressService.js";

const router = express.Router();

// Render page for adding address
router.get("/shipping-address", authenticate, async (req, res) => {
  res.render("add-address.ejs");
})

// Add a shipping address to user account
router.post("/shipping-address", authenticate, async (req, res) => {
    try{

        const userId = req.user.id;
        const { firstName, lastName, address, city, county, postalCode, phoneNumber, fromCheckout } = req.body;

        // Check if user has existing addresses
        const existingAddresses = await db.query(
        'SELECT id FROM shipping_addresses WHERE user_id = $1', 
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

    if (isShipping) {
      await db.query(
        `UPDATE shipping_addresses 
         SET is_shipping = false 
         WHERE user_id = $1 AND is_shipping = true AND id != $2`,
        [req.user.id, req.params.id]
      );
    }

    if (isBilling) {
      await db.query(
        `UPDATE shipping_addresses 
         SET is_billing = false 
         WHERE user_id = $1 AND is_billing = true AND id != $2`,
        [req.user.id, req.params.id]
      );
    }

      const result = await db.query(
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
        is_billing = $10
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
      console.log("Updated address:", result.rows[0]);
      res.redirect("/customer/address");
    } catch(err) {
      console.error(err);
    }
})

// Patch route for changing default shipping/billing address at checkout
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
      console.error("/address/ PATCH error updating default addresses at checkout", err);
      req.flash("error", "Failed to update default addresses");
    }
})
  
// Delete a shipping address
router.delete("/shipping-address/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(`DELETE FROM shipping_addresses WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
    res.redirect("/customer/addresses");

  } catch(err) {
    console.error("Failed to delete shipping address:" , err);
  }
})

  export default router;