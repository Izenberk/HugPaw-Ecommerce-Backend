import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js"; // เพิ่ม
import User from "../models/User.js"; // เพิ่ม (สำหรับ default address)

/* ---------------- Helpers (sync) ---------------- */
const ALLOWED_PAYMENT_METHODS = ["credit_card", "paypal", "apple_pay"];

function normalizeOrderNo(v) {
  return typeof v === "string" ? v.trim() : v;
}

function normalizeSku(v) {
  return typeof v === "string" ? v.trim().toUpperCase() : v;
}

function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "order_items must be a non-empty array";
  }
  for (const it of items) {
    if (typeof it !== "object") return "Each order item must be an object";
    if (!it.sku || typeof it.sku !== "string")
      return "Each item needs sku (string)";
    if (
      it.quantity == null ||
      typeof it.quantity !== "number" ||
      it.quantity <= 0
    ) {
      return "Each item.quantity must be a positive number";
    }
    if (it.productRef && !mongoose.Types.ObjectId.isValid(it.productRef)) {
      return "item.productRef must be a valid ObjectId";
    }
  }
  return null;
}

function validateCreateBody(body) {
  if (!body.order_no) return "order_no is required";
  if (!body.userId) return "userId is required";
  const itemsErr = validateOrderItems(body.order_items);
  if (itemsErr) return itemsErr;

  if (body.payment) {
    if (!body.payment.method) return "payment.method is required";
    if (!ALLOWED_PAYMENT_METHODS.includes(body.payment.method)) {
      return "payment.method invalid";
    }
  }
  return null;
}

async function hydrateItems(rawItems, { checkStock = true } = {}) {
  // สร้างรายการ sku (uppercase แล้ว)
  const skus = [...new Set(rawItems.map((i) => normalizeSku(i.sku)))];
  const products = await Product.find({ sku: { $in: skus } }).lean();

  if (products.length !== skus.length) {
    const found = new Set(products.map((p) => p.sku.toUpperCase()));
    const missing = skus.filter((s) => !found.has(s));
    throw new Error(`Missing products for sku: ${missing.join(", ")}`);
  }

  const productMap = {};
  for (const p of products) productMap[p.sku.toUpperCase()] = p;

  let totalAmount = 0;
  const hydrated = rawItems.map((it) => {
    const skuU = normalizeSku(it.sku);
    const prod = productMap[skuU];
    if (checkStock && prod.stockAmount < it.quantity) {
      throw new Error(`Insufficient stock for ${skuU}`);
    }
    const lineAmount = (prod.unitPrice || 0) * it.quantity;
    totalAmount += lineAmount;
    return {
      productRef: it.productRef ? it.productRef : prod._id, // เติมถ้ายังไม่มี
      sku: skuU,
      quantity: it.quantity,
      // ถ้าต้อง freeze ราคา แนะนำเพิ่ม field unitPrice ใน OrderItemSchema ภายหลัง
    };
  });

  return { hydrated, totalAmount };
}

// ปรับ recalcSummary ให้รับ totalAmount คำนวณจากสินค้า
function recalcSummary(body, totalAmountOverride) {
  if (Array.isArray(body.order_items) && body.order_items.length) {
    body.orderTotalQty = body.order_items.reduce((s, i) => s + i.quantity, 0);
    body.orderLineCount = body.order_items.length;
    if (typeof totalAmountOverride === "number") {
      body.orderTotalAmount = totalAmountOverride;
    } else if (body.orderTotalAmount == null) {
      body.orderTotalAmount = 0;
    }
  }
}

/* --------------- Create Order --------------- */
export const createOrder = async (req, res) => {
  req.body.order_no = normalizeOrderNo(req.body.order_no);
  if (Array.isArray(req.body.order_items)) {
    req.body.order_items = req.body.order_items.map((i) => ({
      ...i,
      sku: normalizeSku(i.sku),
    }));
  }

  const errMsg = validateCreateBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: true, message: errMsg });
  }

  try {
    // เติม shipping จาก default address ของ user ถ้าไม่ส่งมา (ตัวอย่าง)
    if (!req.body.shipping) {
      const user = await User.findById(req.body.userId).lean();
      if (!user)
        return res.status(400).json({ error: true, message: "User not found" });
      const defAddr = user.addresses?.find((a) => a.isDefault);
      if (defAddr) {
        req.body.shipping = {
          addressRef: defAddr._id?.toString(),
          method: "standard",
          name: defAddr.fullName,
          address: `${defAddr.addressLine1}${
            defAddr.district ? ", " + defAddr.district : ""
          }${defAddr.city ? ", " + defAddr.city : ""} ${
            defAddr.postalCode || ""
          }`.trim(),
          phone: defAddr.phone,
        };
      }
    }

    const dup = await Order.exists({ order_no: req.body.order_no });
    if (dup) {
      return res
        .status(409)
        .json({ error: true, message: "order_no already exists" });
    }

    // Query products + ตรวจ stock + คำนวณยอดรวม
    const { hydrated, totalAmount } = await hydrateItems(req.body.order_items, {
      checkStock: true,
    });
    req.body.order_items = hydrated;
    recalcSummary(req.body, totalAmount);

    const order = await Order.create(req.body);

    // (ทางเลือก) ตัด stock หลังสร้าง (ไม่ใช้ transaction — เสี่ยง race ถ้า concurrent สูง)
    // await Product.bulkWrite(
    //   hydrated.map(i => ({
    //     updateOne: {
    //       filter: { _id: i.productRef },
    //       update: { $inc: { stockAmount: -i.quantity } }
    //     }
    //   }))
    // );

    res.status(201).json({ error: false, order });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

/* --------------- Get Orders (เพิ่ม filter/pagination) --------------- */
export const getOrders = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10))
  );
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.userId) query.userId = req.query.userId.trim();
  if (req.query.orderStatus) query.orderStatus = req.query.orderStatus;
  if (req.query.paymentStatus)
    query["payment.paymentStatus"] = req.query.paymentStatus;

  // date range: ?from=2024-01-01&to=2024-02-01
  if (req.query.from || req.query.to) {
    query.order_date = {};
    if (req.query.from) query.order_date.$gte = new Date(req.query.from);
    if (req.query.to) query.order_date.$lte = new Date(req.query.to);
  }

  const sort =
    req.query.sort === "date_asc"
      ? { order_date: 1 }
      : req.query.sort === "date_desc"
      ? { order_date: -1 }
      : { createdAt: -1 };

  try {
    const [orders, total] = await Promise.all([
      Order.find(query).sort(sort).skip(skip).limit(limit),
      Order.countDocuments(query),
    ]);
    res.json({
      error: false,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

/* --------------- Get Order by _id (เดิม) --------------- */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};

/* --------------- Update Order --------------- */
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: true, message: "Invalid _id" });
  }

  const allowed = [
    "order_items",
    "orderStatus",
    "shipping",
    "payment",
    "smart_features",
  ];
  const updates = pickAllowed(req.body, allowed);

  if (updates.order_items) {
    const itemsErr = validateOrderItems(updates.order_items);
    if (itemsErr) {
      return res.status(400).json({ error: true, message: itemsErr });
    }
    // แปลง sku
    updates.order_items = updates.order_items.map((i) => ({
      ...i,
      sku: normalizeSku(i.sku),
    }));

    try {
      // re-hydrate + คำนวณใหม่
      const { hydrated, totalAmount } = await hydrateItems(
        updates.order_items,
        { checkStock: false }
      );
      updates.order_items = hydrated;
      recalcSummary(updates, totalAmount);
    } catch (e) {
      return res.status(400).json({ error: true, message: e.message });
    }
  }

  if (updates.payment?.method) {
    if (!ALLOWED_PAYMENT_METHODS.includes(updates.payment.method)) {
      return res
        .status(400)
        .json({ error: true, message: "payment.method invalid" });
    }
  }

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "No updatable fields" });
  }

  try {
    const order = await Order.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }
    res.json({ error: false, order });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

/* --------------- Delete Order (เดิม) --------------- */
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: true, message: "Invalid _id" });
    }

    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
};
