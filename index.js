import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import env from "dotenv";

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
app.use(bodyParser.urlencoded({extended: true})); // Middleware
app.use((req, res, next) => {
  res.locals.year = new Date().getFullYear();
  next();
}) // Middleware for creating local variable year to use inside the footer.



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


app.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0]
      console.log(user);
      const hashedPassword = user.password; // Hashed password during registration process

      bcrypt.compare(password, hashedPassword, (err, result) => { // Compare user password against bcrypt hash from db
        if (err) {
          console.log("Error comparing passwords:", err);
        } else {
          if (result) {
            res.send("Succesfully logged in!");
          } else {
            res.send("Incorrect password!");
          }
        }
      })  
    } else {
      res.send("User not found. Try registering first.");
    }
  } catch (err) {
    console.log(err);
  }

});

app.post("/api/register", async (req, res) => {
  const lastName = req.body.lastname
  const firstName = req.body.firstname;
  const email = req.body.email;
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
          res.send("ERROR: Email already exists. Did you mean to log in?")
        } else {
            // Hashing password using bcrypt
            bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
              console.log("Error hashing password:", err);
            } else {
              const result = await db.query("INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)", [
              firstName, lastName, email, hash, role
            ]);

            console.log(result);
            res.send("Succesfully registered!");
        }
      })
    }
    } 


  } catch (err) {
    console.log(err);
  }
});

app.post("/api/logout", (req, res) => {
  // Clear session cookie when user logs out
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


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

