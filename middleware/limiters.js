import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";
const enabled = String(process.env.RATE_LIMIT_ENABLED ?? "true") === "true";
const toInt = (v, d) => {
  const n = parseInt(String(v), 10); return Number.isFinite(n) ? n : d;
};

// ป้องกันรวม ให้สูง/ใจดี
export const apiLimiter = rateLimit({
  windowMs: toInt(process.env.RATE_LIMIT_API_WINDOW_MS, isProd ? 15*60_000 : 60_000),
  max: toInt(process.env.RATE_LIMIT_API_MAX, isProd ? 600 : 5000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !enabled || req.method === "OPTIONS",
});

// เฉพาะ variants ที่ยิงถี่ → ใจดีมาก
export const variantsLimiter = rateLimit({
  windowMs: toInt(process.env.RATE_LIMIT_VARIANTS_WINDOW_MS, 60_000),
  max: toInt(process.env.RATE_LIMIT_VARIANTS_MAX, isProd ? 2000 : 10000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => !enabled || req.method === "OPTIONS",
});

// auth เข้ม (กัน brute force)
export const authLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many auth attempts. Try again later." },
  skip: req => !enabled || req.method === "OPTIONS",
});
