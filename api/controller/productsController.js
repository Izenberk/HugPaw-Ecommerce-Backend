// server/api/v1/controllers/productController.js
import { Product } from "../../models/Product.js";
import mongoose from "mongoose";
import { computeSkuFromAttributes } from "../../utils/sku.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const rx = (s) => new RegExp(String(s || "").trim(), "i");
const isDup = (e, key) => e?.code === 11000 && e?.keyPattern?.[key];

function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* ---------------------- filters: case-insensitive ---------------------- */
function buildAttrFilters(q) {
  const and = [];
  for (const [rawKey, val] of Object.entries(q || {})) {
    if (val == null || val === "") continue;
    if (["q","sort","limit","page"].includes(rawKey)) continue;
    const m = /^attr\[(.+)\]$/i.exec(rawKey);
    const k = m ? m[1] : rawKey; // also accept ?Type=Collar
    and.push({
      attributes: {
        $elemMatch: {
          k: new RegExp(`^${escRe(k)}$`, "i"),
          v: new RegExp(`^${escRe(val)}$`, "i"),
        },
      },
    });
  }
  return and.length ? { $and: and } : {};
}

/* --------------------------- helpers / guards -------------------------- */
function cleanAttributes(list = []) {
  // trim + drop empties + last-write-wins by key
  const cleaned = (Array.isArray(list) ? list : [])
    .map(x => ({ k: String(x?.k || "").trim(), v: String(x?.v || "").trim() }))
    .filter(x => x.k && x.v);
  const byKey = new Map();
  for (const x of cleaned) byKey.set(x.k, x); // last wins
  return Array.from(byKey.values());
}

function getAttrCI(list = [], key) {
  const want = String(key || "").toLowerCase();
  for (const a of Array.isArray(list) ? list : []) {
    const k = String(a?.k || "").trim().toLowerCase();
    if (k === want) return String(a?.v || "").trim();
  }
  return "";
}

function isAddonKind(attrs = []) {
  const k = getAttrCI(attrs, "Kind");
  return /^(addon|add\-on)$/i.test(k || "");
}

/* ------------------------------- sanitizers ---------------------------- */
function sanitizeCreate(body = {}) {
  const attributes = cleanAttributes(body.attributes);

  // Guard: Add-ons must declare compatibility
  if (isAddonKind(attributes)) {
    const compat = getAttrCI(attributes, "For Type");
    if (!compat) throw new Error("For Type is required for add-ons");
  }

  return {
    sku: String(body.sku || "").trim().toUpperCase(),
    attributes,
    unitPrice: Number(body.unitPrice ?? body.basePrice ?? 0),
    stockAmount: Number(body.stockAmount ?? 0),
  };
}

// Only include fields caller actually sent (avoid wiping arrays on partial update)
function sanitizeUpdate(body = {}) {
  const out = {};

  if ("sku" in body) out.sku = String(body.sku || "").trim().toUpperCase();

  if ("attributes" in body) {
    const attributes = cleanAttributes(body.attributes);

    if (isAddonKind(attributes)) {
      const compat = getAttrCI(attributes, "For Type");
      if (!compat) throw new Error("For Type is required for add-ons");
    }

    out.attributes = attributes;
  }

  if ("unitPrice" in body || "basePrice" in body) {
    out.unitPrice = Number(body.unitPrice ?? body.basePrice ?? 0);
  }
  if ("stockAmount" in body) {
    out.stockAmount = Number(body.stockAmount ?? 0);
  }

  return out;
}

/* -------------------------------- sorting ------------------------------ */
function pickSort(sort) {
  const allowed = new Set([
    "-updatedAt", "updatedAt", "sku",
    "-unitPrice", "unitPrice",
    "-stockAmount", "stockAmount",
  ]);
  return allowed.has(sort) ? sort : "-updatedAt";
}

/* ------------------------------- controllers --------------------------- */

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const data = sanitizeCreate(req.body);

    // If SKU missing, compute from attributes (non-locking fallback)
    if (!data.sku) {
      data.sku = computeSkuFromAttributes(data.attributes);
    }
    if (!data.sku) {
      return res.status(400).json({ error: true, message: "SKU required" });
    }

    // Friendly clash check (index will also enforce)
    const exists = await Product.findOne({ sku: data.sku });
    if (exists) return res.status(409).json({ error: true, message: "SKU already exists" });

    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    if (isDup(err, "sku"))    return res.status(409).json({ error: true, message: "SKU already exists" });
    if (isDup(err, "fpHash")) return res.status(409).json({ error: true, message: "A product with these attributes already exists" });
    return res.status(400).json({ error: true, message: err.message });
  }
};

// Get all products (with search, filters, sort)
export const getProducts = async (req, res) => {
  try {
    const { q = "", sort = "-updatedAt" } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "200", 10) || 200, 1), 500);

    const text = q
      ? { $or: [{ sku: rx(q) }, { attributes: { $elemMatch: { v: rx(q) } } }] }
      : {};

    const filters = buildAttrFilters(req.query);
    const products = await Product.find({ ...text, ...filters })
      .sort(pickSort(sort))
      .limit(limit);

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

    // Optional policy: auto-recompute SKU only if enabled and attrs provided
    const AUTO_RECOMPUTE = process.env.AUTO_RECOMPUTE_SKU === "1";
    if (!("sku" in req.body) && AUTO_RECOMPUTE && "attributes" in data) {
      data.sku = computeSkuFromAttributes(data.attributes);
    }

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
    if (isDup(err, "sku"))    return res.status(409).json({ error: true, message: "SKU already exists" });
    if (isDup(err, "fpHash")) return res.status(409).json({ error: true, message: "A product with these attributes already exists" });
    return res.status(400).json({ error: true, message: err.message });
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
