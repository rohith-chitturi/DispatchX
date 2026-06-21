import dotenv from 'dotenv';

// Load environment variables from a .env file into process.env
dotenv.config();

// Define the mandatory environment variables required for the application to boot
const requiredEnvVars = ['PORT', 'REDIS_URI', 'DATABASE_URL'];

// Fail-Fast: If any required variable is missing, crash the app immediately.
// This prevents silent failures in production where the app runs but cannot connect to Redis or Postgres.
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ CRITICAL ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// Centralized configuration object
// This ensures the rest of the application imports from this file, not process.env directly.
export const config = {
  PORT: parseInt(process.env.PORT, 10),
  REDIS_URI: process.env.REDIS_URI,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
