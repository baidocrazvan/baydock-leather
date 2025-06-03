import express from "express";
import bodyParser from "body-parser";
import db from "./db.js";
import bcrypt from "bcryptjs";
import env from "dotenv";
import session from "express-session";
import flash from "express-flash";
import passport from "passport";
import pgSession from "connect-pg-simple";
import { Strategy } from "passport-local";
import methodOverride from "method-override";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = 3000;
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development"; // Default to .env.development

env.config({ path: envFile });

console.log(`Running in ${process.env.NODE_ENV} mode`);

// Middlewares
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize connect-pg-simple
const PgSession = pgSession(session);

// Session and store initialization
app.use(
  session({
    store: new PgSession({
      pool: db, // Use the imported db pool
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: "strict",
      // eslint-disable-next-line capitalized-comments
      // secure: true,  Enable in production (requires HTTPS)
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Use flash middleware for succes, error or information messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Pass user to every template
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// Use method-ovveride to enable PUT/PATCH/DELETE
app.use(methodOverride("_method"));

// Register delay middleware
app.use((req, res, next) => {
  if (req.path === "/register")
    setTimeout(next, 500); // 0.5s delay
  else next();
});

app.use(helmet()); // Security middleware

app.get("/", (req, res) => {
  res.render("index.ejs");
});

// Authentication endpoints
app.use("/auth", authRoutes);

app.get("/loggedin", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("loggedin.ejs", { user: req.user });
  } else {
    res.redirect("auth/login");
  }
});

// Admin endpoints
app.use("/admin", adminRoutes);

// Product endpoints
app.use("/products", productRoutes);

// Cart endpoints
app.use("/cart", cartRoutes);

// Order endpoints
app.use("/orders", orderRoutes);

// User addresses endpoints
app.use("/address", addressRoutes);

// User account endpoints
app.use("/user", userRoutes);

// Database cleanup for temporary carts
function startCleanupJob() {
  setInterval(
    async () => {
      try {
        const result = await db.query(
          `DELETE FROM pending_carts 
         WHERE created_at < NOW() - INTERVAL '7 days'`
        );
        console.log(`Cleaned up ${result.rowCount} expired pending carts`);
      } catch (err) {
        console.error("Failed to clean pending carts:", err);
      }
    },
    24 * 60 * 60 * 1000
  ); // 24 hours
}

// Start cleanup for temporary cart storage
(async () => {
  try {
    await db.query("SELECT 1"); // Test connection
    startCleanupJob();
    console.log("Cleanup job started");
  } catch (err) {
    console.error("Failed to start cleanup job:", err);
  }
})();

passport.use(
  new Strategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async function verify(email, password, cb) {
      try {
        const result = await db.query(`SELECT * FROM users WHERE email = $1`, [
          email,
        ]);

        if (result.rows.length > 0) {
          const initialUser = result.rows[0];
          const hashedPassword = initialUser.password; // Hashed password created during registration process

          bcrypt.compare(password, hashedPassword, (err, result) => {
            // Compare user password against bcrypt hash from db
            if (err) {
              return cb(err);
            } else {
              if (result) {
                // Create final user object without password field and pass it through
                const user = {
                  id: initialUser.id,
                  first_name: initialUser.first_name,
                  last_name: initialUser.last_name,
                  email: initialUser.email,
                  role: initialUser.role,
                  is_confirmed: initialUser.is_confirmed,
                  created_at: initialUser.created_at,
                };
                return cb(null, user);
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
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

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

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
