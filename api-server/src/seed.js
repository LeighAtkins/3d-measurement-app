import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function connectWithRetry(retries = MAX_RETRIES) {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to the database.');
      return client;
    } catch (err) {
      retries--;
      console.error('Failed to connect to database. Retrying...', err.message);
      if (retries === 0) {
        console.error('Max retries reached. Could not connect to database.');
        throw err;
      }
      await new Promise(res => setTimeout(res, RETRY_DELAY));
    }
  }
}

async function seed() {
  const client = await connectWithRetry();
  if (!client) return;

  try {
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Insert a demo company
    const companyRes = await client.query(
      "INSERT INTO companies (name, subdomain) VALUES ($1, $2) ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      ['Acme Corp', 'acme']
    );
    const companyId = companyRes.rows[0].id;

    // Insert a demo admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await client.query(
      "INSERT INTO users (email, password_hash, role, company_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      ['admin@acme.com', adminPassword, 'COMPANY_ADMIN', companyId]
    );

    // Insert a demo client user
    const clientPassword = await bcrypt.hash('client123', 10);
    await client.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING",
      ['client1@example.com', clientPassword, 'CLIENT']
    );

    console.log('Database seeded successfully');
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
