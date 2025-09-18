// api/v1/routes/productsRoutes.js
import { Router } from "express";
import {
    createProduct, getProducts, getProductById, updateProduct, deleteProduct,
    variantAvailability, resolveVariant,
    inventoryAvailability,
} from "../controller/productsController.js";
import { variantsLimiter } from "../../../middleware/limiters.js";

const router = Router();

// CRUD
router.post("/products", createProduct);
router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.patch("/products/:id", updateProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Variants limiter
router.use("/variants", variantsLimiter);

// NEW variant-centric helpers (no DB change)
router.post("/variants/:sku/availability", variantAvailability);
router.post("/variants/:sku/resolve", resolveVariant);
router.post("/inventory/availability", inventoryAvailability);

export default router;
