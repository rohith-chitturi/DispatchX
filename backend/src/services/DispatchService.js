import { redisClient } from '../config/redis.js';
import { Ride } from '../models/Ride.js';
import { query } from '../config/postgres.js';

/**
 * DispatchService
 * The second piece of the "Dispatch Engine".
 * Handles broadcasting requests via Pub/Sub and resolving the race condition
 * when multiple drivers try to accept the same ride via Distributed Locks.
 */
export class DispatchService {
  /**
   * Broadcasts a ride request to specific drivers.
   * 
   * @param {string} rideId - The UUID from PostgreSQL
   * @param {Array<string>} driverIds - Array of nearby driver UUIDs
   * @param {Object} rideDetails - Payload to send (pickup coords, etc)
   */
  static async broadcastRideRequest(rideId, driverIds, rideDetails) {
    // 1. Set a TTL (Time-To-Live) for the ride request in Redis.
    // If no driver accepts it in 30 seconds, it automatically expires.
    await redisClient.set(`request:${rideId}`, 'active', 'EX', 30);

    // 2. Broadcast via Redis Pub/Sub.
    // We publish to a specific channel per driver. 
    // Our Socket.IO server will be subscribed to these channels to push the event to the phone.
    for (const driverId of driverIds) {
      await redisClient.publish(`driver:${driverId}:requests`, JSON.stringify({
        rideId,
        ...rideDetails
      }));
    }
  }

  /**
   * Handles the race condition when 2+ drivers click "Accept" simultaneously.
   * We use a Redis Distributed Lock (SET NX) to guarantee strictly ONE winner.
   * 
   * @param {string} rideId 
   * @param {string} driverId 
   * @returns {Promise<boolean>} True if successfully accepted, false otherwise.
   */
  static async acceptRide(rideId, driverId) {
    // ==========================================
    // 1. ACQUIRE DISTRIBUTED LOCK
    // ==========================================
    // Command: SET lock:ride:<rideId> <driverId> NX EX 5
    // 'NX' = Only set if it does NOT already exist. This is atomic!
    // 'EX 5' = Auto-release after 5 seconds to prevent deadlocks if the server crashes.
    const lockAcquired = await redisClient.set(
      `lock:ride:${rideId}`, 
      driverId, 
      'NX', 
      'EX', 
      5
    );

    // If another driver's request hit Redis 1 millisecond earlier, lockAcquired will be null.
    if (!lockAcquired) {
      console.log(`Driver ${driverId} failed to acquire lock for ride ${rideId}`);
      return false; // They lost the race.
    }

    try {
      // ========================================================================
      // 2. UPDATE POSTGRESQL (Source of Truth)
      // ========================================================================
      
      // [MOCK AUTH FIX] Ensure the mock driver exists in the database
      // Because the driver's UUID is randomly generated on the frontend,
      // Postgres will throw a Foreign Key Constraint when we assign them to the ride.
      await query(
        `INSERT INTO users (id, name, email, role) VALUES ($1, 'Mock Driver', $2, 'DRIVER') ON CONFLICT (id) DO NOTHING`,
        [driverId, `${driverId}@dispatch.local`]
      );

      // The lock is ours! Safely update the persistent database.
      // The Ride.assignDriver method has a defensive WHERE status = 'REQUESTED' check as a backup.
      const assignedRide = await Ride.assignDriver(rideId, driverId);

      if (!assignedRide) {
        // Edge case: The request expired or rider cancelled right as they clicked accept.
        return false;
      }

      // ==========================================
      // 3. CLEANUP & EVENT SOURCING
      // ==========================================
      // Clear the active request TTL so it doesn't timeout anymore.
      await redisClient.del(`request:${rideId}`);

      // Record the state change in Redis Streams (Append-Only Log)
      // XADD stream:ride_events * event ACCEPTED rideId <id> driverId <id>
      // This allows external microservices (like a billing service) to process events reliably.
      await redisClient.xadd(
        'stream:ride_events', 
        '*', 
        'event', 'ACCEPTED', 
        'rideId', rideId, 
        'driverId', driverId
      );

      return true;

    } catch (error) {
      console.error('Error during ride assignment, releasing lock...', error);
      throw error;
    } finally {
      // ==========================================
      // 4. RELEASE LOCK
      // ==========================================
      // Safely release the lock. We check to make sure we still own it before deleting.
      const currentLockHolder = await redisClient.get(`lock:ride:${rideId}`);
      if (currentLockHolder === driverId) {
        await redisClient.del(`lock:ride:${rideId}`);
      }
    }
  }
}
