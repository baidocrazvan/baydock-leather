import express from "express";
import db from "../db.js";
import { authenticate, isAdmin, isDemo } from "../middleware/middleware.js";
import { getProductById } from "../services/productService.js";
import { getOrderDetails, getAllOrders } from "../services/orderService.js";
import { getAllUsers, getUserDetails } from "../services/userService.js";
import { validateAdminRegister } from "../middleware/validationMiddleware.js";
import bcrypt from "bcryptjs";

const saltRounds = 10;
const router = express.Router();

// GET admin dashboard
router.get("/dashboard", authenticate, isAdmin, async (req, res) => {
  try {
    return res.render("admin/dashboard.ejs", {
      user: req.user,
    });
  } catch (err) {
    console.error("GET admin/dashboard error:", err);
    return res.redirect("/");
  }
});

// GET all products
router.get("/products", authenticate, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || "";

    // Get total count for pagination
    const countQuery = search
      ? `SELECT COUNT(*) FROM products WHERE name ILIKE $1 OR id::text ILIKE $1`
      : `SELECT COUNT(*) FROM products`;
    const countParams = search ? [`%${search}%`] : [];
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limit);

    // Get paginated products
    const offset = (page - 1) * limit;
    let productsQuery = `SELECT * FROM products`;
    let queryParams = [];

    if (search) {
      productsQuery += ` WHERE name ILIKE $1 OR id::text ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    productsQuery += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const products = await db.query(productsQuery, queryParams);

    return res.render("admin/products.ejs", {
      products: products.rows,
      page,
      pages,
      total,
      limit,
      search,
    });
  } catch (err) {
    console.error("GET error for admin-products:", err);
    req.flash("error", "Error loading products");
    return res.redirect("/admin/products.ejs");
  }
});

// GET add-products page
router.get("/add-product", authenticate, isAdmin, async (req, res) => {
  return res.render("admin/add-products.ejs");
});

// GET modify-products page
router.get("/modify-product/:id", authenticate, isAdmin, async (req, res) => {
  const productId = req.params.id;
  const product = await getProductById(productId);
  return res.render("admin/modify-product.ejs", { productId, product });
});

// GET all orders
router.get("/orders", authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    // Get paginated and filtered orders
    const { orders, total } = await getAllOrders(search, limit, offset);

    const totalPages = Math.ceil(total / limit);

    return res.render("admin/order-list.ejs", {
      orders,
      currentPage: parseInt(page),
      totalPages,
      searchQuery: search,
    });
  } catch (err) {
    console.error("GET error rendering all orders page (admin):", err);
    return res.redirect("/admin/dashboard");
  }
});

// GET a specific order
router.get("/orders/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const order = await getOrderDetails(req.params.id);
    return res.render("admin/order.ejs", {
      order,
      sameAddress: order.shippingAddress.street === order.billingAddress.street,
    });
  } catch (err) {
    console.error("GET error fetching specific order:", err);
    req.flash("error", "Cannot get details about this order");
    return res.redirect("/admin/orders");
  }
});

// GET route for getting users list
router.get("/users", authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    // Get paginated and filtered users
    const { users, total } = await getAllUsers(search, limit, offset);

    const totalPages = Math.ceil(total / limit);

    return res.render("admin/user-list.ejs", {
      users,
      currentPage: parseInt(page),
      totalPages,
      searchQuery: search,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.redirect("/admin/dashboard");
  }
});

// GET route for details of a specific user
router.get("/users/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const userDetails = await getUserDetails(req.params.id);
    return res.render("admin/user.ejs", userDetails);
  } catch (err) {
    console.error("GET Error fetching user details:", err);
    return res.redirect("/admin/users");
  }
});

// GET route for admin account registration
router.get("/create", authenticate, isAdmin, async (req, res) => {
  try {
    return res.render("admin/register.ejs");
  } catch (err) {
    console.error("GET error admin/create:", err);
    return res.redirect("/admin/dashboard");
  }
});

// POST protected register an admin account
router.post(
  "/create",
  isDemo,
  validateAdminRegister,
  authenticate,
  isAdmin,
  async (req, res) => {
    const {
      lastName,
      firstName,
      email,
      password,
      cpassword: confirmPassword,
    } = req.body;
    const role = "admin";

    try {
      if (password !== confirmPassword) {
        req.flash("error", "Password does not match confirmation password");
        return res.redirect("/admin/create");
      } else {
        // Check if email already exists
        const checkResult = await db.query(
          `SELECT * FROM users WHERE email = $1`,
          [email]
        );
        if (checkResult.rows.length > 0) {
          req.flash("error", "Email already exists. Please log in.");
          return res.redirect("/admin/create");
        } else {
          // Hash password using bcrypt
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            if (err) {
              console.error("Error hashing password:", err);
              req.flash("Error hashing password. Try registering again later");
              return res.redirect("/admin/create");
            } else {
              await db.query(
                `INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
                [firstName, lastName, email, hash, role]
              );

              req.flash("success", "Registration successful.");
              return res.redirect("/admin/dashboard");
            }
          });
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      req.flash("error", "Registration failed.");
      return res.redirect("/admin/dashboard");
    }
  }
);

export default router;
