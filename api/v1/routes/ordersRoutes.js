import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} from '../../controller/ordersController.js';

const router = Router();

// Create a new order
router.post('/orders', createOrder);

// Get all orders
router.get('/orders', getOrders);

// Get order by id
router.get('/orders/:id', getOrderById);

// Update order by id
router.patch('/orders/:id', updateOrder);

// Delete order by id
router.delete('/orders/:id', deleteOrder);

export default router;
