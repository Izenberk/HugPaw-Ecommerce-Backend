import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    district: String,
    city: String,
    postalCode: { type: String, required: true },
    country: { type: String, default: "TH" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const WishlistItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "productId", required: true }, //รอดู Shcema peet
    addonId: { type: Types.ObjectId, ref: "addonId", required: true }, //รอดู Shcema peet
    quantity: { type: Number, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now },
    imageUrl: String,
  },
  { _id: true, timestamps: false }
);

const CartItemSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    addonId: { type: Types.ObjectId, ref: "Addon" },
    addressId: { type: Types.ObjectId },
    quantity: { type: Number, min: 1, default: 1 },
    imageurl: String,
  },
  { _id: true, timestamps: false }
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    Authorization: {
      username: { type: String, unique: true },
      emailVerified: { type: Boolean, default: false },
      phone: String,
      phoneVerified: { type: Boolean, default: false },
      password: { type: String, required: false },
      role: { type: String, enum: ["user", "admin"], default: "user" },
    },

    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      birthDate: Date,
      avatarUrl: String,
      addresses: [AddressSchema],
      wishlist: [WishlistItemSchema],
      cart: [CartItemSchema],
      lastLoginAt: Date,
      isDeleted: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("Authorization.password")) return next();
  this.Authorization.password = await bcrypt.hash(
    this.Authorization.password,
    10
  );
  next();
});

UserSchema.index({ email: 1 }, { unique: true });
// UserSchema.index({ role: 1 });
// UserSchema.index({ "wishlist.productId": 1 });
// UserSchema.index({ "cart.productId": 1 });

export default model("User", UserSchema);
