import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function attachUserFromJWT(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return next();

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("_id email role");
    req.user = user || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}
