import { LocationService } from '../services/LocationService.js';
import { DispatchService } from '../services/DispatchService.js';
import { redisSubscriber } from '../config/redis.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dispatchx_super_secret_dev_key_2026';

/**
 * Initializes all WebSocket listeners for the application.
 * This acts as the "Controller" for our real-time events.
 * 
 * @param {import('socket.io').Server} io 
 */
export const initializeWebSockets = (io) => {
  // ============================================================================
  // 1. REDIS PUB/SUB LISTENER (The Bridge from Redis to Socket.IO)
  // ============================================================================
  // We use our dedicated redisSubscriber client to listen for broadcasted rides.
  // 'psubscribe' allows us to listen to a pattern, so we catch messages for ALL drivers.
  redisSubscriber.psubscribe('driver:*:requests', (err, count) => {
    if (err) console.error('❌ Failed to psubscribe to driver channels:', err);
  });

  // When DispatchService.js publishes a ride, this event fires.
  redisSubscriber.on('pmessage', (pattern, channel, message) => {
    // Extract the UUID from 'driver:123-uuid:requests'
    const driverId = channel.split(':')[1];
    
    // We instantly forward the Redis payload to that specific driver's WebSocket connection
    io.to(`driver_${driverId}`).emit('ride_request', JSON.parse(message));
  });

  // ============================================================================
  // 2. SOCKET.IO EVENT LISTENERS
  // ============================================================================
  io.on('connection', (socket) => {
    console.log(`⚡ WebSocket Connected: ${socket.id}`);

    // Register the client. In a real app, this would use JWT verification.
    // Register the client securely using a JWT token provided by the frontend
    socket.on('register', ({ token }) => {
      try {
        if (!token) {
          return socket.emit('error', { message: 'Authentication token missing.' });
        }

        // Verify the JWT token cryptographically
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const userId = decoded.id;
        const role = decoded.role;

        // Place the socket into a private room based on their verified role and ID
        socket.join(`${role.toLowerCase()}_${userId}`);
        socket.userId = userId;
        socket.role = role;

        console.log(`✅ User ${userId} registered as ${role} (JWT Verified)`);
      } catch (err) {
        console.error('❌ Invalid JWT token:', err.message);
        socket.emit('error', { message: 'Invalid or expired token. Please log in again.' });
      }
    });

    // ----------------------------------------------------
    // DRIVER: Update Location (High Frequency)
    // ----------------------------------------------------
    socket.on('location_update', async ({ lon, lat, rideId }) => {
      if (socket.role === 'DRIVER' && socket.userId) {
        // This hits our Redis GEO structure
        await LocationService.updateDriverLocation(socket.userId, lon, lat);
        
        // If they have an active ride, stream it directly to the Rider!
        if (rideId) {
          io.to(`ride_${rideId}`).emit('driver_location_update', { lat, lon });
        }
      }
    });

    // ----------------------------------------------------
    // DRIVER: Notify Rider that Ride was Accepted
    // ----------------------------------------------------
    // Since the actual lock is handled via the REST API, the driver's client
    // emits this immediately after getting a 200 OK from the API.
    socket.on('driver_accepted_ride', ({ rideId }) => {
      if (socket.role === 'DRIVER') {
        io.to(`ride_${rideId}`).emit('ride_assigned', { driverId: socket.userId });
      }
    });

    // ----------------------------------------------------
    // RIDER / DRIVER: Join Ride Room
    // ----------------------------------------------------
    socket.on('join_ride_room', (rideId) => {
      // Both Rider and Driver join this private room to exchange GPS streams
      socket.join(`ride_${rideId}`);
      console.log(`📡 Socket ${socket.id} joined ride_${rideId}`);
    });

    // ----------------------------------------------------
    // Ride Lifecycle Events (Cancellation / Completion)
    // ----------------------------------------------------
    socket.on('ride_cancelled', ({ rideId }) => {
      io.to(`ride_${rideId}`).emit('ride_cancelled_event');
    });

    socket.on('ride_completed', ({ rideId, fare }) => {
      io.to(`ride_${rideId}`).emit('ride_completed_event', { fare });
    });

    // ----------------------------------------------------
    // Disconnect Handler
    // ----------------------------------------------------
    socket.on('disconnect', async () => {
      console.log(`🔌 WebSocket Disconnected: ${socket.id}`);
      if (socket.role === 'DRIVER' && socket.userId) {
        // Clean up the Redis map to prevent ghost drivers
        await LocationService.removeDriver(socket.userId);
      }
    });
  });
};
