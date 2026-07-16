import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import cors from 'cors';
import authRoutes from './routes/auth.ts';
import productRoutes from './routes/product.ts';
import variantRoutes from './routes/variant.ts';
import attributeRoutes from './routes/attribute.ts';

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api', variantRoutes);
app.use('/api', attributeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
