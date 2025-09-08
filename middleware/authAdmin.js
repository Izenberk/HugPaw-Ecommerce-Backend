export function requireAuth(req, res, next) {
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
