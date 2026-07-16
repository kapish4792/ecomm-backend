import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

dbPool
  .connect()
  .then(() => console.log('Connected to the database successfully!'))
  .catch((err) => console.error('Database connection error:', err));

export default dbPool;
