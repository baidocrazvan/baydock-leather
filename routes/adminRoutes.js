import express from "express";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

router.get("/dashboard", authenticate, isAdmin, (req, res) => {
    res.render("admin-dashboard.ejs");
});


export default router;