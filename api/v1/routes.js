import { Router } from "express";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import { attachUserFromJWT } from "./middleware/auth.js";
import { requireAdmin, requirePermission } from "./middleware/authAdmin.js";

const router = Router();

const app = express();
app.use(express.json());
app.use(attachUserFromJWT);

await mongoose.connect(process.env.MONGODB_URI);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Signup
app.post("/user/signup", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "email & password required" });
    }
    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(409)
        .json({ error: true, message: "Email already used" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role: "user" });

    res.status(201).json({ id: user._id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Login -> JWT
app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "email & password required" });
    }

    // ต้อง select('+passwordHash') ถ้าตั้ง select:false ไว้
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user)
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

app.post("/admin/products", requireAdmin, (req, res) => {
  res.json({ ok: true, message: "Product created (demo)" });
});

export default router;
