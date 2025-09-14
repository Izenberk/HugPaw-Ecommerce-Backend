import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { routeNotFound } from "./middleware/routeNotFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./api/v1/routes/health.routes.js";

import authRouter from "./api/v1/routes/auth.js";
import userRouter from "./api/v1/routes/user.js";
import adminRouter from "./api/v1/routes/admin.js";
import userCartRouter from "./api/v1/routes/cart.js";

dotenv.config();

const app = express();
const corsOption = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// CORS middleware
app.use(cors(corsOption));

// JSON middleware
app.use(express.json());

// Cookie middleware
app.use(cookieParser());

// Health check route
app.use(healthRoutes);

// Routes
app.use(authRouter);
app.use(userRouter);
app.use(adminRouter);
app.use(userCartRouter);

// Error Handlers
app.use(routeNotFound);
app.use(errorHandler);

export default app;
