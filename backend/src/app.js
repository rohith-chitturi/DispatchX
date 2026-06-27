import express from 'express';
import cors from 'cors';
import rideRoutes from './routes/rideRoutes.js';

// ==========================================
// Express App Initialization
// ==========================================
// We separate the Express app from the HTTP server (server.js).
// This architectural decision makes it much easier to run automated integration tests
// using tools like Supertest without actually binding to a network port.
const app = express();

// ==========================================
// Global Middleware
// ==========================================
app.use(cors()); // Allow cross-origin requests from our React frontend
app.use(express.json()); // Automatically parse incoming JSON payloads

// ==========================================
// Base Routes
// ==========================================
// A simple health check route used by Docker/Kubernetes to verify the app is running.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'dispatchx-backend' });
});

// We mount our feature routes here:
app.use('/api/rides', rideRoutes);


// Global Error Handler
// ==========================================
// A centralized catch-all for any errors thrown in our controllers.
// This prevents the application from returning raw stack traces to the client in production.
app.use((err, req, res, next) => {
  console.error('🔥 unhandled  Error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
