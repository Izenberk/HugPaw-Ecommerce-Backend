import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PaymentSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "OrderId",
    required: true,
    index: true,
  },
  method: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "THB" },
  transactionRef: { type: String, trim: true, index: true },
  status: {
    type: String,
    enum: ["initiated", "authorized", "captured", "failed", "refunded"],
    default: "initiated",
    index: true,
  },
});

export default model("Payment", PaymentSchema);
