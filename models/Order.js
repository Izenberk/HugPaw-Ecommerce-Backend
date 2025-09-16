import { Schema, model, Types } from "mongoose";

/**
 * SmartFeature sub-item (accessory / add-on)
 */
// const SmartFeatureSchema = new Schema(
//   {
//     productRef: { type: Types.ObjectId, ref: "Product", required: true },
//     sku: { type: String, required: true, trim: true, index: true },
//     quantity: { type: Number, required: true, min: 1, default: 1 },
//   },
//   { _id: false }
// );

/**
 * Main order item
 */
const OrderItemSchema = new Schema(
  {
    productRef: { type: Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, trim: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    order_no: { type: String, required: true, unique: true, trim: true },
    order_date: { type: Date, required: true, default: () => new Date() },
    userId: { type: String, required: true, trim: true },

    order_items: { type: [OrderItemSchema], required: true, default: [] },

    orderTotalQty: { type: Number, required: true, default: 0, min: 0 },
    orderLineCount: { type: Number, required: true, default: 0, min: 0 },
    orderTotalAmount: { type: Number, required: true, default: 0, min: 0 },

    orderStatus: {
      type: String,
      enum: [
        "Waiting for payment",
        "Pending",
        "Paid",
        "Processing",
        "Shipped",
        "Completed",
        "Cancelled",
        "Refunded",
      ],
      default: "Waiting for payment",
    },

    shipping: {
      addressRef: { type: String, trim: true }, // _id ของ address เดิมใน user (optional)
      method: { type: String, trim: true },
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      trackingNumber: { type: String, trim: true },
      shippedAt: { type: Date },
    },

    payment: {
      method: {
        type: String,
        enum: ["credit_card", "paypal", "apple_pay"],
        required: true,
        trim: true,
      },
      paidAt: Date,
      transactionId: { type: String, trim: true },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
    },
  },
  { timestamps: true }
);

// Indexes
OrderSchema.index({ userId: 1, order_date: -1 });
OrderSchema.index({ orderStatus: 1, order_date: -1 });
OrderSchema.index({ orderStatus: 1, "payment.paymentStatus": 1 });
OrderSchema.index({ "payment.transactionId": 1 });
OrderSchema.index({ trackingNumber: 1 }, { sparse: true });
OrderSchema.index(
  { orderStatus: 1, "shipping.shippedAt": 1 },
  { partialFilterExpression: { "shipping.shippedAt": null } }
);


export const Order = model("Order", OrderSchema);
