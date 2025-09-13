import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true }, //รอดูของ peet
    addonIds: [{ type: Schema.Types.ObjectId, ref: "Addon" }], //รอดูของ peet
    quantity: { type: Number, min: 1, default: 1 },
    price: { type: Number, }
  },
);

export default model("Cart", CartSchema);