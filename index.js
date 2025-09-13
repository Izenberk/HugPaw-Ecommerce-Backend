import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRouter from "./api/v1/routes/auth.js";
import { routeNotFound } from "./middleware/routeNotFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./api/v1/routes/health.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3030;

app.set("trust proxy", 1);

app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const corsOption = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://hug-paw-ecommerce.vercel.app/",
  ],
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
authRouter.use("/api/v1/auth", authRouter);
app.get("/", (_req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Notes API</title>
            <style>
            body {
                font-family: 'Segoe UI', sans-serif;
                background: #f7f9fc;
                color: #333;
                text-align: center;
                padding: 50px;
            }
            h1 {
                font-size: 2.5rem;
                color: #2c3e50;
            }
            p {
                font-size: 1.2rem;
                margin-top: 1rem;
            }
            code {
                background: #eee;
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
                font-size: 0.95rem;
            }
            .container {
                max-width: 600px;
                margin: auto;
            }
            </style>
        </head>
        <body>
            <div class="container">
            <h1>🐾 Welcome to the HugPaw API</h1>
            <p>This is a simple REST API built with <strong>Express</strong> and <strong>MongoDB</strong>.</p>
            <p>Use a REST client like <em>VSCode REST Client</em> or <em>Postman</em> to interact.</p>
            <p>✨ Happy coding!</p>
            </div>
        </body>
        </html>
    `);
});
// User Routes
app.use("/api/v1/auth", authRouter);

// Error Handlers
app.use(routeNotFound);
app.use(errorHandler);

export default app;
