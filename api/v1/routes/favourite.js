import express from "express";
import {
  addToFavoriteById,
  clearFavoriteById,
  deleteFavoriteById,
  getAllFavoriteById,
  getProductById,
  updateFavoriteById,
} from "../../../controller/favoriteController.js";
import { requireAuth } from "../../../middleware/auth.js";

const router = express.Router();

//Add item to user favorite
router.use("api/v1/favorite/addItem", requireAuth, addToFavoriteById);

// Get favorite by userId
router.use("api/v1/favorite/getAll", requireAuth, getAllFavoriteById);

// Get product in favorite by Id
router.use("api/v1/favorite/getProduct", requireAuth, getProductById);

// Update favorite by Id
router.use("api/v1/favorite/updateFav", requireAuth, updateFavoriteById);

//Delete favorite by userId
router.use("api/v1/favorite/deleteById", requireAuth, deleteFavoriteById);

// Clear favorite by userId
router.use("api/v1/favorite/clearFav", requireAuth, clearFavoriteById);

export default router;
