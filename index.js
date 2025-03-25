import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";
import bcrypt from "bcryptjs";
import env from "dotenv";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
import pgSession from 'connect-pg-simple';
import { Strategy } from "passport-local";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";


const app = express();
const port = 3000;
env.config();

// Middlewares
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


// Initialize connect-pg-simple
const PgSession = pgSession(session);

// Session and store initialization
app.use(
  session({
    store: new PgSession({
      pool: db, // Use the imported db pool
      tableName: 'session',
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: 'strict',
      // secure: true, // Enable in production (requires HTTPS)
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
// Use flash middleware for succes, error or information messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
})


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

// Cart endpoints
app.use("/api", cartRoutes);


// Order endpoints
app.use("/api", orderRoutes);

// Shipping addresses endpoints

app.use("/api", shippingRoutes);



passport.use(new Strategy(async function verify(username, password, cb) {
  
  try {
    const result = await db.query(`SELECT * FROM users WHERE email = $1`, [username]);
    
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
            return cb(null, false, { message: "Incorrect password" });
          }
        }
      });

    } else {
      return cb(null, false, { message: "User not found" });
    }
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user.id);
})

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      cb(null, user);
    } else {
      cb("User not found", null);
    }
  } catch (err) {
    cb(err, null);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

