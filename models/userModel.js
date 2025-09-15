import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { AddressSchema } from "./address.js";

const { Schema, model } = mongoose;

export const AddressSchema = new Schema(
  {
    fullName: { type: String, trim: true },
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
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthDate: { type: Date },
    avatarUrl: { type: String, trim: true },
    addresses: { type: [AddressSchema], default: [] },
    lastLoginAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

/** Hash ตอน save เฉพาะเมื่อ password ถูกแก้ไข */
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

export default model("User", UserSchema);
