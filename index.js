import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import env from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";


const app = express();
const port = 3001;
const saltRounds = 10;
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
})

db.connect();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
}) // Middleware for creating local year variable to use inside the footer.

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
  }
})
);

app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
  res.render("index.ejs");
});



// Authentication endpoints
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/loggedin", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("loggedin.ejs")
  } else {
    res.redirect("/login")
  }
});

app.post("/api/login", passport.authenticate("local", {
  successRedirect: "/loggedin",
  failureRedirect: "/login"
}));

app.post("/api/register", async (req, res) => {
  const lastName = req.body.lastname
  const firstName = req.body.firstname;
  const email = req.body.username;
  const password = req.body.password;
  const confirmPassword = req.body.cpassword;
  const role = "user";
  console.log(lastName)
  console.log(firstName)
  console.log(email)
  console.log(password)
  console.log(confirmPassword)

  try {

    if (password !== confirmPassword) {
      res.send("Password does not match confirmation password");
    } else {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
          res.send("Email already exists. Did you mean to log in?")
        } else {
            // Hashing password using bcrypt
            bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
              console.log("Error hashing password:", err);
            } else {
              const result = await db.query(
                "INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *",[
                firstName, lastName, email, hash, role
            ]);
            const user = result.rows[0];
            console.log(user);
            req.login(user, (err) => {
              console.log(err)
              res.redirect("/loggedin")
            })
        }
      })
    }
    } 


  } catch (err) {
    console.log(err);
  }
});

app.post("/api/logout", function(req, res, next) { // Clear session cookie when user logs out
  req.logout((err) => { // Removes the req.user property and ends user's session
    if (err) { return next(err); }

    req.session.destroy(function(err) { // Destroy the session
      if (err) { return next(err); }

      res.clearCookie('connect.sid', {
        httpOnly: true,
        sameSite: "strict",
      }); // Clear the session cookie

      res.status(200).send('Logged out');
    });
  });
});




// Product endpoints
app.get("/api/products", (req, res) => {

}); // Get all products

app.get("/api/products/:id", (req, res) => {

}); // Get a product by id

app.post("/api/products", (req, res) => {

}); // Add a new product (admin)

app.put("/api/products/:id", (req, res) => {

}); // Update a product (admin)

app.delete("/api/products/:id", (req, res) => {

}); //Delete a product (admin)


// Cart endpoints
app.get("/api//cart", (req, res) => {

});

app.post("/api/cart", (req, res) => {

}); // Add a product to the cart.

app.put("/api/cart/:id", (req, res) => {

}); // Update the quantity of a product in the cart.

app.delete("/api/cart/:id", (req, res) => {

}); // Remove a product from the cart


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

