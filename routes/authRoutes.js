import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import db from "../db.js";
import Joi from "joi";
import { validateLogin, validateRegister } from "../middleware/validationMiddleware.js";

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
router.post("/login", validateLogin,
  passport.authenticate("local", {
    // Use message from Passport strategy
    failureFlash: true,
    successRedirect: "/",
    failureRedirect: "/auth/login",
    
  }));

// POST register a user
router.post("/register", validateRegister, async (req, res) => {
    const { lastName, firstName, email, password, cpassword: confirmPassword } = req.body;
    const role = "user";
  
    try {
  
      if (password !== confirmPassword) {
        req.flash("error", "Password does not match confirmation password");
        res.redirect("/auth/register");
      } else {
  
          const checkResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  
          if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already exists. Please log in.');
            res.redirect("/auth/register");
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
                console.error(err);
                req.flash("success", "Account registered successfully");
                res.redirect("/")
              })
            }
        })
      }
      } 
  
    } catch (err) {
      req.flash('error', 'Registration failed.');
      res.redirect("auth/register");
      console.log(err);
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