import { isValidObjectId } from "mongoose";
import User from "../models/userModel.js";

// Get profile by Id
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user || user.isDeleted) {
      return res.status(404).json({ error: true, message: "User not found" });
    }
    res.json({ error: false, user });
  } catch (err) {
    next(err);
  }
};

// Edit profile by Id
export const editUserById = async (req, res, next) => {
  try {
    const { id } = req.params; // ✅ ประกาศ id ก่อนใช้

    // ✅ กัน CastError ตั้งแต่ต้น
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "avatarUrl",
      "birthDate",
      "addresses",
    ];
    const update = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        update[field] = req.body[field];
      }
    }

    if (typeof update.birthDate === "string") {
      const d = new Date(update.birthDate);
      if (!isNaN(d.getTime())) update.birthDate = d;
    }

    if (update.addresses !== undefined && !Array.isArray(update.addresses)) {
      return res
        .status(400)
        .json({ error: true, message: "addresses must be an array" });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      update,
      { new: true, runValidators: true, context: "query" }
    )
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    return res.json({ error: false, message: "Profile updated", user });
  } catch (err) {
    next(err);
  }
};

// Forget Password (Future plan)
export const forgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // The answer will be this way to prevent user enumeration
    const genericOk = {
      error: false,
      message: "If this email exists, we've sent a reset link.",
    };

    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user) return res.json(genericOk);

    // Create JWT for reset password
    if (!process.env.JWT_RESET_SECRET) {
      throw new Error("JWT_RESET_SECRET is not set");
    }
    const token = jwt.sign(
      { sub: String(user._id), typ: "reset" },
      process.env.JWT_RESET_SECRET,
      { expiresIn: process.env.RESET_TOKEN_EXPIRES_IN || "15m" }
    );

    // Link to front-end
    const baseClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${baseClientUrl}/reset-password?token=${encodeURIComponent(
      token
    )}`;

    // Sent mail
    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;">
        <h2>Reset your password</h2>
        <p>Click the button below to reset your password. This link will expire soon.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
            Reset Password
          </a>
        </p>
        <p>If the button doesn’t work, copy and paste this URL into your browser:</p>
        <code>${resetUrl}</code>
      </div>
    `;

    await sendMail({
      to: user.email,
      subject: "HugPaw — Reset your password",
      html,
    });

    return res.json(genericOk);
  } catch (err) {
    next(err);
  }
};

// Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ error: true, message: "token and password are required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    if (decoded.typ !== "reset") {
      return res
        .status(400)
        .json({ error: true, message: "Invalid token type" });
    }

    const userId = decoded.sub;
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid or expired token" });
    }

    return res.json({ error: false, message: "Password has been reset" });
  } catch (err) {
    return res
      .status(400)
      .json({ error: true, message: "Invalid or expired token" });
  }
};

// Soft delete profile by userId
export const softDeleteUserById = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }
    res.json({ error: false, message: "User soft deleted", user });
  } catch (err) {
    next(err);
  }
};

// Hard delete User by ID
export const hardDeleteUserById = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user || user.role === "admin") {
      return res.status(404).json({ error: true, message: "User not found" });
    }
    res.json({ error: false, message: "User permanently deleted" });
  } catch (err) {
    next(err);
  }
};
