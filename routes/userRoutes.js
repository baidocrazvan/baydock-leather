import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getActiveUserAddresses } from "../services/addressService.js";
import { getOrdersForUser } from "../services/orderService.js";

const router = express.Router();

router.get("/account", authenticate, async (req, res) => {
    try {
        const userId = req.user.id
        const addresses = await getActiveUserAddresses(userId);
        const orders = await getOrdersForUser(userId);

        return res.render("user/account.ejs", {
            user: req.user,
            addresses: addresses || [],
            orders: orders || []
        });

    } catch(err) {
        console.error("Error fetching account data", err);
        return res.render("user/account.ejs", {
            user: req.user,
            addresses: [],
            orders: []
        });
    }
})

router.get("/addresses", authenticate, async (req, res) => {
    try {
        const addresses = await getActiveUserAddresses(req.user.id);

        return res.render("user/addresses.ejs", {
            addresses: addresses || []
        })
    } catch(err) {
        console.error("Error fetching shipping data", err);
        return res.render("user/addresses.ejs", {
            addresses: []
        })
    }
})

export default router;