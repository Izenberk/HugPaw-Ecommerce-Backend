import express from "express";
import {
  signUp,
  login,
  logOut,
  getCurrentUser,
} from "../../../controller/authController.js";

import { requireAuth, requireAdmin } from "../../../middleware/auth.js";

const router = express.Router();

router.post("/api/v1/auth/signup", signUp);
router.post("/api/v1/auth/login", login);
router.post("/api/v1/auth/logout", requireAuth, logOut);
router.get("/api/v1/auth/me", requireAuth, getCurrentUser);
router.get("/api/v1/auth/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({ error: false, message: "Hello Admin" });
});

export default router;
