import {Product} from '../../models/Product.js'
import mongoose from "mongoose";

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Get product by _id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};


// Update product by _id
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};


// Delete product by _id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params; // id จริง ๆ คือ _id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: true, message: "Product not found" });
    }

    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};
