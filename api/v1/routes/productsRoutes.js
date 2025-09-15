import {Router} from 'express'
import{
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from '../../controller/productsController.js'

const router = Router();

// Create
router.post("/products", createProduct);

// List (supports ?q=, ?attr[Type]=Collar, ?sort=-updatedAt)
router.get("/products", getProducts);

// Read
router.get("/products/:id", getProductById);

// Update (partial by default). Keep PATCH, and also expose PUT as an alias.
router.patch("/products/:id", updateProduct);
router.put("/products/:id", updateProduct);

// Delete (hard delete)
router.delete("/products/:id", deleteProduct);

export default router;