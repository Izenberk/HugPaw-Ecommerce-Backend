// server/models/Product.js
import { Schema, model } from "mongoose";
import crypto from "node:crypto";

const attributeSchema = new Schema(
  { k: { type: String, required: true }, v: { type: String, required: true } },
  { _id: false }
);

const norm = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // collapse spaces

// Dedupe by key (last value wins), then sort by key for a stable identity
const makeFingerprint = (attrs = []) => {
  const map = new Map(); // k -> v (normalized)
  for (const a of Array.isArray(attrs) ? attrs : []) {
    const k = norm(a?.k);
    const v = norm(a?.v);
    if (k && v) map.set(k, v); // last wins
  }
  const pairs = Array.from(map.entries()).sort(([ak], [bk]) => ak.localeCompare(bk));
  if (pairs.length === 0) return ""; // empty fp for "no attributes"
  return pairs.map(([k, v]) => `${k}=${v}`).join("|");
};

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");

const productSchema = new Schema(
  {
    sku:         { type: String, required: true, unique: true, trim: true, uppercase: true },
    attributes:  { type: [attributeSchema], default: [] },
    unitPrice:   { type: Number, default: 0 },
    stockAmount: { type: Number, default: 0 },

    // Identity fields (not exposed to clients)
    fp:     { type: String, select: false },               // canonical string (may be "")
    fpHash: { type: String, unique: true, select: false }, // unique across non-empty fps
  },
  { timestamps: true }
);

// Indexes
productSchema.index({ sku: 1 }, { unique: true });
// Only enforce uniqueness when fpHash is a non-empty string
productSchema.index(
  { fpHash: 1 },
  { unique: true, partialFilterExpression: { fpHash: { $type: "string", $ne: "" } } }
);

// Keep sku canonical and compute fingerprint before validate
productSchema.pre("validate", function (next) {
  if (this.sku) this.sku = String(this.sku).trim().toUpperCase();
  const fp = makeFingerprint(this.attributes);
  this.fp = fp;
  this.fpHash = fp ? hash(fp) : undefined; // undefined => excluded from partial unique index
  next();
});

export const Product = model("Product", productSchema);
