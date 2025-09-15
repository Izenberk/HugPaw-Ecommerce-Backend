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
    sku: { type: String, required: true, unique: true }, // unique => auto index
    attributes: [attributeSchema],
    unitPrice: { type: Number, default: 0 },
    stockAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* Indexes */

// ราคา (ถ้า query / sort ตาม unitPrice บ่อย)
productSchema.index({ unitPrice: 1 });

// สต็อก (ทั่วไป)
productSchema.index({ stockAmount: 1 });

// สินค้าที่มีสต็อกเท่านั้น (ถ้าใช้บ่อยกว่าด้านบน ให้ลบ index stockAmount:1 ตัวบนออก)
productSchema.index(
  { stockAmount: 1 },
  {
    name: "in_stock_only",
    partialFilterExpression: { stockAmount: { $gt: 0 } },
  }
);

// ค้นหาตาม attribute คู่ (เช่น Size + Color)
productSchema.index({ "attributes.k": 1, "attributes.v": 1 });

// Full-text (ค้นคำใน value — เปิดใช้เมื่อจำเป็นเท่านั้น)
productSchema.index({ "attributes.v": "text" });

export const Product = model("Product", productSchema);
