import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { AddressSchema } from "./address.js";
const { Schema, model } = mongoose;

const UserSchema = new Schema({
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
  addresses: [AddressSchema],
  lastLoginAt: { type: Date },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (userPassword) {
  return bcrypt.compare(userPassword, this.password);
};

export default model("User", UserSchema);
