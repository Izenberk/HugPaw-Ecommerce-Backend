// import express from "express";
// import {
//   createProduct,
//   getProducts,
//   getProductById,
//   updateProduct,
//   deleteProduct,
// } from "../../../controller/adminController.js";

// import {
//   requireAuth,
//   requireAdmin,
//   requireAuthUser,
// } from "../../../middleware/auth.js";

// const router = express.Router();

// // Create product
// router.post(
//   "/api/v1/admin/products",
//   requireAuth,
//   requireAuthUser,
//   requireAdmin,
//   createProduct
// );

// // Get all products
// router.get(
//   "/api/v1/admin/products",
//   requireAuth,
//   requireAuthUser,
//   requireAdmin,
//   getProducts
// );

// // Get product by Id
// router.get(
//   "/api/v1/admin/products/:id",
//   requireAuth,
//   requireAuthUser,
//   requireAdmin,
//   getProductById
// );

// // Edit product
// router.put(
//   "/api/v1/admin/products/:id",
//   requireAuth,
//   requireAuthUser,
//   requireAdmin,
//   updateProduct
// );

// // Delete product
// router.delete(
//   "/api/v1/admin/products/:id",
//   requireAuth,
//   requireAuthUser,
//   requireAdmin,
//   deleteProduct
// );

// export default router;
