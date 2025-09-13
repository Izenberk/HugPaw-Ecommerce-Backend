import express from "express";
import {
  signUp,
  login,
  logOut,
  getCurrentUser,
} from "../../../controller/authController.js";

import { requireAuth, requireAdmin } from "../../../middleware/auth.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/logout", requireAuth, logOut);
router.get("/me", requireAuth, getCurrentUser);
router.get("/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({ error: false, message: "Hello Admin" });
});

export default router;
