import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";

const router = express.Router();

router.get("/account", authenticate, async (req, res) => {
    try {
        const addressesResult = await db.query(
            `SELECT * FROM shipping_addresses WHERE id = $1`,
            [req.user.id]
        );

        res.render("account.ejs", {
            user: req.user,
            addresses: addressesResult.rows
        });

    } catch(err) {
        console.error("Error fetching account data", err);
    }
})

export default router;