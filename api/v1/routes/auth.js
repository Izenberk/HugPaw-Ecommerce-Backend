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
router.post("/api/v1/auth/signup", signUp);

// User login
router.post("/api/v1/auth/login", requireAuth, requireAuthUser, login);

// User logout
router.post("/api/v1/auth/logout", requireAuth, requireAuthUser, logOut);

// Get current user
router.get("/api/v1/auth/me", requireAuth, requireAuthUser, getCurrentUser);

// Admin only route
router.get(
  "/api/v1/auth/admin",
  requireAuth,
  requireAuthUser,
  requireAdmin,
  (req, res) => {
    res.json({ ok: true, message: "Admin access granted" });
  }
);

export default router;
