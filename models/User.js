import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const { Schema, model } = mongoose;

export const attributeSchema = new Schema(
  { k: { type: String, required: true }, v: { type: String, required: true } },
  { _id: false }
);

export const AddressSchema = new Schema(
  {
    recieverName: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, default: "TH" },
    postalCode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

// --------- Cart ----------
const CartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    selectedAttributes: { type: [attributeSchema], default: [] },
    quantity: { type: Number, min: 1, default: 1 },
    unitPriceAtAdd: { type: Number, min: 0, required: true },
    addedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { _id: true }
);

// --------- Favorites ----------
const FavoriteItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true, 
    },
    selectedAttributes: { type: [attributeSchema], default: [] },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// --------- User ----------
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    avatarUrl: { type: String, trim: true },
    addresses: { type: [AddressSchema], default: [] },

       userCart: { type: [CartItemSchema], default: [] },
    userFavorite: { type: [FavoriteItemSchema], default: [] },

    passwordResetTokenHash: { type: String, index: true },
    passwordResetTokenExpiresAt: { type: Date },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

/* ---------------- Helpers ภายในสคีมา ---------------- */
function sameAttributes(a = [], b = []) {
  if (a.length !== b.length) return false;
  const key = (arr) =>
    [...arr]
      .map(({ k, v }) => `${k}=${v}`)
      .sort()
      .join("|");
  return key(a) === key(b);
}

function sameCartVariant(it, incoming) {
  return (
    String(it.product) === String(incoming.product) &&
    it.sku === incoming.sku &&
    sameAttributes(it.selectedAttributes, incoming.selectedAttributes || [])
  );
}

function sameFavVariant(it, incoming) {
  return (
    String(it.productId) === String(incoming.productId) &&
    sameAttributes(it.selectedAttributes || [], incoming.selectedAttributes || [])
  );
}

/* ---------------- Methods: Favorites (embedded) ---------------- */
UserSchema.methods.toggleFavorite = function ({
  productId,
  selectedAttributes = [],
}) {
  if (!productId) return this;
  const i = (this.userFavorite || []).findIndex((it) =>
    sameFavVariant(it, { productId, selectedAttributes })
  );
  if (i >= 0) this.userFavorite.splice(i, 1);
  else this.userFavorite.unshift({ productId, selectedAttributes });
  return this;
};

UserSchema.methods.importFavoritesToCart = function (favorites = []) {
  for (const fav of favorites) {
    const item = {
      product: fav.productId,
      sku: fav.sku, // ต้องแน่ใจว่า favorite มี sku หรือระบุเพิ่มตอนเรียกใช้
      selectedAttributes: fav.selectedAttributes || [],
      quantity: 1,
      unitPriceAtAdd: Number(fav.unitPriceAtAdd ?? 0),
    };
    const i = (this.userCart || []).findIndex((it) => sameCartVariant(it, item));
    if (i < 0) this.userCart.unshift(item);
  }
  return this;
};

/* ---------------- Hooks: Password ---------------- */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate() || {};
    const newPassword =
      update.password ?? (update.$set && update.$set.password);
    if (!newPassword) return next();

    const hashed = await bcrypt.hash(newPassword, 10);
    if (update.password) update.password = hashed;
    if (update.$set?.password) update.$set.password = hashed;

    this.setUpdate(update);
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.methods.comparePassword = async function (userPassword) {
  return bcrypt.compare(userPassword, this.password);
};

/* ---------------- Methods: Reset Token (SMTP flow) ---------------- */
UserSchema.methods.issuePasswordResetToken = function (ttl = "15m") {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  let seconds = 900; // default 15m
  if (typeof ttl === "string") {
    const m = ttl.match(/^(\d+)([smhd])$/i);
    if (m) {
      const n = +m[1];
      const unit = m[2].toLowerCase();
      seconds =
        unit === "s" ? n :
        unit === "m" ? n * 60 :
        unit === "h" ? n * 3600 :
        unit === "d" ? n * 86400 : 900;
    }
  } else if (Number.isFinite(ttl)) {
    seconds = +ttl;
  }

  this.passwordResetTokenHash = hash;
  this.passwordResetTokenExpiresAt = new Date(Date.now() + seconds * 1000);
  return token; 
};

UserSchema.methods.consumePasswordResetToken = function (token) {
  if (!token || !this.passwordResetTokenHash || !this.passwordResetTokenExpiresAt)
    return false;
  if (this.passwordResetTokenExpiresAt.getTime() < Date.now()) return false;

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const ok = hash === this.passwordResetTokenHash;
  if (!ok) return false;

  // one-time use
  this.passwordResetTokenHash = undefined;
  this.passwordResetTokenExpiresAt = undefined;
  return true;
};

export default model("User", UserSchema);