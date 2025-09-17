import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const isProd = process.env.NODE_ENV === "production";

function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function setAuthCookie(res, token) {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export const signUp = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: true,
        message: "email, password, firstName, lastName are required",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(409)
        .json({ error: true, message: "Email already registered" });
    }

    const user = await User.create({ email, password, firstName, lastName });

    const token = signToken({ userId: user._id, role: user.role });
    setAuthCookie(res, token);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      error: false,
      message: "Sign up successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("SignUp error:", err);
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "email and password are required" });
    }

    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user || !user.password) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });
    }

    const matchData = await bcrypt.compare(password, user.password);
    if (!matchData) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid credentials" });
    }

    const token = signToken({ userId: user._id, role: user.role });
    setAuthCookie(res, token);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      error: false,
      message: "Signed in",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    next(err);
  }
};

export const logOut = async (req, res, next) => {
  try {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
    res.json({ error: false, message: "Signed out" });
  } catch (err) {
    console.error("Logout error:", err);
    next(err);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: true, message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    res.json({ error: false, user });
  } catch (err) {
    console.error("getCurrentUser error:", err);
    next(err);
  }
};
