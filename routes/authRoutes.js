import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import db from "../db.js";
import Joi from "joi";
import { validateLogin, validateRegister } from "../middleware/validationMiddleware.js";
import { updateCartItem } from "../services/cartService.js";

const saltRounds = 10;
const router = express.Router();

// GET login page
router.get("/login", (req, res) => {
  const errors = req.flash('error');
  res.render("auth/login.ejs", { errors });
  });

// GET register page
router.get("/register", (req, res) => {
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

    req.login(user, async (err) => {
      if (err) {
        console.error("Error logging in:", err);
        req.flash("error", "Login failed.");
        return res.redirect("/auth/login");
      }

      // Restore the guest cart after session regeneration
      req.session.cart = guestCart;

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
  
    try {
  
      if (password !== confirmPassword) {
        req.flash("error", "Password does not match confirmation password");
        return res.redirect("/auth/register");
      } else {

          // Temporarily store the guest cart ( req.session gets reset during registration or login and cart data is lost otherwise)
          const guestCart = req.session.cart || [];

          // Check if email already exists
          const checkResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
          if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already exists. Please log in.');
            return res.redirect("/auth/register");
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

              // Log user in
              req.login(user, async (err) => {
                if (err) {
                  console.error("Error logging in after registration: ", err);
                  req.flash("error", "Registration successful, but login failed.");
                  return res.redirect("/auth/login");
                }
              
                // Restore the guest cart after session regeneration
                req.session.cart = guestCart;
              
                try {
                  // Merge guest cart into user's cart
                  if (req.session.cart && req.session.cart.length > 0) {
                    const userId = req.user.id;
              
                    for (const item of req.session.cart) {
                      await updateCartItem(userId, item.productId, item.quantity);
                    }
              
                    // Clear guest cart after merge
                    req.session.cart = [];
                  }
                  req.flash("success", "Account registered successfully");
                  return res.redirect("/");
                } catch (mergeErr) {
                  console.error("Error merging guest cart:", mergeErr);
                  req.flash("error", "Registration successful, but failed to merge guest cart contents.");
                  return res.redirect("/");
                }
                
              })
            }
        })
      }
      } 
  
    } catch (err) {
      console.error("Registration error:", err);
      req.flash("error", "Registration failed.");
      res.redirect("/auth/register");
    }
  });

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