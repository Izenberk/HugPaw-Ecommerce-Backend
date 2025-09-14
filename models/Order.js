import { Schema, model, Types } from "mongoose";


const AttributeSchema = new Schema(
  {
    k: { type: String, required: true },
    v: { type: String, required: true },
  },
  { _id: false }
);

/**
 * SmartFeature sub-item (accessory / add-on)
 */
const SmartFeatureSchema = new Schema(
  {
    productRef: { type: Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },

    // optional pricing snapshot
    unitPrice: { type: Number, min: 0 }, // price at order time for this feature
    lineTotal: { type: Number, min: 0 }, // computed (unitPrice * quantity)

    // snapshot attributes for smart feature (optional)
    attributes: { type: [AttributeSchema], default: [] },
  },
  { _id: false }
);

/**
 * Main order item
 */
const OrderItemSchema = new Schema(
  {
    productRef: { type: Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, index: true }, // SKU string
    quantity: { type: Number, required: true, min: 1, default: 1 },

    // optional pricing snapshot for main item
    unitPrice: { type: Number, min: 0 }, // base price at order time
    priceAdj: { type: Number, default: 0 }, // adjustment for the item
    lineTotal: { type: Number, min: 0 }, // (unitPrice + priceAdj) * quantity

    // nested smart features (array)
    smartFeatures: { type: [SmartFeatureSchema], default: [] },

    // snapshot attributes for the main item
    attributes: { type: [AttributeSchema], default: [] },
  },
  { _id: false }
);

/**
 * Order schema
 */
const OrderSchema = new Schema(
  {
    order_no: { type: String, required: true, unique: true, index: true },
    order_date: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    userId: { type: String, required: true },

    order_items: { type: [OrderItemSchema], required: true, default: [] },

    // summary fields
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
      index: true,
    },

    // shipping and payment snapshots
    shipping: {
      name: String,
      address: String,
      phone: String,
      trackingNumber: String,
      shippedAt: Date,
    },
    payment: {
      method: String,
      paidAt: Date,
      transactionId: String,
      paymentStatus: String,
    },
  },
  { timestamps: true }
);

export const Order = model("Order", OrderSchema);
