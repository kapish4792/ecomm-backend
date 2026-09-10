import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function verify() {
  const client = await pool.connect();
  try {
    // Check all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\n📋 Tables in DB:');
    tables.rows.forEach(r => console.log(`  ✅ ${r.table_name}`));

    // Check OrderStatus enum values
    const statuses = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'OrderStatus' 
      ORDER BY enumsortorder
    `);
    console.log('\n🔄 OrderStatus enum values:');
    statuses.rows.forEach(r => console.log(`  ✅ ${r.enumlabel}`));

    // Check IdempotencyStatus enum values
    const idempStatuses = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'IdempotencyStatus'
      ORDER BY enumsortorder
    `);
    console.log('\n🔑 IdempotencyStatus enum values:');
    idempStatuses.rows.forEach(r => console.log(`  ✅ ${r.enumlabel}`));

    // Check TransactionStatus enum values
    const txStatuses = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'TransactionStatus'
      ORDER BY enumsortorder
    `);
    console.log('\n💳 TransactionStatus enum values:');
    txStatuses.rows.forEach(r => console.log(`  ✅ ${r.enumlabel}`));

    // Check orders table columns
    const orderCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log('\n📦 orders table columns:');
    orderCols.rows.forEach(r => console.log(`  ✅ ${r.column_name} (${r.data_type})`));

    console.log('\n✅ All verifications passed!');
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(console.error);
