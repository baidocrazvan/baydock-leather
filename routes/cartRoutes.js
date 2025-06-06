import express from "express";
import db from "../db.js";
import { authenticate } from "../middleware/middleware.js";
import {
  validateQuantity,
  getCartData,
  updateCartItem,
  updateCartQuantity,
} from "../services/cartService.js";
import { getActiveUserAddresses } from "../services/addressService.js";

const router = express.Router();

// Get a user's cart items
router.get("/", async (req, res) => {
  try {
    let cartItems = [];
    let cartSubtotal = 0;
    let cartMessage = null;

    if (req.isAuthenticated()) {
      // Authenticated user: Fetch cart from database
      const userId = req.user.id;
      const result = await getCartData(userId);
      cartItems = result.items;
      cartSubtotal = result.total;

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
            selected_size: item.size,
            total_price: (productData.price * item.quantity).toFixed(2),
          });
          cartSubtotal += productData.price * item.quantity;
        }
      }
      cartSubtotal = cartSubtotal.toFixed(2);
    }

    return res.render("cart/cart.ejs", {
      user: req.user,
      cartItems,
      cartSubtotal,
      cartMessage,
    });
  } catch (err) {
    console.error("Cart GET error:", err.message);
    req.flash(
      "error",
      "Cart cannot be loaded at this moment. Please try again."
    );
    return res.redirect("/");
  }
});

router.get("/checkout", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await getActiveUserAddresses(userId);
    const { items, total } = await getCartData(userId);
    const shippingMethods = await db.query(
      `SELECT * FROM shipping_methods WHERE is_active = true`
    );

    // Set default shipping method (cheapest/first one)
    const defaultShipping = shippingMethods.rows[0] || { base_price: 0 };
    const shippingCost = defaultShipping.base_price;
    const orderTotal = parseFloat(total) + parseFloat(shippingCost);

    return res.render("cart/checkout.ejs", {
      user: req.user,
      addresses: addresses,
      cartItems: items,
      cartSubtotal: total,
      shippingCost: shippingCost,
      orderTotal: orderTotal,
      shippingMethods: shippingMethods.rows,
    });
  } catch (err) {
    console.error("Cart checkout GET error:", err.message);
    req.flash(
      "error",
      "Checkout information cannot be loaded at this moment. Please try again."
    );
    return res.redirect("/");
  }
});

// Add a product to user's cart
router.post("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const quantity = parseInt(req.body.quantity);
    const size = req.body.size;
    if (isNaN(quantity)) throw new Error("Invalid quantity");

    // Validate quantity
    validateQuantity(quantity);

    if (req.isAuthenticated()) {
      // Authenticated user : add product to database cart
      // If the product is already in the cart, add the new quantity to existing quantity, otherwise just add product to cart
      const userId = req.user.id;

      // First check if this a product that requires a size
      const product = await db.query(
        `SELECT category FROM products WHERE id = $1`,
        [productId]
      );

      const requiresSize = ["belts", "watchstraps"].includes(
        product.rows[0]?.category
      );

      if (requiresSize && !size) {
        throw new Error("Size selection is required for this product");
      }

      await updateCartItem(
        userId,
        productId,
        quantity,
        requiresSize ? size : null
      );
      req.flash("success", "Product added to cart!");
    } else {
      // Guest user: Add product to session cart
      req.session.cart = req.session.cart || [];

      const product = await db.query(
        `SELECT category FROM products WHERE id = $1`,
        [productId]
      );

      const requiresSize = ["belts", "watchstraps"].includes(
        product.rows[0]?.category
      );

      if (requiresSize && !size) {
        throw new Error("Size selection is required for this product");
      }

      const existingItem = req.session.cart.find(
        (item) =>
          item.productId === productId && (!requiresSize || item.size === size)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        req.session.cart.push({
          productId,
          quantity,
          ...(requiresSize && { size }),
        }); // Only include size if required
      }

      req.flash("success", "Product added to cart!");
    }

    return res.redirect(`/products/${productId}`);
  } catch (err) {
    console.error("Cart POST error:", err.message);
    req.flash("error", "Failed to add product to cart.");
    return res.redirect(`/products/${req.params.id}`);
  }
});

// Update the quantity of a product already in cart
router.patch("/", async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;

    if (req.isAuthenticated()) {
      // Authenticated user: update quantity of product in database
      const userId = req.user.id;

      // Check if this product requires size
      const product = await db.query(
        `SELECT category FROM products WHERE id = $1`,
        [productId]
      );
      const requiresSize = ["belts", "watchstraps"].includes(
        product.rows[0]?.category
      );

      if (requiresSize && !size) {
        throw new Error("Size selection is required for this product");
      }

      await updateCartQuantity(
        userId,
        productId,
        quantity,
        requiresSize ? size : null
      );
      req.flash("success", "Cart updated!");
    } else {
      // Guest user: Update quantity in session cart
      req.session.cart = req.session.cart || [];

      const product = await db.query(
        `SELECT category FROM products WHERE id = $1`,
        [productId]
      );
      const requiresSize = ["belts", "watchstraps"].includes(
        product.rows[0]?.category
      );

      const itemIndex = req.session.cart.findIndex(
        (item) =>
          item.productId === productId && (!requiresSize || item.size === size)
      );

      if (itemIndex !== -1) {
        req.session.cart[itemIndex].quantity = quantity;
        req.flash("success", "Cart updated!");
      } else {
        req.flash("error", "Product not found in cart.");
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
    const productId = req.params.id;
    const size = req.body.size;

    if (req.isAuthenticated()) {
      const userId = req.user.id;

      //Check that the item exists inside the cart
      const cartItem = await db.query(
        `SELECT * FROM carts
        WHERE user_id = $1 AND product_id = $2
        AND selected_size IS NOT DISTINCT FROM $3`,
        [userId, productId, size]
      );

      if (cartItem.rows.length === 0) {
        req.flash("error", "The specified product is not inside your cart.");
        return res.redirect("/cart");
      }

      // Delete the product from user's cart
      await db.query(
        `DELETE FROM carts 
        WHERE user_id = $1 AND product_id = $2
        AND selected_size IS NOT DISTINCT FROM $3`,
        [userId, productId, size]
      );
      req.flash("success", "Item removed from cart.");
    } else {
      // Guest user: Remove product from session cart
      req.session.cart = req.session.cart || [];
      const index = req.session.cart.findIndex(
        (item) =>
          item.productId === productId &&
          (item.size === size || (!item.size && !size))
      );

      if (index !== -1) {
        req.session.cart.splice(index, 1);
        req.flash("success", "Item removed from cart.");
      } else {
        req.flash("error", "Specified item is not present in your cart.");
      }
    }

    return res.redirect("/cart");
  } catch (err) {
    console.error("DELETE /cart/:id error:", err);
    req.flash("error", "We couldn't remove this item. Please try again.");
    return res.redirect("/cart");
  }
});

// Empty the cart

router.delete("/delete", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      // Authenticated user: Clear cart in the database
      const userId = req.user.id;

      const cartItems = await db.query(
        `SELECT * FROM carts WHERE user_id = $1`,
        [userId]
      );
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
