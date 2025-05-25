import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import db from "../db.js";
import Joi from "joi";
import { validateLogin, validateRegister } from "../middleware/validationMiddleware.js";
import { redirectIfAuthenticated } from "../middleware/middleware.js";
import { updateCartItem } from "../services/cartService.js";
import { generateConfirmationToken, sendConfirmationEmail } from "../services/emailService.js";


const saltRounds = 10;
const router = express.Router();

// GET login page
router.get("/login", redirectIfAuthenticated, (req, res) => {
  const errors = req.flash('error');
  res.render("auth/login.ejs", { errors });
  });

// GET register page
router.get("/register", redirectIfAuthenticated, (req, res) => {
    res.render("auth/register.ejs");
  });

// POST login a user
router.post("/login", validateLogin, (req, res, next) => {
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
    console.log("Is user confirmed?: ", user.is_confirmed);
    // Email confirmation check
    if (!user.is_confirmed) {
      req.flash("error", "Please confirm your email before logging in.");
      return res.redirect("/auth/login");
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

// POST register a user
router.post("/register", validateRegister, async (req, res) => {
    const { lastName, firstName, email, password, cpassword: confirmPassword } = req.body;
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
        req.flash('error', 'Account already registered. Please log in.');
        return res.redirect("/auth/register");
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
          req.flash('error', 'Confirmation email already sent. Please check your inbox.');
          return res.redirect('/auth/register');
        }
      }

      // Hash password using bcrypt
      const hash = await bcrypt.hash(password, saltRounds);
      console.log("password before hashing: ", password);
      console.log("password after hashing: ", hash);
      // Generate confirmation token
      const confirmationToken = generateConfirmationToken();

      // Get token expiration date from DB
      const dbExpires = await db.query(
        `SELECT (NOW() + INTERVAL '10 minutes') AS expires`
      );
      const tokenExpires = dbExpires.rows[0].expires;
      console.log("Token expiration set to:", tokenExpires);
      console.log("Current server time:", new Date().toISOString());
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
      } else { // Create new user
        // Insert user with confirmation data
        const result = await db.query(
            `INSERT INTO users (first_name, last_name, email, password, role, confirmation_token, confirmation_token_expires)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [firstName, lastName, email, hash, role, confirmationToken, tokenExpires]
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
        req.flash("success", "Registration successfull! Please check your email to confirm your account.");
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
});

// GET email confirmation page
router.get("/confirm", (req, res) => {
  res.render("auth/confirm.ejs", {token: req.query.token});
});

// POST confirm email
router.post("/confirm", async (req, res) => {
  const { token } = req.body;
  console.log("Received token:", token);
  console.log("Token length:", token.length);
  console.log("Token type:", typeof token);

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
    console.log("line 233 result:", result.rows);
    if (!result.rows[0].length === 0) {
      const details = await db.query(
        `SELECT 
          confirmation_token_expires,
          NOW() AS current_db_time,
          (confirmation_token_expires > NOW()) AS is_valid
         FROM users WHERE confirmation_token = $1`,
        [token]
      );
      console.log("Expiration details:", details.rows[0]);
      
    req.flash("error", "Invalid or expired confirmation link");
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

    req.flash("success", "Email has been confirmed. You can now log into your account.");
    return res.redirect("/auth/login");

  } catch(err) {
    console.error("Confirmation error:", err);
    req.flash("error", "Confirmation failed.");
    return res.redirect("/auth/register");
  }
});

//POST resend confirmation email
router.post("/resend-confirmation", async(req, res) => {
  const { email } = req.body;

  try {
    const user = await db.query(
      `SELECT * FROM users
      WHERE email = $1 AND is_confirmed = FALSE`,
      [email]
    );

    if(!user.rows.length) {
      req.flash("error", "Email already confirmed or account not found");
      return res.redirect("/auth/login");
    }

    // Generate new token
    const newToken = generateConfirmationToken();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `UPDATE users
      SET confirmation_token = $1,
          confirmation_token_expires = $2
      WHERE email = $3`,
      [newToken, newExpiry, email]
    );

    await sendConfirmationEmail(email, newTorken);
    req.flash("success", "New confirmation email sent!");
    res.redirect("/auth/login");
  } catch(err) {
    console.error("Email confirmation resend error:", err);
    req.flash("error", "Failed to resend confirmation email.");
    return res.redirect("auth/login");
  }
})

// POST Logout a user, clear session cookie and end the session.
router.post("/logout", function(req, res, next) { // Clear session cookie when user logs out
    req.logout((err) => { // Removes the req.user property and ends user's session
        if (err) { return next(err); }
        req.session.destroy(function(err) { // Destroy the session
        if (err) { 
            return next(err); 
        }

        res.clearCookie('connect.sid', {
            httpOnly: true,
            sameSite: "strict",
        }); // Clear the session cookie
        
        res.redirect('/')
        });
    });
    });

export default router;