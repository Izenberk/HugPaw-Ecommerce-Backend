// import { Product } from "../models/products.js";

// // Create product
// export const createProduct = async (req, res, next) => {
//   try {
//     const { sku, attributes = [], unitPrice = 0, stockAmount = 0 } = req.body;

//     // Check requirement
//     if (!sku) {
//       return res.status(400).json({ error: true, message: "sku is required" });
//     }

//     // Prevent duplicate
//     const exists = await Product.findOne({ sku });
//     if (exists) {
//       return res
//         .status(409)
//         .json({ error: true, message: "sku is already exists" });
//     }

//     const product = await Product.create({
//       sku,
//       attributes,
//       unitPrice,
//       stockAmount,
//     });

//     res.status(201).json({ error: false, product });
//   } catch (err) {
//     if (err?.code === 11000) {
//       return res
//         .status(409)
//         .json({ error: true, message: "sku already exists" });
//     }
//     next(err);
//   }
// };

// // Get all Products
// export const getProduct = async (req, res, next) => {
//   try {
//     const { q, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

//     const query = {};
//     if (q) query.sku = { $regex: q, $options: "i" };
//     if (minPrice || maxPrice) {
//       query.unitPrice = {};
//       if (minPrice) query.unitPrice.$gte = Number(minPrice);
//       if (maxPrice) query.unitPrice.$lte = Number(maxPrice);
//     }
//     const skip = (Number(page) - 1) * Number(limit);

//     const [products, total] = await Promise.all([
//       (await Product.find(query))
//         .toSorted({ createAt: -1 })
//         .skip(skip)
//         .limit(Number(limit)),
//       Product.countDocuments(query),
//     ]);

//     return res.json({
//       error: false,
//       page: Number(page),
//       limit: Number(limit),
//       total,
//       products,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // Get Product by Id
// export const getProductById = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const product = await Product.findById(id);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ error: true, message: "Product not found" });
//     }
//     return res.json({ error: false, product });
//   } catch (err) {
//     next(err);
//   }
// };

// // Edit Product
// export const updateProduct = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const allowed = ["sku", "attributes", "unitPrice", "stockAmount"];
//     const updates = {};
//     for (const key of allowed) {
//       if (req.body[key] !== undefined) updates[key] = req.body[key];
//     }

//     const product = await Product.findByIdAndUpdate(id, updates, {
//       new: true,
//       runValidators: true,
//     });

//     if (!product) {
//       return res
//         .status(404)
//         .json({ error: true, message: "Product not found" });
//     }
//     return res.json({ error: false, product });
//   } catch (err) {
//     if (err?.code === 11000) {
//       return res
//         .status(409)
//         .json({ error: true, message: "sku already exists" });
//     }
//     next(err);
//   }
// };

// // Delete Product
// export const deleteProduct = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const product = await Product.findByIdAndDelete(id);
//     if (!product) {
//       return res
//         .status(404)
//         .json({ error: true, message: "Product not found" });
//     }
//     return res.json({ error: false, message: "Product deleted" });
//   } catch (err) {
//     next(err);
//   }
// };
