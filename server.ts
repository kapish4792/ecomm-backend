import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// ── Route Imports ────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.ts';
import productRoutes from './routes/product.ts';
import variantRoutes from './routes/variant.ts';
import attributeRoutes from './routes/attribute.ts';
import orderRoutes from './routes/order.ts';


dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8080;

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', variantRoutes);
app.use('/api', attributeRoutes);

// Order API — State Machine
app.use('/api/orders', orderRoutes);


// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
