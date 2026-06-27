import { LocationService } from '../services/LocationService.js';
import { DispatchService } from '../services/DispatchService.js';
import { redisSubscriber } from '../config/redis.js';
import { query } from '../config/postgres.js';

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
    socket.on('register', async ({ userId, role }) => {
      // Place the socket into a private room. This makes it incredibly easy to target them later.
      socket.join(`${role.toLowerCase()}_${userId}`);
      socket.userId = userId;
      socket.role = role;

      // [MOCK AUTH FIX]
      // Because our frontend generates a random UUID in AuthContext instead of an actual login,
      // Postgres will throw a Foreign Key Constraint error when we try to create/accept rides.
      // We do a fast UPSERT here to ensure they exist in the database.
      try {
        await query(
          `INSERT INTO users (id, name, email, role) VALUES ($1, 'Mock User', $1 || '@dispatch.local', $2) ON CONFLICT (id) DO NOTHING`,
          [userId, role]
        );
      } catch (err) {
        console.error('Failed to create mock user:', err);
      }

      console.log(`✅ User ${userId} registered as ${role}`);
    });

    // ----------------------------------------------------
    // DRIVER: Update Location (High Frequency)
    // ----------------------------------------------------
    socket.on('update_location', async ({ lon, lat }) => {
      if (socket.role === 'DRIVER' && socket.userId) {
        // This hits our Redis GEO structure
        await LocationService.updateDriverLocation(socket.userId, lon, lat);
      }
    });

    // ----------------------------------------------------
    // DRIVER: Accept Ride (Concurrency Critical)
    // ----------------------------------------------------
    socket.on('accept_ride', async ({ rideId }) => {
      if (socket.role !== 'DRIVER') return;

      try {
        // Attempt to acquire the Redis Distributed Lock
        const success = await DispatchService.acceptRide(rideId, socket.userId);
        
        if (success) {
          // Tell the driver they won the race
          socket.emit('ride_accepted_success', { rideId });
          
          // Remove them from the active map so they stop receiving new requests
          await LocationService.removeDriver(socket.userId);
          
          // Notify the Rider that their car is on the way
          io.to(`ride_${rideId}`).emit('driver_assigned', { driverId: socket.userId });
        } else {
          // Tell the driver someone else beat them to it
          socket.emit('ride_accepted_failed', { reason: 'Ride already taken or expired.' });
        }
      } catch (error) {
        console.error('Error in accept_ride:', error);
        socket.emit('error', { message: 'Failed to process ride acceptance.' });
      }
    });

    // ----------------------------------------------------
    // RIDER: Track Ride
    // ----------------------------------------------------
    socket.on('track_ride', ({ rideId }) => {
      // The rider joins a room specific to their ride to receive updates
      socket.join(`ride_${rideId}`);
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
