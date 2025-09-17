import express from "express";
import {
  signUp,
  login,
  logOut,
  getCurrentUser,
} from "../../../controller/authController.js";

import {
  requireAuth,
  requireAdmin,
  requireAuthUser,
} from "../../../middleware/auth.js";

const router = express.Router();

// User registration
router.post("/signup", signUp);

// User login
router.post("/login", login);

// User logout
router.post("/logout", requireAuth, requireAuthUser, logOut);

// Get current user
router.get("/me", requireAuth, requireAuthUser, getCurrentUser);

// Admin only route (test)
router.get(
  "/admin",
  requireAuth,
  requireAuthUser,
  requireAdmin,
  (req, res) => {
    res.json({ ok: true, message: "Admin access granted" });
  }
);

export default router;
