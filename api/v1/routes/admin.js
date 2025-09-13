
// Admin only route
router.get("/api/v1/auth/admin", requireAuth, requireAuthUser, requireAdmin);

