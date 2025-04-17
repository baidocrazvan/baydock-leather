import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getActiveUserAddresses } from "../services/addressService.js";

const router = express.Router();

router.get("/account", authenticate, async (req, res) => {
    try {
        const addresses = await getActiveUserAddresses(req.user.id);

        res.render("user/account.ejs", {
            user: req.user,
            addresses: addresses || []
        });

    } catch(err) {
        console.error("Error fetching account data", err);
        res.render("user/account.ejs", {
            user: req.user,
            addresses: []
        });
    }
})

router.get("/addresses", authenticate, async (req, res) => {
    try {
        const addresses = await getActiveUserAddresses(req.user.id);

        res.render("user/addresses.ejs", {
            addresses: addresses || []
        })
    } catch(err) {
        console.error("Error fetching shipping data", err);
        res.render("user/addresses.ejs", {
            addresses: []
        })
    }
})

export default router;