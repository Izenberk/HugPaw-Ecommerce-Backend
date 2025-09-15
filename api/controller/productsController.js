// server/api/v1/controllers/productController.js
import { Product } from "../../models/Product.js";
import mongoose from "mongoose";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const rx = (s) => new RegExp(String(s || "").trim(), "i");

// --- sanitizers -------------------------------------------------
function cleanAttributes(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ k: String(x?.k || "").trim(), v: String(x?.v || "").trim() }))
    .filter((x) => x.k && x.v);
}

function sanitizeCreate(body = {}) {
  return {
    sku: String(body.sku || "").trim().toUpperCase(),
    attributes: cleanAttributes(body.attributes),
    unitPrice: Number(body.unitPrice ?? body.basePrice ?? 0),
    stockAmount: Number(body.stockAmount ?? 0),
  };
}

// Only include fields caller actually sent (avoid wiping arrays on partial update)
function sanitizeUpdate(body = {}) {
  const out = {};
  if ("sku" in body) out.sku = String(body.sku || "").trim().toUpperCase();
  if ("attributes" in body) out.attributes = cleanAttributes(body.attributes);
  if ("unitPrice" in body || "basePrice" in body)
    out.unitPrice = Number(body.unitPrice ?? body.basePrice ?? 0);
  if ("stockAmount" in body) out.stockAmount = Number(body.stockAmount ?? 0);
  return out;
}

// --- query helpers ----------------------------------------------
function buildAttrFilters(q) {
  const and = [];
  for (const [rawKey, val] of Object.entries(q || {})) {
    if (val == null || val === "") continue;
    if (["q", "sort", "limit", "page"].includes(rawKey)) continue;
    const m = /^attr\[(.+)\]$/i.exec(rawKey);
    const key = m ? m[1] : rawKey; // also accept ?Type=Collar
    and.push({ attributes: { $elemMatch: { k: key, v: String(val) } } });
  }
  return and.length ? { $and: and } : {};
}

function pickSort(sort) {
  const allowed = new Set([
    "-updatedAt",
    "updatedAt",
    "sku",
    "-unitPrice",
    "unitPrice",
    "-stockAmount",
    "stockAmount",
  ]);
  return allowed.has(sort) ? sort : "-updatedAt";
}

// --- controllers -----------------------------------------------

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const data = sanitizeCreate(req.body);
    if (!data.sku) return res.status(400).json({ error: true, message: "SKU required" });

    // prevent SKU clash (unique index helps, but give a nice error)
    const exists = await Product.findOne({ sku: data.sku });
    if (exists) return res.status(409).json({ error: true, message: "SKU already exists" });

    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

// Get all products (with search, filters, sort)
export const getProducts = async (req, res) => {
  try {
    const { q = "", sort = "-updatedAt", limit = 200 } = req.query;

    const text = q
      ? {
          $or: [
            { sku: rx(q) },
            { attributes: { $elemMatch: { v: rx(q) } } }, // search values
          ],
        }
      : {};

    const filters = buildAttrFilters(req.query);
    const products = await Product.find({ ...text, ...filters })
      .sort(pickSort(sort))
      .limit(Math.min(Number(limit) || 200, 500));

    // FE expects { items: [...] }
    res.json({ items: products });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Get product by _id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: true, message: "Invalid _id" });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: true, message: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

// Update product by _id (partial)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: true, message: "Invalid _id" });

    const data = sanitizeUpdate(req.body);

    // SKU clash check (if sku is being changed)
    if (data.sku) {
      const clash = await Product.findOne({ sku: data.sku, _id: { $ne: id } });
      if (clash) return res.status(409).json({ error: true, message: "SKU already exists" });
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: true, message: "Product not found" });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

// Delete product by _id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: true, message: "Invalid _id" });

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: true, message: "Product not found" });

    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};
