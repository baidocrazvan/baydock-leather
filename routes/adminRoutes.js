import express from "express";
import db from '../db.js'
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getAllProducts, getProductById } from "../services/productService.js";
import { getAllOrders } from "../services/adminService.js";
import { getOrderDetails } from "../services/orderService.js";
import { getAllUsers, getUserDetails } from "../services/userService.js";

const router = express.Router();

// GET admin dashboard
router.get("/dashboard", authenticate, isAdmin, async (req, res) => {
try {
    const products = await getAllProducts();
    return res.render("admin/dashboard.ejs", { products });
} catch(err) {
    console.error("GET error for admin-dashboard:", err);
    return res.redirect("/");
}
});

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


export default router;