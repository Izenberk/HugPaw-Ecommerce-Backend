import {Router} from 'express'
import{
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from '../../../controller/productsController.js'

const router = Router()

// Create a new product
router.post('/products', createProduct)

// Get all products
router.get('/products', getProducts)

// Get product by id
router.get('/products/:id', getProductById)

// Update product by id
router.patch('/products/:id', updateProduct)

// Delete product by id
router.delete('/products/:id', deleteProduct)

export default router