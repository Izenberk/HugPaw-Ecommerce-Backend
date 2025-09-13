import mongoose from "mongoose";
const { Schema } = mongoose;

export const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
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

//เนื่องจากต้องเอสไปใช้ที่ User Model และ Order Model จึงแยกไว้ที่ไฟล์นี้
