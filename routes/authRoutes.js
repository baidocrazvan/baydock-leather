import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import db from "../db.js";
import rateLimit from "express-rate-limit";
import {
  validateLogin,
  validateEmail,
  validateRegister,
  validateResetPassword,
} from "../middleware/validationMiddleware.js";
import { redirectIfAuthenticated } from "../middleware/middleware.js";
import { updateCartItem } from "../services/cartService.js";
import {
  generateConfirmationToken,
  sendConfirmationEmail,
  sendResetEmail,
} from "../services/emailService.js";
import { isEmailAlreadyRegistered } from "../services/userService.js";

const saltRounds = 10;
const router = express.Router();

// GET login page
router.get("/login", redirectIfAuthenticated, (req, res) => {
  const unconfirmedEmail = req.query.unconfirmedEmail || null;
  res.render("auth/login.ejs", { unconfirmedEmail });
});

// GET register page
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("auth/register.ejs");
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  keyGenerator: (req) => `${req.ip}_${req.body.email || "unknown"}`, // Track by IP + email
  skip: (req) => req.isAuthenticated(), // Skip if already logged in
  handler: (req, res) => {
    req.flash("error", "Too many login attempts. Try again later.");
    res.redirect("/auth/login");
  },
});

// POST login a user
router.post("/login", loginLimiter, validateLogin, (req, res, next) => {
  // Temporarily store the guest cart ( req.session gets reset during registration or login and cart data is lost otherwise)
  const guestCart = req.session.cart || [];

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login error:", err);
      req.flash("error", "An error occurred during login.");
      return res.redirect("/auth/login");
    }
    if (!user) {
      req.flash("error", info ? info.message : "Invalid credentials.");
      return res.redirect("/auth/login");
    }

    // Email confirmation check
    if (!user.is_confirmed) {
      req.flash("error", "Please confirm your email before logging in.");
      return res.redirect(
        `/auth/login?unconfirmedEmail=${encodeURIComponent(req.body.email)}`
      );
    }
    req.login(user, async (err) => {
      if (err) {
        console.error("Error logging in:", err);
        req.flash("error", "Login failed.");
        return res.redirect("/auth/login");
      }

      // Check if a user has a pending cart from registration
      const pendingCart = await db.query(
        `DELETE FROM pending_carts 
        WHERE user_email = $1
        RETURNING cart_data`,
        [user.email]
      );

      if (pendingCart.rows.length > 0) {
        // Restore pending cart if exists
        req.session.cart = pendingCart.rows[0].cart_data;
      } else {
        // Restore the guest cart after session regeneration
        req.session.cart = guestCart;
      }

      try {
        if (req.session.cart && req.session.cart.length > 0) {
          const userId = req.user.id;
          for (const item of req.session.cart) {
            await updateCartItem(userId, item.productId, item.quantity);
          }

          req.session.cart = []; // Clear the guest cart after merging
        }
        req.flash("success", "Logged in successfully");
        res.redirect("/");
      } catch (err) {
        console.error("Error merging guest cart:", err);
        req.flash("error", "Failed to merge guest cart.");
        res.redirect("/");
      }
    });
  })(req, res, next);
});

// Registration rate limiter (IP + email)
const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 Hour
  max: 5,
  keyGenerator: (req) =>
    `${req.ip}_${req.body.email?.toLowerCase() || "missing-email"}`,
  handler: (req, res) => {
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      console.log(
        `Rate limit hit: IP=${req.ip} Path=${req.path} Email=${req.body.email}`
      );
    }
    req.flash("error", "Too many registration attempts. Try again later.");
    res.redirect("/auth/register");
  },
  skip: (req) =>
    // Skip rate limiter if email is already registered
    req.body.email && isEmailAlreadyRegistered(req.body.email),
});

// POST register a user
router.post(
  "/register",
  registerLimiter,
  validateRegister,
  async (req, res) => {
    const {
      lastName,
      firstName,
      email,
      password,
      cpassword: confirmPassword,
    } = req.body;
    const role = "user";
    const guestCart = req.session.cart || [];

    try {
      if (password !== confirmPassword) {
        req.flash("error", "Password does not match confirmation password");
        return res.redirect("/auth/register");
      }

      // Check for existing confirmed user
      const checkConfirmedUser = await db.query(
        `SELECT * FROM users WHERE email = $1 AND is_confirmed = TRUE`,
        [email]
      );
      if (checkConfirmedUser.rows.length > 0) {
        req.flash("error", "Account already registered. Please log in.");
        return res.redirect("/auth/login");
      }

      // Check for unconfirmed user
      const checkUnconfirmedUser = await db.query(
        `SELECT * FROM users WHERE email = $1 AND is_confirmed = FALSE`,
        [email]
      );

      if (checkUnconfirmedUser.rows.length > 0) {
        // Check if a registration email has already been sent and is still valid to prevent spam
        const recentAttempt = await db.query(
          `SELECT created_at FROM users 
            WHERE email = $1 AND confirmation_token_expires > NOW()
            ORDER BY created_at DESC LIMIT 1`,
          [email]
        );

        if (recentAttempt.rows.length > 0) {
          req.flash(
            "error",
            "Confirmation email already sent. Please check your inbox."
          );
          return res.redirect("/auth/register");
        }
      }

      // Hash password using bcrypt
      const hash = await bcrypt.hash(password, saltRounds);

      // Generate confirmation token
      const confirmationToken = generateConfirmationToken();

      // Get token expiration date from DB
      const dbExpires = await db.query(
        `SELECT (NOW() + INTERVAL '10 minutes') AS expires`
      );
      const tokenExpires = dbExpires.rows[0].expires;

      let user;
      if (checkUnconfirmedUser.rows.length > 0) {
        // Update existing unconfirmed user and prepare to resend new activation email
        const result = await db.query(
          `UPDATE users SET
                first_name = $1,
                last_name = $2,
                password = $3,
                confirmation_token = $4,
                confirmation_token_expires = $5
                WHERE email = $6
          RETURNING *`,
          [firstName, lastName, hash, confirmationToken, tokenExpires, email]
        );
        user = result.rows[0];
      } else {
        // Create new user
        // Insert user with confirmation data
        const result = await db.query(
          `INSERT INTO users (first_name, last_name, email, password, role, confirmation_token, confirmation_token_expires)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
          [
            firstName,
            lastName,
            email,
            hash,
            role,
            confirmationToken,
            tokenExpires,
          ]
        );
        user = result.rows[0];
      }

      // Store guest cart if exists
      if (guestCart.length > 0) {
        await db.query(
          `INSERT INTO pending_carts 
          (user_email, cart_data) 
          VALUES ($1, $2)
          ON CONFLICT (user_email) 
          DO UPDATE SET cart_data = $2`,
          [email, JSON.stringify(guestCart)]
        );
      }

      // Send confirmation email
      try {
        await sendConfirmationEmail(email, user.confirmation_token);
        req.flash(
          "success",
          "Registration successfull! Please check your email to confirm your account."
        );
        return res.redirect("/auth/login");
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Clean up unconfirmed registration
        await db.query(
          `DELETE FROM users WHERE email = $1 AND is_confirmed = FALSE`,
          [email]
        );
        req.flash("error", "Failed to send confirmation. Please try again.");
        return res.redirect("/auth/register");
      }
    } catch (err) {
      console.error("Registration error:", err);
      req.flash("error", "Registration failed.");
      res.redirect("/auth/register");
    }
  }
);

// GET email confirmation page
router.get("/confirm", (req, res) => {
  res.render("auth/confirm.ejs", { token: req.query.token });
});

// POST confirm email
router.post("/confirm", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    req.flash("error", "Missing confirmation token");
    return res.redirect("/auth/register");
  }

  try {
    // Check if non-expired token exists
    const result = await db.query(
      `SELECT id FROM users 
       WHERE confirmation_token = $1
       AND confirmation_token_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      // If no valid token found
      // Check if token exists at all
      const details = await db.query(
        `SELECT 1 FROM users WHERE confirmation_token = $1`,
        [token]
      );

      req.flash(
        "error",
        details.rows.length
          ? "Confirmation link expired"
          : "Invalid confirmation link"
      );
      return res.redirect("/auth/register");
    }

    // Mark user as confirmed
    await db.query(
      `UPDATE users
       SET is_confirmed = TRUE,
           confirmation_token = NULL,
           confirmation_token_expires = NULL
       WHERE confirmation_token = $1`,
      [token]
    );

    req.flash(
      "success",
      "Email has been confirmed. You can now log into your account."
    );
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Confirmation error:", err);
    req.flash("error", "Confirmation failed.");
    return res.redirect("/auth/register");
  }
});

const resendLimiter = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour
  max: 2, // 3 requests
  keyGenerator: (req) => `${req.ip}_${req.body.email}`,
  handler: (req, res) => {
    req.flash("error", "Too many resend attempts. Try again later.");
    res.redirect("/");
  },
  skip: (req) => !req.body.email, // Skip if no email
});

// POST resend confirmation email
router.post("/resend-confirmation", resendLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await db.query(
      `SELECT * FROM users
      WHERE email = $1 AND is_confirmed = FALSE`,
      [email]
    );

    if (!user.rows.length) {
      req.flash("error", "Email already confirmed or not registered");
      return res.redirect("/auth/login");
    }

    // Generate new token
    const newToken = generateConfirmationToken();
    const dbExpires = await db.query(
      `SELECT (NOW() + INTERVAL '10 minutes') AS expires`
    );
    const expires = dbExpires.rows[0].expires;

    await db.query(
      `UPDATE users
      SET confirmation_token = $1,
          confirmation_token_expires = $2
      WHERE email = $3`,
      [newToken, expires, email]
    );

    await sendConfirmationEmail(email, newToken);
    req.flash("success", "New confirmation email sent!");
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Email confirmation resend error:", err);
    req.flash("error", "Failed to resend confirmation email.");
    return res.redirect("/auth/login");
  }
});

// GET Forgot Password Page
router.get("/forgot-password", redirectIfAuthenticated, (req, res) => {
  res.render("auth/forgot-password.ejs");
});

// IP based limiter
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 requests for window of time
  handler: (req, res) => {
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      console.log(`Rate limit hit: IP=${req.ip}`);
    }
    req.flash("error", "Too many attempts from your network. Try again later.");
    res.redirect("/auth/forgot-password");
  },
});

// Email based limiter
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.body.email.toLowerCase(),
  handler: (req, res) => {
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      console.log(`Rate limit hit for Email=${req.body.email}`);
    }
    req.flash(
      "error",
      "Too many requests for this email. Check your inbox or try later."
    );
    res.redirect("/auth/forgot-password");
  },
  skip: (req) => !req.body.email, // If no email is provided, skip
});

// POST Forgot Password (send reset email)
router.post(
  "/forgot-password",
  ipLimiter,
  emailLimiter,
  redirectIfAuthenticated,
  validateEmail,
  async (req, res) => {
    const { email } = req.body;

    try {
      const user = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (!user.rows.length) {
        req.flash("error", "There is no account linked to this email");
        return res.redirect("/auth/forgot-password");
      }

      const token = generateConfirmationToken();
      const dbExpires = await db.query(
        `SELECT (NOW() + INTERVAL '10 minutes') AS expires`
      );
      const expires = dbExpires.rows[0].expires;

      await db.query(
        `UPDATE users 
       SET reset_token = $1, reset_token_expires = $2
       WHERE email = $3`,
        [token, expires, email]
      );

      const resetLink = `${process.env.BASE_URL}/auth/reset-password?token=${token}`;
      await sendResetEmail(email, resetLink);

      req.flash("success", "Password reset link sent to your email");
      res.redirect("/auth/login");
    } catch (err) {
      console.error("Password reset error:", err);
      req.flash("error", "Failed to process reset request");
      res.redirect("/auth/forgot-password");
    }
  }
);

// GET Reset Password Page
router.get("/reset-password", (req, res) => {
  res.render("auth/reset-password.ejs", { token: req.query.token });
});

// POST Reset Password
router.post("/reset-password", validateResetPassword, async (req, res) => {
  const { token, password, cpassword: confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    const user = await db.query(
      `SELECT * FROM users 
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );

    if (!user.rows.length) {
      req.flash("error", "Invalid or expired reset link");
      return res.redirect("/auth/forgot-password");
    }

    const isSamePassword = await bcrypt.compare(
      password,
      user.rows[0].password
    );
    if (isSamePassword) {
      req.flash("error", "New password cannot be the same as current password");
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    const hash = await bcrypt.hash(password, saltRounds);
    await db.query(
      `UPDATE users 
       SET password = $1, reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [hash, user.rows[0].id]
    );

    req.flash("success", "Password updated successfully");
    res.redirect("/auth/login");
  } catch (err) {
    console.error("Reset error:", err);
    req.flash("error", "Failed to reset password");
    res.redirect(`/auth/reset-password?token=${token}`);
  }
});

// POST Logout a user, clear session cookie and end the session.
router.post("/logout", function (req, res, next) {
  // Clear session cookie when user logs out
  req.logout((err) => {
    // Removes the req.user property and ends user's session
    if (err) {
      return next(err);
    }
    req.session.destroy(function (err) {
      // Destroy the session
      if (err) {
        return next(err);
      }

      res.clearCookie("connect.sid", {
        httpOnly: true,
        sameSite: "strict",
      }); // Clear the session cookie

      res.redirect("/");
    });
  });
});

export default router;
