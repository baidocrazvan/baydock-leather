import express from "express";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

router.get("/dashboard", authenticate, isAdmin, (req, res) => {
    res.render("admin-dashboard.ejs");
});

// TO DO: Add route to see and render all orders, and then to be able to change their status from pending to shipped or completed
export default router;