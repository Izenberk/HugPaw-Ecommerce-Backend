import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization?.split(" ")[1];
    const token = bearer || req.cookies.accessToken;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || user.isDeleted) {
      return res.status(401).json({ error: true, message: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: true, message: "Unauthorized" });
  }
}

export function requireAuthUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: true, message: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: true, message: "Admin only" });
  }
  next();
}
