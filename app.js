import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import apiRoutes from "./api/v1/routes.js"
import { routeNotFound } from "./middleware/routeNotFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./api/v1/routes/health.routes.js";
import productsRoutes from "./api/v1/routes/productsRoutes.js";
import ordersRoutes from "./api/v1/routes/ordersRoutes.js";
import authRouter from "./api/v1/routes/auth.js";
import userRouter from "./api/v1/routes/user.js";

dotenv.config();
const app = express();

app.set("trust proxy", 1);

const corsOption = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://hug-paw-ecommerce.vercel.app/",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,           // needed for cookies / auth headers
  optionsSuccessStatus: 204,   // for legacy browsers on preflight
};

// CORS middleware
app.use(cors(corsOption));
app.use(cors(corsOption));

// Helmet
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"], // ปรับตามจริง
      "img-src": ["'self'", "data:", "blob:"],
      "connect-src": ["'self'", "http://localhost:3030"],
      "frame-ancestors": ["'none'"],
    },
  })
);

// JSON middleware
app.use(express.json());

// Cookie middleware
app.use(cookieParser());

// Health check route
app.use(healthRoutes);

// Rate limits
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many auth attempts. Try again later." },
});

//Rate limiter
app.use("/api", apiLimiter);

// Routes
app.use(authRouter, authLimiter);
app.use(userRouter, authLimiter);
app.use("/api", productsRoutes);
app.use(ordersRoutes);

// Error Handlers
app.use(routeNotFound);
app.use(errorHandler);

export default app;

