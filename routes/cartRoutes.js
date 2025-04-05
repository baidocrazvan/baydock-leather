import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { validateQuantity, getCartData, updateCartItem, updateCartQuantity } from "../services/cartService.js"
import { getActiveUserAddresses } from "../services/addressService.js";

const router = express.Router();

// Get a user's cart items
router.get("/", async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, total } = await getCartData(req.user.id);
        
    
        res.render("cart.ejs", {
            cartItems: items,
            cartTotal: total
        })

        
    } catch(err) {
        console.error("Cart GET error:", err.message);
        req.flash('error', "Cart cannot be loaded at this moment. Please try again.");
        res.redirect("/");
    }
    
});


router.get("/checkout", async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await getActiveUserAddresses(userId)
        const { items, total } = await getCartData(userId);
        console.log("User: ", req.user);
        console.log("Addresses: ", addresses);
        console.log("Addresses.length: ", addresses.length);
        console.log(items);
        console.log(total);
        res.render("checkout.ejs", {
            user: req.user,
            addresses: addresses,
            cartItems: items,
            cartTotal: total
        })
    } catch (err) {
        console.error("Cart checkout GET error:", err.message);
        req.flash('error', "Checkout information cannot be loaded at this moment. Please try again.");
        res.redirect("/");
    }
})

router.post("/checkout-guest", async (req, res) => {
    const { lastName, firstName, username: email, password, cpassword: confirmPassword } = req.body;
    const role = "user";
  
    try {
  
      if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match")
      } else {
  
          const checkResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  
          if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already exists. Please log in.');
            res.redirect("/auth/login");
          } else {
              // Hash password using bcrypt
              bcrypt.hash(password, saltRounds, async (err, hash) => {
              if (err) {
                console.log("Error hashing password:", err);
              } else {
                const result = await db.query(
                  `INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,[
                  firstName, lastName, email, hash, role
              ]);
              const user = result.rows[0];
              console.log(user);
              req.login(user, (err) => {
                console.error(err)
                res.redirect("/cart/checkout")
              })
            }
        })
      }
      } 
  
    } catch (err) {
      req.flash('error', 'Registration failed.');
      console.log(err);
    }
})

// Add a product to user's cart
router.post("/:id", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity)) throw new Error("Invalid quantity");

        console.log("Request Body:", req.body); // Log the request body
        console.log("Parsed Quantity:", quantity); // Log the parsed quantity
        console.log("Product id:", productId); // Log product id

        // Validate quantity
        validateQuantity(quantity);

        // If the product is already in the cart, add the new quantity to existing quantity, otherwise just add product to cart
        await updateCartItem(userId, productId, quantity);

        req.flash('success', 'Product added to cart!');
        res.redirect(`/products/${productId}`);

    } catch(err) {
        console.error("Cart POST error:", err.message);
        req.flash('error', "Failed to add product to cart.");
        res.redirect(`/products/${req.params.id}`);
    }
});

// Update the quantity of a product already in cart
router.put("/", authenticate, async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user.id;
    
      await updateCartQuantity(userId, productId, quantity);
  
      req.flash('success', 'Cart updated!');
      res.redirect("/cart");
    } catch (err) {
    console.error("PUT /cart error:", err);
      req.flash("error", "Item quantity failed to update.");
      res.redirect("/cart");
    }
  });

// Delete a product from user cart
router.delete("/delete/:id", authenticate, async (req, res) => {
    try {

    const userId = req.user.id;
    const productId = req.params.id

    //Check that the item exists inside the cart
    const cartItem = await db.query(`SELECT * FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId]); 
    if (cartItem.rows.length === 0) {
        req.flash("error", "The specified product is not inside your cart");
        res.redirect("/cart");
    }

    // Delete the product from user's cart
    await db.query(`DELETE FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId])
    req.flash("success", "Item removed from cart");
    res.redirect("/cart");

   } catch(err) {
        console.error("DELETE /cart/:id error:", err);
        req.flash("error", "We couldn't remove this item. Please try again.");
        res.redirect("/cart");
    }
    
})

// Empty the cart

router.delete("/delete", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const cartItems = await db.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
        if (cartItems.rows.length === 0) {
            req.flash("error", "You don't have any products inside the cart");
            res.redirect("/cart");
        }

        await db.query(`DELETE FROM carts WHERE user_id = $1`, [userId]);
        req.flash("success", "Cart cleared successfully");
        res.redirect("/cart");

    } catch(err) {
        console.error("DELETE /cart error: ", err);
        req.flash("error", "Failed to delete cart contents.");
    }
})

export default router;