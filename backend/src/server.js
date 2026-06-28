import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { config } from './config/env.js';
import pool from './config/postgres.js';
import { redisClient } from './config/redis.js';
import { initializeWebSockets } from './websockets/socketHandler.js';

// ==========================================
// 1. Create HTTP Server
// ==========================================
// We wrap the Express app in a native Node.js HTTP server.
// This is required because Socket.IO needs a raw HTTP server to attach to.
const httpServer = createServer(app);

// ==========================================
// 2. Initialize Socket.IO
// ==========================================
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, this should be restricted to the exact frontend domain
    methods: ['GET', 'POST']
  }
});

// Initialize the actual WebSocket Controller
initializeWebSockets(io);

// ==========================================
// 3. Graceful Shutdown & Boot
// ==========================================
// A robust distributed system handles SIGINT/SIGTERM to cleanly close database connections
// rather than crashing instantly, which corrupts in-flight transactions.

const shutdown = async () => {
  console.log('\n🛑 Initiating graceful shutdown...');
  await pool.end(); // Close Postgres pool
  await redisClient.quit(); // Close Redis connections
  httpServer.close(() => {
    console.log('✅ Server cleanly shut down.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Boot the server
httpServer.listen(config.PORT, () => {
  console.log(`🚀 DispatchX Server running on port ${config.PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
});

// Export io so our controllers can broadcast messages if needed
export { io };




