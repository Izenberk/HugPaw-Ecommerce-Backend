import { Schema, model } from "mongoose";

const attributeSchema = new Schema(
  {
    k: { type: String, required: true },
    v: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, },
    attributes: [attributeSchema],
    unitPrice: { type: Number, default: 0 },
    stockAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = model("Product", productSchema);
