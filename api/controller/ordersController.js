import mongoose from "mongoose";
import { Order } from "../../models/Order.js";

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Get order by _id
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Update order by _id
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const order = await Order.findByIdAndUpdate(id, req.body, { new: true });
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

// Delete order by _id
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};
