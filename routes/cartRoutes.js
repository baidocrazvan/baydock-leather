import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { validateQuantity, getCartData, updateCartItem, updateCartQuantity } from "../services/cartService.js"
import { getActiveUserAddresses } from "../services/addressService.js";

const router = express.Router();

// Get a user's cart items
router.get("/", async (req, res) => {
    try {
      let cartItems = [];
      let cartTotal = 0;
      let cartMessage = null;

      if (req.isAuthenticated()) {
        // Authenticated user: Fetch cart from database
        const userId = req.user.id;
        const result = await getCartData(userId);
        cartItems = result.items;
        cartTotal = result.total;

        if (result.message) {
          cartMessage = result.message;
        } 

      } else {
        // Guest user: fetch cart from session
        req.session.cart = req.session.cart || [];
        for (const item of req.session.cart) {
          const product = await db.query(
            `SELECT id, name, price, thumbnail FROM products WHERE id = $1`,
            [item.productId]
          );
          if (product.rows.length > 0) {
            const productData = product.rows[0];
            cartItems.push({
              ...productData,
              quantity: item.quantity,
              total_price: (productData.price * item.quantity).toFixed(2),
            });
            cartTotal += productData.price * item.quantity;
          }
        }
        cartTotal = cartTotal.toFixed(2);
      }

      return res.render("cart/cart.ejs", {
          user: req.user,
          cartItems,
          cartTotal,
          cartMessage
      })

        
    } catch(err) {
        console.error("Cart GET error:", err.message);
        req.flash('error', "Cart cannot be loaded at this moment. Please try again.");
        return res.redirect("/");
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
        return res.render("cart/checkout.ejs", {
            user: req.user,
            addresses: addresses,
            cartItems: items,
            cartTotal: total
        })
    } catch (err) {
        console.error("Cart checkout GET error:", err.message);
        req.flash('error', "Checkout information cannot be loaded at this moment. Please try again.");
        return res.redirect("/");
    }
})


// Add a product to user's cart
router.post("/:id", async (req, res) => {
    try {

        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity);
        if (isNaN(quantity)) throw new Error("Invalid quantity");

        // Validate quantity
        validateQuantity(quantity);

        if (req.isAuthenticated()) {
            // Authenticated user : add product to database cart
            // If the product is already in the cart, add the new quantity to existing quantity, otherwise just add product to cart
            const userId = req.user.id;
            await updateCartItem(userId, productId, quantity);
            req.flash("success", "Product added to cart!");
        } else {
          // Guest user: Add product to session cart
          req.session.cart = req.session.cart || [];
          const existingItem = req.session.cart.find(item => item.productId === productId);

          if (existingItem) {
            existingItem.quantity += quantity;
          } else {
            req.session.cart.push({productId, quantity});
          }

          req.flash("success", "Product added to cart!");
        }
        
        return res.redirect(`/products/${productId}`);

    } catch(err) {
        console.error("Cart POST error:", err.message);
        req.flash('error', "Failed to add product to cart.");
        return res.redirect(`/products/${req.params.id}`);
    }
});

// Update the quantity of a product already in cart
router.patch("/", async (req, res) => {
    try {
      const { productId, quantity } = req.body;

      if (req.isAuthenticated()) {
        // Authenticated user: update quantity of product in database
        const userId = req.user.id;
        await updateCartQuantity(userId, productId, quantity);
        req.flash("success", "Cart updated!");
      } else {
        // Guest user: Update quantity in session cart
        req.session.cart = req.session.cart || [];
        const item = req.session.cart.find((item) => item.productId === productId);

        if (item) {
          item.quantity = quantity;
          req.flash("success", "Cart updated!");
        } else {
          req.flash("error", "Product not found inside cart.");
        }
      }

      return res.redirect("/cart");
    } catch (err) {
    console.error("PATCH /cart error while changing quantity:", err);
      req.flash("error", "Item quantity failed to update.");
      return res.redirect("/cart");
    }
  });

// Delete a product from user cart
router.delete("/delete/:id", async (req, res) => {
    try {
    const productId = req.params.id

    if (req.isAuthenticated()) {
      const userId = req.user.id;

      //Check that the item exists inside the cart
      const cartItem = await db.query(`SELECT * FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId]); 

      if (cartItem.rows.length === 0) {
          req.flash("error", "The specified product is not inside your cart.");
          res.redirect("/cart");
      }

      // Delete the product from user's cart
      await db.query(`DELETE FROM carts WHERE user_id = $1 AND product_id = $2`, [userId, productId])
      req.flash("success", "Item removed from cart.");

    } else {
      // Guest user: Remove product from session cart
      req.session.cart = req.session.cart || [];
      const index = req.session.cart.findIndex((item) => item.productId === productId);

      if (index !== -1) {
        req.session.cart.splice(index, 1);
        req.flash("success", "Item removed from cart.")
      } else {
        req.flash("error", "Specified item is not present in your cart.")
      }
    }

    return res.redirect("/cart");

   } catch(err) {
        console.error("DELETE /cart/:id error:", err);
        req.flash("error", "We couldn't remove this item. Please try again.");
        res.redirect("/cart");
    }
    
})

// Empty the cart

router.delete("/delete", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      // Authenticated user: Clear cart in the database
      const userId = req.user.id;

      const cartItems = await db.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);
      if (cartItems.rows.length === 0) {
        req.flash("error", "You don't have any products inside the cart");
        return res.redirect("/cart");
      }

      await db.query(`DELETE FROM carts WHERE user_id = $1`, [userId]);
    } else {
      // Guest user: Clear session cart
      req.session.cart = [];
    }

    req.flash("success", "Cart cleared successfully");
    return res.redirect("/cart");
  } catch (err) {
    console.error("DELETE /cart error: ", err);
    req.flash("error", "Failed to delete cart contents.");
    return res.redirect("/cart");
  }
});

export default router;