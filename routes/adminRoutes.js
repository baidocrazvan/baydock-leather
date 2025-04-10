import express from "express";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getAllProducts, getProductById } from "../services/productService.js";
import { getAllOrders } from "../services/orderService.js";

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
        const orders = await getAllOrders();
        return res.render("admin/orders.ejs", { orders })
    } catch(err) {
        console.error("GET error rendering all orders page (admin):" , err);
        res.redirect("/admin/dashboard");
    }
})

// TO DO: Add route to see and render all orders, and then to be able to change their status from pending to shipped or completed
export default router;