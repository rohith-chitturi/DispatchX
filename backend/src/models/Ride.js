import { query } from '../config/postgres.js';

/**
 * Ride Model
 * Acts as the Data Access Object (DAO) for the 'rides' table.
 * This class handles the critical state transitions of a ride lifecycle.
 */
export class Ride {
  /**
   * Phase 1: Rider requests a ride.
   * Creates a row with status 'REQUESTED'. driver_id is NULL.
   */
  static async createRequest({ riderId, pickupLat, pickupLon, dropoffLat, dropoffLon }) {
    const text = `
      INSERT INTO rides (rider_id, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, status)
      VALUES ($1, $2, $3, $4, $5, 'REQUESTED')
      RETURNING *;
    `;
    const values = [riderId, pickupLat, pickupLon, dropoffLat, dropoffLon];
    const { rows } = await query(text, values);
    return rows[0];
  }

  /**
   * Phase 2: Driver accepts the ride.
   * This is called ONLY AFTER the driver successfully acquires the Redis lock.
   * We use a strict WHERE clause to prevent a race condition in the database itself.
   */
  static async assignDriver(rideId, driverId) {
    const text = `
      UPDATE rides 
      SET driver_id = $1, status = 'ACCEPTED' 
      WHERE id = $2 AND status = 'REQUESTED'
      RETURNING *;
    `;
    const values = [driverId, rideId];
    const { rows } = await query(text, values);
    return rows[0];
  }

  /**
   * Phase 3: Driver starts the ride.
   */
  static async startRide(rideId) {
    const text = `
      UPDATE rides 
      SET status = 'IN_PROGRESS' 
      WHERE id = $1 AND status = 'ACCEPTED'
      RETURNING *;
    `;
    const { rows } = await query(text, [rideId]);
    return rows[0];
  }

  /**
   * Cancel a requested ride (e.g., if no drivers are available).
   */
  static async cancelRide(rideId) {
    const text = `
      UPDATE rides 
      SET status = 'CANCELLED' 
      WHERE id = $1 AND status = 'REQUESTED'
      RETURNING *;
    `;
    const { rows } = await query(text, [rideId]);
    return rows[0];
  }

  /**
   * Fast lookup using our Partial Index to check if a user is currently busy.
   */
  static async findActiveRideForUser(userId) {
    const text = `
      SELECT* FROM rides 
      WHERE (rider_id = $1 OR driver_id = $1) 
      AND status IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS');
    `;
    const { rows } = await query(text, [userId]);
    return rows[0];
  }
}






