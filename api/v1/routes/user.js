import express from "express";
import {
  getUserById,
  editUserById,
  softDeleteUserById,
  hardDeleteUserById,
} from "../../../controller/userController.js";

import {
  requireAuth,
  requireAuthUser,
  requireAdmin,
} from "../../../middleware/auth.js";

const router = express.Router();

// Get user profile by Id (login required)
router.get("/api/v1/users/:id", requireAuth, requireAuthUser, getUserById);

// Edit user profile by Id (login required)
router.put("/api/v1/users/:id", requireAuth, requireAuthUser, editUserById);

// Soft delete user (user or admin)
router.delete(
  "/api/v1/users/:id/soft",
  requireAuth,
  requireAuthUser,
  softDeleteUserById
);

// Hard delete user (admin only)
router.delete(
  "/api/v1/users/:id",
  requireAuth,
  requireAdmin,
  hardDeleteUserById
);

// // Forget password
// router.post("/api/v1/users/forgot-password", forgetPassword);

// // reset password
// router.post("/api/v1/users/forgot-password", resetPassword);

export default router;
