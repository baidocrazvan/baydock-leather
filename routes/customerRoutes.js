import express from "express";
import db from "../db.js";
import { authenticate, isAdmin } from "../middleware/middleware.js";
import { getUserAddresses } from "../services/addressService.js";

const router = express.Router();

router.get("/account", authenticate, async (req, res) => {
    try {
        const addresses = await getUserAddresses(req.user.id);

        res.render("account.ejs", {
            user: req.user,
            addresses: addresses || []
        });

    } catch(err) {
        console.error("Error fetching account data", err);
    }
})

router.get("/addresses", authenticate, async (req, res) => {
    try {
        const addresses = await getUserAddresses(req.user.id);

        res.render("addresses.ejs", {
            addresses: addresses || []
        })
    } catch(err) {
        console.error("Error fetching shipping data", err);
    }
})

export default router;