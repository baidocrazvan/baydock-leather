import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import {
  calculateOrderPrice,
  createOrder,
  addOrderItems,
  clearCart,
  updateProductStock,
  getOrderDetails,
  getUserOrders,
} from "../services/orderService.js";

const router = express.Router();

// Get a user's order history, after join group result by order and shipping details, order by creation date
router.get("/history", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { orders, total } = await getUserOrders(userId, {
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return res.render("orders/order-history.ejs", {
      orders,
      currentPage: parseInt(page),
      totalPages,
    });
  } catch (err) {
    console.error("Error getting order history:", err);
    return res.redirect("/user/account");
  }
});

// GET page containing all the details of a specific order for authenticated user with ownership validation
router.get("/:id", authenticate, async (req, res) => {
  try {
    const order = await getOrderDetails(req.params.id, req.user.id);

    res.render("orders/order.ejs", {
      order,
      sameAddress: order.shippingAddress.street === order.billingAddress.street,
      user: req.user,
    });
  } catch (err) {
    console.error("GET Error getting order by id: ", err);
    req.flash("error", "Failed to load order details");
    return res.redirect("/orders");
  }
});

// Place an order using transactions
router.post("/new-order", authenticate, async (req, res) => {
  // Get a client from the pool
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const userId = req.user.id;
    const {
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      shippingMethodId,
    } = req.body;

    // Validate shipping method
    const shippingMethod = await client.query(
      `SELECT * FROM shipping_methods WHERE id = $1 AND is_active = true`,
      [shippingMethodId]
    );
    if (shippingMethod.rows.length === 0) {
      await client.query("ROLLBACK");
      req.flash("error", "Invalid shipping method");
      return res.redirect("/cart/checkout");
    }
    let shippingCost = parseFloat(shippingMethod.rows[0].base_price);

    // Validate shipping and billing address
    const shippingAddress = await client.query(
      `SELECT * FROM shipping_addresses WHERE id = $1 AND user_id = $2`,
      [shippingAddressId, userId]
    );
    // Rollback the transaction if shipping address does not exist or does not have is_shipping set to true
    if (
      shippingAddress.rows.length === 0 ||
      !shippingAddress.rows[0].is_shipping
    ) {
      await client.query("ROLLBACK");
      req.flash("error", "Invalid shipping address");
      return res.redirect("/cart/checkout");
    }

    // Check billing address if different from shipping address
    if (billingAddressId && billingAddressId !== shippingAddressId) {
      const billingAddress = await client.query(
        `SELECT * FROM shipping_addresses WHERE id = $1 and user_id = $2`,
        [billingAddressId, userId]
      );
      // Rollback the transaction if billing address does not exist or does not have is_billing set to true
      if (
        billingAddress.rows.length === 0 ||
        !billingAddress.rows[0].is_billing
      ) {
        await client.query("ROLLBACK");
        req.flash("error", "Invalid shipping address");
        return res.redirect("/cart/checkout");
      }
    }

    // Check if cart is empty
    const cartItems = await client.query(
      `SELECT * FROM carts WHERE user_id = $1`,
      [userId]
    );

    if (cartItems.rows.length === 0) {
      // Rollback transaction if cart is empty
      await client.query("ROLLBACK");
      req.flash("error", "Your cart is empty");
      return res.redirect("/cart");
    }

    // Check if there is enough stock before sending the order (some products may be sold after user has added them to his cart)
    const checkStock = await client.query(
      `SELECT p.name FROM carts c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1 AND c.quantity > p.stock`,
      [userId]
    );
    if (checkStock.rows.length > 0) {
      // Rollback transaction if not enough stock
      const outOfStockItems = checkStock.rows.map((row) => row.name).join(", ");
      await client.query("ROLLBACK");
      req.flash("error", `Not enough stock for: ${outOfStockItems}`);
      return res.redirect("/");
    }

    // Calculate total price including shipping
    const subtotal = parseFloat(await calculateOrderPrice(userId));
    if (subtotal >= 100) {
      shippingCost = 0;
    }
    const totalPrice = subtotal + shippingCost;

    // Create order
    const orderId = await createOrder(
      userId,
      subtotal,
      shippingCost,
      totalPrice,
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      shippingMethodId
    );

    // Move items from carts table to order_items table
    await addOrderItems(orderId, userId);

    // Update product stock
    await updateProductStock(userId, client);

    // Clear the cart
    await clearCart(userId);

    // If every step worked, commit transaction
    await client.query("COMMIT");
    req.flash("success", "Order placed successfully!");
    return res.redirect(`/orders/${orderId}`);
  } catch (err) {
    // Rollback transaction if err
    await client.query("ROLLBACK");
    console.error("Error creating order: ", err);

    // Handle stock violation
    if (err.code === "23514" && err.constraint === "products_stock_check") {
      req.flash(
        "error",
        "Some items in your cart exceed available stock. Please adjust quantities."
      );
    } else {
      req.flash("error", "Failed to create order. Please try again.");
    }

    return res.redirect("/cart");
  } finally {
    // Release client back to the pool
    client.release();
  }
});

// PATCH route for changing order status
router.patch("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const newStatus = req.body.status;
    await db.query(`UPDATE orders SET status = $1 WHERE id = $2`, [
      newStatus,
      orderId,
    ]);

    req.flash("success", "Order status updated successfully");
    return res.redirect(`/admin/orders/${orderId}`);
  } catch (err) {
    console.error("PATCH error updating order status", err);
    req.flash("error", "Failed to update order status");
    return res.redirect("/admin/orders");
  }
});

export default router;
