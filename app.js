import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { routeNotFound } from "./middleware/routeNotFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./api/v1/routes/health.routes.js";
import productsRoutes from "./api/v1/routes/productsRoutes.js";
import ordersRoutes from "./api/v1/routes/ordersRoutes.js";

dotenv.config();

const app = express();
const corsOption = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,           // needed for cookies / auth headers
  optionsSuccessStatus: 204,   // for legacy browsers on preflight
};

// CORS middleware
app.use(cors(corsOption));
app.use(cors(corsOption));

// JSON middleware
app.use(express.json());

// Cookie middleware
app.use(cookieParser());

// Health check route
app.use(healthRoutes);

// Routes
app.use("/api", productsRoutes);
app.use(ordersRoutes);

// Error Handlers
app.use(routeNotFound);
app.use(errorHandler);

export default app;

