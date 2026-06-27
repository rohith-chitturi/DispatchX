import { Ride } from '../models/Ride.js';
import { LocationService } from '../services/LocationService.js';
import { DispatchService } from '../services/DispatchService.js';
import { query } from '../config/postgres.js';

/**
 * RideController
 * This is the entry point for Riders. It ties together the Data Layer (Postgres)
 * and the Dispatch Engine (Redis).
 */
export class RideController {
  /**
   * POST /api/rides/request
   * Triggered when a rider clicks "Request Ride" in the app.
   */
  static async requestRide(req, res, next) {
    try {
      const { riderId, pickupLat, pickupLon, dropoffLat, dropoffLon } = req.body;

      // 1. Basic Validation (In production, use Zod or Joi)
      if (!riderId || !pickupLat || !pickupLon) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // ========================================================================
      // 2. PREVENT DOUBLE BOOKING (Data Integrity)
      // ========================================================================
      
      // [MOCK AUTH FIX] 
      // Ensure the mock rider exists in the database before doing anything.
      // We do this right inside the controller to guarantee they exist.
      await query(
        `INSERT INTO users (id, name, email, role) VALUES ($1, 'Mock Rider', $1 || '@dispatch.local', 'RIDER') ON CONFLICT (id) DO NOTHING`,
        [riderId]
      );

      // We hit PostgreSQL using our highly optimized Partial Index.
      // If they are already waiting for a driver or in a ride, block this request.
      const activeRide = await Ride.findActiveRideForUser(riderId);
      if (activeRide) {
        return res.status(400).json({ error: 'You already have an active ride request.' });
      }

      // ========================================================================
      // 3. PERSIST THE INTENT (PostgreSQL)
      // ========================================================================
      // Create the row in Postgres FIRST so we have a permanent UUID to track.
      const ride = await Ride.createRequest({
        riderId,
        pickupLat,
        pickupLon,
        dropoffLat,
        dropoffLon
      });

      // ========================================================================
      // 4. FIND NEAREST DRIVERS (Redis GEO)
      // ========================================================================
      // Ask Redis for the nearest 5 drivers within a 5km radius.
      const nearbyDrivers = await LocationService.findNearbyDrivers(pickupLon, pickupLat);

      if (nearbyDrivers.length === 0) {
        // No drivers online nearby. 
        // We could update Postgres status to CANCELLED here depending on business rules.
        return res.status(404).json({ 
          error: 'No drivers available in your area right now.',
          rideId: ride.id 
        });
      }

      // ========================================================================
      // 5. DISPATCH (Redis Pub/Sub)
      // ========================================================================
      // Broadcast the request to those specific drivers.
      await DispatchService.broadcastRideRequest(ride.id, nearbyDrivers, {
        pickupLat,
        pickupLon,
        dropoffLat,
        dropoffLon
      });

      // ========================================================================
      // 6. RETURN SUCCESS
      // ========================================================================
      // The rider's frontend will now use this rideId to join a Socket.IO room 
      // and wait for the 'driver_assigned' WebSocket event.
      return res.status(201).json({
        message: 'Ride requested successfully. Waiting for drivers to accept.',
        rideId: ride.id,
        pingedDriversCount: nearbyDrivers.length
      });

    } catch (error) {
      // Pass any unexpected DB/Redis errors to the Global Error Handler in app.js
      next(error);
    }
  }
}
