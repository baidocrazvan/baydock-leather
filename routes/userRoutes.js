import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/middleware.js";
import { getActiveUserAddresses } from "../services/addressService.js";
import { getRecentUserOrders } from "../services/orderService.js";
import { validateChangePassword } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/account", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await getActiveUserAddresses(userId);
    const orders = await getRecentUserOrders(userId);

    return res.render("user/account.ejs", {
      user: req.user,
      addresses: addresses || [],
      orders: orders || [],
    });
  } catch (err) {
    console.error("Error fetching account data", err);
    return res.render("user/account.ejs", {
      user: req.user,
      addresses: [],
      orders: [],
    });
  }
});

router.get("/addresses", authenticate, async (req, res) => {
  try {
    const addresses = await getActiveUserAddresses(req.user.id);

    return res.render("user/addresses.ejs", {
      addresses: addresses || [],
    });
  } catch (err) {
    console.error("Error fetching shipping data", err);
    return res.render("user/addresses.ejs", {
      addresses: [],
    });
  }
});

router.get("/update-password", authenticate, (req, res) => {
  return res.render("user/change-password.ejs");
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 3,
  keyGenerator: (req) => req.user.id.toString(), // Track by user ID
  handler: (req, res) => {
    req.flash("error", "Too many password change attempts. Try again later.");
    res.redirect("/user/update-password");
  },
});

router.post(
  "/update-password",
  authenticate,
  passwordChangeLimiter,
  validateChangePassword,
  async (req, res) => {
    const { currentPassword, password, cpassword: confirmPassword } = req.body;
    const saltRounds = 10;
    try {
      // Verify current password
      const user = await db.query("SELECT password FROM users WHERE id = $1", [
        req.user.id,
      ]);

      const isValid = await bcrypt.compare(
        currentPassword,
        user.rows[0].password
      );

      if (!isValid) {
        req.flash("error", "Current password is incorrect");
        return res.redirect("/user/update-password");
      }

      if (password !== confirmPassword) {
        req.flash("error", "New passwords do not match");
        return res.redirect("/user/update-password");
      }

      const hash = await bcrypt.hash(password, saltRounds);
      await db.query("UPDATE users SET password = $1 WHERE id = $2", [
        hash,
        req.user.id,
      ]);

      req.flash("success", "Password updated successfully");
      res.redirect("/user/account");
    } catch (err) {
      console.error("Password change error:", err);
      req.flash("error", "Failed to update password");
      res.redirect("/user/update-password");
    }
  }
);

export default router;
