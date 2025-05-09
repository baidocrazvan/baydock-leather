import express from "express";
import db from '../db.js'
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getAllProducts, getProductById } from "../services/productService.js";
import { getAllOrders } from "../services/adminService.js";
import { getOrderDetails } from "../services/orderService.js";
import { getAllUsers, getUserDetails } from "../services/userService.js";
import { validateRegister } from "../middleware/validationMiddleware.js";
import bcrypt from "bcryptjs";

const saltRounds = 10;
const router = express.Router();

// GET admin dashboard
router.get("/products", authenticate, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const search = req.query.search || '';
        
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
        
        res.render("admin/products.ejs", { 
            products: products.rows,
            page,
            pages,
            total,
            limit,
            search
        });
    } catch(err) {
        console.error("GET error for admin-products:", err);
        req.flash('error', 'Error loading products');
        res.redirect("/admin/products.ejs");
    }
});

// GET add-products page
router.get("/add-product", authenticate, isAdmin, async(req, res) => {
    return res.render("admin/add-products.ejs");
})

// GET modify-products page
router.get("/modify-product/:id", authenticate, isAdmin, async(req, res) => {
    const productId = req.params.id;
    const product = await getProductById(productId);
    return res.render("admin/modify-product.ejs", { productId, product });
})

// GET all orders
router.get("/orders", authenticate, isAdmin, async(req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const orders = await getAllOrders(searchTerm);
        return res.render("admin/order-list.ejs", { 
            orders,
            searchQuery: searchTerm 
        })

    } catch(err) {
        console.error("GET error rendering all orders page (admin):" , err);
        return res.redirect("/admin/dashboard");
    }
})

// GET a specific order
router.get("/orders/:id", authenticate, isAdmin, async(req, res) => {
    try {
        const order = await getOrderDetails(req.params.id);
        return res.render("admin/order.ejs", {
            order,
            sameAddress: order.shippingAddress.street === order.billingAddress.street,
        })
    } catch(err) {
        console.error("GET error fetching specific order:", err);
        req.flash("error", "Cannot get details about this order");
        return res.redirect("/admin/orders");
    }
})

// PATCH route for changind order status
router.patch("/orders/:id", authenticate, isAdmin, async(req, res) => {
    try{
        const orderId = req.params.id;
        const newStatus = req.body.status;
        await db.query(`UPDATE orders SET status = $1 WHERE id = $2`,
        [newStatus, orderId]
        );

        req.flash("success", "Order status updated successfully")
        return res.redirect(`/admin/orders/${orderId}`);
    } catch(err) {
        console.error("PATCH error updating order status", err);
        req.flash("error", "Failed to update order status");
        return res.redirect("/admin/orders");
    }
})

// GET route for getting users list
router.get("/users", authenticate, isAdmin, async (req, res) => {
    try{
        const users = await getAllUsers();
        return res.render("admin/user-list.ejs", { users });

    } catch(err) {
        console.error("Error fetching users:", err);
        return res.redirect("/admin/dashboard.ejs");
    }
});

// GET route for details of a specific user
router.get('/users/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const userDetails = await getUserDetails(req.params.id);
        return res.render("admin/user.ejs", userDetails);
    } catch (err) {
        console.error("GET Error fetching user details:", err);
        return res.redirect("/admin/users");
    }
  });

// GET route for admin account registration
router.get("/create", authenticate, isAdmin, async(req, res) => {
    return res.render("admin/register.ejs");
})

// POST protected register an admin account 
router.post("/create", validateRegister, authenticate, isAdmin, async (req, res) => {
    const { lastName, firstName, email, password, cpassword: confirmPassword } = req.body;
    const role = "admin";
  
    try {
  
      if (password !== confirmPassword) {
        req.flash("error", "Password does not match confirmation password");
        return res.redirect("/admin/create");
      } else {
        
          // Check if email already exists
          const checkResult = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
          if (checkResult.rows.length > 0) {
            req.flash('error', 'Email already exists. Please log in.');
            return res.redirect("/admin/create");
          } else {
              // Hash password using bcrypt
              bcrypt.hash(password, saltRounds, async (err, hash) => {
              if (err) {
                console.log("Error hashing password:", err);
                req.flash("Error hashing password. Try registering again later")
                return res.redirect("/admin/create")
              } else {
                const result = await db.query(
                  `INSERT INTO users (first_name, last_name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,[
                  firstName, lastName, email, hash, role
              ]);

              req.flash("success", "Registration successful.")
                return res.redirect("/admin/dashboard");
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

export default router;