import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";
import bcrypt from "bcryptjs";
import env from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";


const app = express();
const port = 3000;
env.config();

// Middlewares
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Session initialization
app.use(
  session({
  secret: process.env.SESSION_SECRET,
  resave: false, // TODO: use express-session with postgress to store session
  saveUninitialized: true, // save uninitialized session into the server memory
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // time until cookie expires, in miliseconds, totals 24hours
    httpOnly: true,
    sameSite: 'strict',
    // secure: true -> necessary for production environments
  }
})
);

app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
  res.render("index.ejs");
});

// Authentication endpoints
app.use("/auth", authRoutes)

app.get("/loggedin", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("loggedin.ejs", { user: req.user })
  } else {
    res.redirect("auth/login")
  }
});

app.use("/admin", adminRoutes)


// Product endpoints
app.use("/api", productRoutes);

app.use("/api", cartRoutes);
// Cart endpoints
// app.get("/api/cart", (req, res) => {

// });

// app.post("/api/cart", (req, res) => {

// }); // Add a product to the cart.

// app.put("/api/cart/:id", (req, res) => {

// }); // Update the quantity of a product in the cart.

// app.delete("/api/cart/:id", (req, res) => {

// }); // Remove a product from the cart


// Order endpoints
app.post("/api/orders", (req, res) => {

}); // Place an order

app.get("/api//orders", (req, res) => {

}); // Get a user's order history

app.get("/api/orders/:id", (req, res) => {

}); // Get details of a specific order


passport.use(new Strategy(async function verify(username, password, cb) {
  
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0]
      console.log(user);
      const hashedPassword = user.password; // Hashed password created during registration process

      bcrypt.compare(password, hashedPassword, (err, result) => { // Compare user password against bcrypt hash from db
        if (err) {
          return cb(err)
        } else {
          if (result) {
            return cb(null, user)
          } else {
            return cb(null, false)
          }
        }
      })

    } else {
      return cb("User not found")
    }
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
})

passport.deserializeUser((user, cb) => {
  cb(null, user);
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

