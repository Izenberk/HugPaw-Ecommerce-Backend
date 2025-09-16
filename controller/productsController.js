import { Product } from "../models/Product.js";
import mongoose from "mongoose";

/* ----------------- Helpers (ไม่ await → วางนอก try/catch) ----------------- */
function normalizeSku(raw) {
  return typeof raw === "string" ? raw.trim().toUpperCase() : raw;
}

function validateAttributes(attrs) {
  if (!Array.isArray(attrs)) return "attributes must be an array";
  for (const item of attrs) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.k !== "string" ||
      typeof item.v !== "string" ||
      !item.k.trim() ||
      !item.v.trim()
    ) {
      return "Each attribute must be an object with non-empty string k and v";
    }
  }
  return null;
}

function validateCreateBody(body) {
  if (!body.sku || typeof body.sku !== "string") {
    return "sku is required (string)";
  }
  if (
    body.unitPrice != null &&
    (typeof body.unitPrice !== "number" || body.unitPrice < 0)
  ) {
    return "unitPrice must be a positive number";
  }
  if (
    body.stockAmount != null &&
    (typeof body.stockAmount !== "number" || body.stockAmount < 0)
  ) {
    return "stockAmount must be a positive number";
  }
  if (body.attributes !== undefined) {
    const err = validateAttributes(body.attributes);
    if (err) return err;
  }
  return null;
}

function pickAllowed(source, allowed) {
  const out = {};
  for (const k of allowed) {
    if (source[k] !== undefined) out[k] = source[k];
  }
  return out;
}

function parseSort(sortParam) {
  // รูปแบบ: sort=unitPrice,-stockAmount  → { unitPrice:1, stockAmount:-1 }
  if (!sortParam) return { createdAt: -1 };
  const spec = {};
  for (const token of sortParam.split(",")) {
    const t = token.trim();
    if (!t) continue;
    if (t.startsWith("-")) spec[t.slice(1)] = -1;
    else spec[t] = 1;
  }
  if (Object.keys(spec).length === 0) return { createdAt: -1 };
  return spec;
}

/* ----------------- Create Product ----------------- */
export const createProduct = async (req, res) => {
  // Normalize + validate ก่อนเข้าฐาน
  req.body.sku = normalizeSku(req.body.sku);
  const errMsg = validateCreateBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: true, message: errMsg });
  }

  // กัน field แปลก
  const allowed = ["sku", "attributes", "unitPrice", "stockAmount"];
  const payload = pickAllowed(req.body, allowed);

  try {
    // เช็คซ้ำก่อนสร้าง
    const exists = await Product.exists({ sku: payload.sku });
    if (exists) {
      return res
        .status(409)
        .json({ error: true, message: "sku already exists" });
    }

    const product = await Product.create(payload);
    res.status(201).json({ error: false, product });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

/* ----------------- Get Products (เพิ่ม filter / pagination / sorting) ----------------- */
export const getProducts = async (req, res) => {
  // แปลง query param
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10))
  );
  const skip = (page - 1) * limit;

  const q = req.query.q?.trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  const inStock = req.query.inStock === "true";
  const sort = parseSort(req.query.sort);
  // attributes filter: attr=Color:Black&attr=Size:XS
  const attrFilters = Array.isArray(req.query.attr)
    ? req.query.attr
    : req.query.attr
    ? [req.query.attr]
    : [];

  const mongoQuery = {};

  if (q) {
    // ค้นหาใน sku หรือ attribute value
    mongoQuery.$or = [
      { sku: { $regex: q, $options: "i" } },
      { "attributes.v": { $regex: q, $options: "i" } },
    ];
  }

  if (minPrice != null || maxPrice != null) {
    mongoQuery.unitPrice = {};
    if (minPrice != null) mongoQuery.unitPrice.$gte = minPrice;
    if (maxPrice != null) mongoQuery.unitPrice.$lte = maxPrice;
  }

  if (inStock) {
    mongoQuery.stockAmount = { $gt: 0 };
  }

  if (attrFilters.length) {
    // สร้าง $and: [{"attributes": {$elemMatch:{k:"Color", v:"Black"}}}, ...]
    mongoQuery.$and = (mongoQuery.$and || []).concat(
      attrFilters
        .map((pair) => {
          const [k, v] = pair.split(":").map((s) => s?.trim());
          if (!k || !v) return null;
          return { attributes: { $elemMatch: { k, v } } };
        })
        .filter(Boolean)
    );
  }

  try {
    const [items, total] = await Promise.all([
      Product.find(mongoQuery).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(mongoQuery),
    ]);

    res.json({
      error: false,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

/* ----------------- Get Product by _id หรือ sku ----------------- */
export const getProductById = async (req, res) => {
  const { id } = req.params;
  let product = null;

  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      // ลองค้นด้วย sku (normalize)
      product = await Product.findOne({ sku: normalizeSku(id) });
    }
    if (!product) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }
    res.json({ error: false, product });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

/* ----------------- Update Product ----------------- */
export const updateProduct = async (req, res) => {
  const { id } = req.params;

  // ถ้า id เป็น ObjectId ไม่ valid และไม่ใช่ sku (เช่นความยาวผิด) → ตัดทิ้งเลย
  const isObjId = mongoose.Types.ObjectId.isValid(id);

  // ปรับ sku ใหม่ถ้าจะอัพเดต
  if (req.body.sku) {
    req.body.sku = normalizeSku(req.body.sku);
  }

  // Whitelist
  const allowed = ["sku", "attributes", "unitPrice", "stockAmount"];
  const updates = pickAllowed(req.body, allowed);

  // อย่างน้อยต้องมี 1 field
  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "No updatable fields provided" });
  }

  // Validate synchronous
  if (updates.attributes) {
    const attrErr = validateAttributes(updates.attributes);
    if (attrErr) {
      return res.status(400).json({ error: true, message: attrErr });
    }
  }
  if (
    updates.unitPrice != null &&
    (typeof updates.unitPrice !== "number" || updates.unitPrice < 0)
  ) {
    return res
      .status(400)
      .json({ error: true, message: "unitPrice must be positive number" });
  }
  if (
    updates.stockAmount != null &&
    (typeof updates.stockAmount !== "number" || updates.stockAmount < 0)
  ) {
    return res
      .status(400)
      .json({ error: true, message: "stockAmount must be positive number" });
  }

  try {
    // ถ้ามี sku ใหม่ → เช็คซ้ำ
    if (updates.sku) {
      const duplicate = await Product.exists({
        sku: updates.sku,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res
          .status(409)
          .json({ error: true, message: "sku already exists" });
      }
    }

    let product;
    if (isObjId) {
      product = await Product.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });
    }
    if (!product) {
      // ลองหาโดย sku เดิม (กรณีส่ง sku เดิมเป็น param)
      product = await Product.findOneAndUpdate(
        { sku: normalizeSku(id) },
        updates,
        {
          new: true,
          runValidators: true,
        }
      );
    }

    if (!product) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }

    res.json({ error: false, product });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

/* ----------------- Delete Product ----------------- */
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  let product = null;
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findByIdAndDelete(id);
    }
    if (!product) {
      product = await Product.findOneAndDelete({ sku: normalizeSku(id) });
    }
    if (!product) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }
    res.json({ error: false, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};
