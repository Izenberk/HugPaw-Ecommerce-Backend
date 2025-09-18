// server/api/v1/controllers/productController.js
import { Product } from "../../../models/Product.js";
import mongoose from "mongoose";
import { computeSkuFromAttributes } from "../../../utils/sku.js";



const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const rx = (s) => new RegExp(String(s || "").trim(), "i");
const isDup = (e, key) => e?.code === 11000 && e?.keyPattern?.[key];

function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

async function getProductByParam(idOrSlug) {
  const q = isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: String(idOrSlug).trim().toLowerCase() };
  return Product.findOne(q).lean();
}

const hasAttr = (k, v) => ({ attributes: { $elemMatch: { k, v } } });

const K = (s) => String(s || "").trim().toUpperCase();

async function findBySkuCI(sku) {
  return Product.findOne({ sku: K(sku) })
    .select({ sku: 1, unitPrice: 1, stockAmount: 1, attributes: 1 })
    .lean();
}

// Find the anchor doc by SKU
async function getAnchor(sku) {
  return findBySkuCI(sku);
}

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

/* ----------------- Availability ----------------- */
// POST /api/products/:id/availability
export async function availability(req, res) {
  try {
    const product = await getProductByParam(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const selections = req.body?.selections ?? req.body?.selected ?? {};

    // Pull in-stock + active variants for this product
    const variants = await Variant.find({
      productId: product._id,
      stock: { $gt: 0 },
      $or: [{ active: { $exists: false } }, { active: { $ne: false } }],
    })
      .select({ attrs: 1 })
      .lean();

    // Keep only variants compatible with current partial selections
    const matches = variants.filter((v) =>
      Object.entries(selections).every(([k, val]) =>
        !val ? true : v.attrs?.[k] === val
      )
    );

    // Build availability per option group using the product's declared options
    const byOption = {};
    for (const g of product.optionGroups || []) {
      const set = new Set();
      for (const v of matches) {
        const val = v.attrs?.[g.key];
        if (val) set.add(val);
      }
      byOption[g.key] = (g.values || []).map(({ value }) => ({
        value,
        available: set.has(value),
      }));
    }

    res.json({ byOption });
  } catch (err) {
    console.error("availability error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

/* ----------------- Find exact variant ----------------- */
// POST /api/products/:id/variants:find
export async function findVariant(req, res) {
  try {
    const product = await getProductByParam(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const selections = req.body?.selections ?? req.body?.selected ?? {};

    // Which singles are required to uniquely identify a variant?
    const requiredSingles = (product.optionGroups || [])
      .filter((g) => g.required && g.type === "single")
      .map((g) => g.key);

    // Must have all required singles specified
    const allFilled = requiredSingles.every((k) => selections[k]);
    if (!allFilled) return res.status(400).json({ found: false, error: "Incomplete selections" });

    // Query by attrs.* exact match for required singles
    const attrsQuery = requiredSingles.reduce((acc, k) => {
      acc[`attrs.${k}`] = selections[k];
      return acc;
    }, {});

    const v = await Variant.findOne({
      productId: product._id,
      ...attrsQuery,
      $or: [{ active: { $exists: false } }, { active: { $ne: false } }],
    })
      .select({ sku: 1, price: 1, stock: 1, availableQty: 1, attrs: 1, image: 1 })
      .lean();

    if (!v) return res.status(404).json({ found: false });

    res.json({
      found: true,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      availableQty: v.availableQty,
      attrs: v.attrs,
      image: v.image,
    });
  } catch (err) {
    console.error("findVariant error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

// Build a query that returns "siblings" (same product family) w/o schema changes
function familyPredicateFromAnchor(anchor) {
  if (!anchor) return null;

  const attrs = Object.fromEntries((anchor.attributes || []).map(a => [a.k, a.v]));
  const type = attrs["Type"];                       // e.g., "Collar"
  const kindFilter = hasAttr("Kind", "Variant");

  // Fallback family: SKU prefix before first '-'
  const prefix = String(anchor.sku).split("-")[0];  // "COL"
  const prefixFilter = { sku: { $regex: `^${prefix}-` } };

  // Prefer narrowing by Type if present (to avoid mixing different product types)
  if (type) {
    return { $and: [ kindFilter, hasAttr("Type", type), prefixFilter ] };
  }
  return { $and: [ kindFilter, prefixFilter ] };
}

function attrsToObj(arr = []) {
  return Object.fromEntries(arr.map(a => [a.k, a.v]));
}

// POST /api/variants/:sku/availability
export async function variantAvailability(req, res) {
  try {
    const { sku } = req.params;
    const anchor = await getAnchor(sku);
    if (!anchor) return res.status(404).json({ error: "Anchor SKU not found" });

    const familyQ = familyPredicateFromAnchor(anchor);
    if (!familyQ) return res.status(404).json({ error: "Family not found" });

    const selections = req.body?.selections ?? req.body?.selected ?? {};

    // Candidates that are in stock
    const base = { $and: [ familyQ, { stockAmount: { $gt: 0 } } ] };

    // Apply partial selections (each becomes an $elemMatch(k,v))
    const sel = Object.entries(selections)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => hasAttr(k, v));

    const matches = await Product.find({ $and: [base, ...sel] })
      .select({ attributes: 1 })
      .lean();

    // Universe = all family variants (to list all values we’ve seen)
    const allFamily = await Product.find(familyQ)
      .select({ attributes: 1 })
      .lean();

    // Collect option keys/values by “varies across family”
    const allValues = new Map(); // key -> Set(values)
    for (const d of allFamily) {
      for (const a of d.attributes || []) {
        if (a.k === "Kind") continue;
        const s = allValues.get(a.k) || new Set();
        s.add(a.v);
        allValues.set(a.k, s);
      }
    }

    // Seen values that remain possible under current partial selections
    const seen = new Map();
    for (const d of matches) {
      for (const a of d.attributes || []) {
        if (a.k === "Kind") continue;
        const s = seen.get(a.k) || new Set();
        s.add(a.v);
        seen.set(a.k, s);
      }
    }

    // Compose byOption: unknown values → available:false
    const byOption = {};
    for (const [k, setAll] of allValues.entries()) {
      const availSet = seen.get(k) || new Set();
      byOption[k] = Array.from(setAll).map(v => ({
        value: v,
        available: availSet.has(v),
      }));
    }

    res.json({ byOption });
  } catch (e) {
    console.error("variantAvailability error:", e);
    res.status(500).json({ error: "Internal error" });
  }
}

// POST /api/variants/:sku/resolve
export async function resolveVariant(req, res) {
  try {
    const rawSku = String(req.params.sku || "");
    const sku = K(rawSku); // normalize

    // 0) If the SKU is already a concrete variant, return it directly.
    // This makes the endpoint work for both "anchor" and "full variant" paths.
    const exact = await findBySkuCI(sku);
    if (exact) {
      return res.json({
        found: true,
        sku: exact.sku,
        price: exact.unitPrice,
        stock: exact.stockAmount,
        attrs: attrsToObj(exact.attributes),
        // optional: tag that we matched directly
        direct: true,
      });
    }

    // 1) Otherwise treat it as an anchor (family root) and resolve using selections.
    const anchor = await getAnchor(sku); // case-insensitive now
    if (!anchor) return res.status(404).json({ found: false, error: "Anchor SKU not found" });

    const familyQ = familyPredicateFromAnchor(anchor);
    if (!familyQ) return res.status(404).json({ found: false, error: "Family not found" });

    const selections = req.body?.selections ?? req.body?.selected ?? {};
    const requiredPairs = Object.entries(selections).filter(([, v]) => v != null && v !== "");
    if (!requiredPairs.length) {
      // For anchor flow, we still require at least one selection
      return res.status(400).json({ found: false, error: "Incomplete selections" });
    }

    const selectors = requiredPairs.map(([k, v]) => hasAttr(k, v));

    const doc = await Product.findOne({ $and: [familyQ, ...selectors] })
      .select({ sku: 1, unitPrice: 1, stockAmount: 1, attributes: 1 })
      .lean();

    if (!doc) return res.status(404).json({ found: false });

    res.json({
      found: true,
      sku: doc.sku,
      price: doc.unitPrice,
      stock: doc.stockAmount,
      attrs: attrsToObj(doc.attributes),
      direct: false,
    });
  } catch (e) {
    console.error("resolveVariant error:", e);
    res.status(500).json({ error: "Internal error" });
  }
}


// POST /api/inventory/availability
// body: { skus: ["ACC-GPS-STD","ACC-LED-CLIP"] }
export async function inventoryAvailability(req, res) {
  try {
    // 1) normalize incoming SKUs (trim + UPPERCASE) and preserve order
    const rawSkus = Array.isArray(req.body?.skus) ? req.body.skus : [];
    if (!rawSkus.length) return res.json({ items: [] });
    const norm = (s) => String(s ?? "").trim();
    const K = (s) => norm(s).toUpperCase();
    const skus = rawSkus.map(norm);
    const skusU = rawSkus.map(K);

    // 2) fetch docs (select unitPrice too)
    const docs = await Product.find({ sku: { $in: skusU } })
      .select({ sku: 1, unitPrice: 1, stockAmount: 1 })
      .lean();

    // 3) map by UPPERCASE SKU for a quick lookup
    const bySku = new Map(docs.map(d => [K(d.sku), d]));

    // 4) emit items in the same order as requested (using original casing in response)
    const items = rawSkus.map((reqSku) => {
      const d = bySku.get(K(reqSku));
      const stockNum = Number(d?.stockAmount);
      const finite = Number.isFinite(stockNum);
      return {
        sku: norm(reqSku),                   // echo back what caller asked
        unitPrice: d?.unitPrice ?? null,     // <-- include price
        stockAmount: d?.stockAmount ?? null, // also include raw stock if wanted
        stock: finite ? stockNum : null,     // keep existing fields
        available: finite ? stockNum > 0 : true,
      };
    })

    res.json({ items });
  } catch (e) {
    console.error("inventoryAvailability error:", e);
    res.status(500).json({ error: "Internal error" });
  }
}