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
app.get("/login", (req,res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});


app.post("/api/login", (req, res) => {


});

app.post("/api/register", async (req, res) => {
 
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

