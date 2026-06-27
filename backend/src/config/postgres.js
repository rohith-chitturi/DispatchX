import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// Initialize a connection pool using our validated configuration.
// A pool is essential in backend architectures to manage multiple concurrent requests
// without opening a new TCP connection to the database every single time.
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20, // Maximum number of concurrent connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds to free resources
  connectionTimeoutMillis: 2000, // Fail fast if we can't connect within 2 seconds
});

// Listen for successful connections
pool.on('connect', () => {
  // We only log this once per connection created, not per query.
  // console.log('📦 Connected to PostgreSQL'); 
});

// Critical: If the database server goes offline, the pool will emit an 'error' event.
// If we don't catch it, the entire Node.js process will crash silently.
pool.on('error', (err) => {
  console.error('❌ CRITICAL: Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * A centralized wrapper for executing database queries.
 * This ensures all queries pass through a single point, allowing us to add
 * performance metrics (like query duration logging) later if needed.
 * 
 * @param {string} text - The SQL query string (with $1, $2 placeholders)
 * @param {Array} params - The parameterized values to prevent SQL injection
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Simple performance monitoring in development mode
    if (config.NODE_ENV === 'development') {
      console.log(`[DB] executed query: { duration: ${duration}ms, rows: ${res.rowCount} }`);
    }
    return res;
  } catch (error) {
    console.error(`[DB Error] query failed: ${text}`, error);
    throw error;
  }
};

// Export the pool directly for advanced use-cases like SQL Transactions
export default pool;
