import { Redis } from 'ioredis';
import { config } from './env.js';

// ============================================================================
// 1. Primary Redis Client
// ============================================================================
// This client handles all standard data operations: GEOADD, SET NX, XADD, HSET.
// We configure a retry strategy so the application doesn't instantly crash 
// during temporary network blips or container restarts.
const redisClient = new Redis(config.REDIS_URI, {
  retryStrategy: (times) => {
    // Exponential backoff, max delay of 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// ============================================================================
// 2. Subscriber Redis Client (CRITICAL FOR PUB/SUB)
// ============================================================================
// Why two clients?
// In Redis, when a connection issues a SUBSCRIBE command, it enters "subscriber mode".
// In this mode, the connection CANNOT issue standard commands like GET or SET.
// Therefore, to listen for ride requests while still updating our own location,
// our Node.js server absolutely requires a dedicated connection solely for listening.
const redisSubscriber = new Redis(config.REDIS_URI, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// ============================================================================
// Event Listeners
// ============================================================================
redisClient.on('connect', () => {
  // We log this in development, but usually keep it quiet in prod
  // console.log('🔴 Connected to Redis (Primary Client)');
});

redisClient.on('error', (err) => {
  console.error('❌ CRITICAL: Redis (Primary) Connection Error', err);
});

redisSubscriber.on('error', (err) => {
  console.error('❌ CRITICAL: Redis (Subscriber) Connection Error', err);
});

export { redisClient, redisSubscriber };


