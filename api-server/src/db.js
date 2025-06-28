
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/app_db",
});

export default {
  query: (text, params) => pool.query(text, params),
};
