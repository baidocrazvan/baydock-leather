import express from "express";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getAllProducts, getProductById } from "../services/productService.js";
import { getAllOrders } from "../services/adminService.js";
import { getOrderDetails } from "../services/orderService.js";

const router = express.Router();
// GET admin dashboard
router.get("/dashboard", authenticate, isAdmin, async (req, res) => {
try {
    const products = await getAllProducts();
    console.log(products);
    res.render("admin/dashboard.ejs", { products });
} catch(err) {
    console.error("GET error for admin-dashboard:", err);
    res.redirect("/");
}
});

// GET modify-products page
router.get("/modify-product/:id", authenticate, isAdmin, async(req, res) => {
    const productId = req.params.id;
    const product = await getProductById(productId);
    res.render("admin/modify-product.ejs", { productId, product });
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
        res.redirect("/admin/dashboard");
    }
})

// GET a specific order
router.get("/orders/:id", authenticate, isAdmin, async(req, res) => {
    try {
        const order = await getOrderDetails(req.params.id);
        res.render("admin/order.ejs", {
            order,
            sameAddress: order.shippingAddress.street === order.billingAddress.street,
        })
    } catch(err) {
        console.error("GET error fetching specific order:", err);
        req.flash("error", "Cannot get details about this order");
        res.redirect("/admin/orders");
    }
})

// TO DO: Add route to see and render all orders, and then to be able to change their status from pending to shipped or completed
export default router;