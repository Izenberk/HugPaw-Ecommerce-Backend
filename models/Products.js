import { Schema, model } from "mongoose";

export const attributeSchema = new Schema(
  {
    k: { type: String, required: true },
    v: { type: String, required: true },
  },
  { _id: false }
);

export const productSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true },
    attributes: [attributeSchema],
    unitPrice: { type: Number, default: 0 },
    stockAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = model("Product", productSchema);
