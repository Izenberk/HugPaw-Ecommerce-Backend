import express from "express";
import {
  addToCartById,
  getAllCartById,
  getProductById,
  updateCartById,
  deleteCartById,
  clearCartById,
} from "../../../controller/cartController.js";
import { requireAuth } from "../../../middleware/auth.js";

const router = express.Router();

//Add item to user cart
router.use("api/v1/cart/addCart", requireAuth, addToCartById);

// Get cart by userId
router.use("api/v1/cart/allCart", requireAuth, getAllCartById);

// Get product in cart by Id
router.use("api/v1/cart/getProduct", requireAuth, getProductById);

//Update cart by Id
router.use("api/v1/cart/updateCart", requireAuth, updateCartById);

//Delete cart by Id
router.use("api/v1/cart/deleteCart", requireAuth, deleteCartById);

// Clear cart
router.use("api/v1/cart/clearCart", requireAuth, clearCartById);

export default router;
