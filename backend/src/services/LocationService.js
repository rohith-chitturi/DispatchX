import { redisClient } from '../config/redis.js';

/**
 * LocationService
 * This is the first piece of our "Dispatch Engine".
 * It strictly handles real-time geospatial operations using Redis.
 * Because Redis stores this data entirely in RAM, it is incredibly fast,
 * capable of handling thousands of location updates per second.
 */
export class LocationService {
  // A single Redis Key stores the locations of all active drivers in the city.
  // Under the hood, Redis GEO structures are implemented using Sorted Sets (ZSET).
  static GEO_KEY = 'driver_locations';

  /**
   * Updates a driver's current location in Redis.
   * This will be called rapidly (e.g., every 3-5 seconds) by the driver's mobile app via WebSocket.
   * 
   * @param {string} driverId - The UUID of the driver
   * @param {number} lon - Longitude
   * @param {number} lat - Latitude
   */
  static async updateDriverLocation(driverId, lon, lat) {
    // GEOADD key longitude latitude member
    // If the driverId already exists in the set, their coordinates are updated.
    await redisClient.geoadd(this.GEO_KEY, lon, lat, driverId);
  }

  /**
   * Removes a driver from the active map.
   * Called when a driver goes offline, disconnects, or successfully accepts a ride
   * (so they stop receiving new ride requests).
   * 
   * @param {string} driverId 
   */
  static async removeDriver(driverId) {
    // Because Redis GEO is built on top of Sorted Sets, we use ZREM to remove a member.
    await redisClient.zrem(this.GEO_KEY, driverId);
  }

  /**
   * The core matchmaking query.
   * Finds the nearest available drivers to a rider's pickup location.
   * 
   * @param {number} lon - Rider's pickup longitude
   * @param {number} lat - Rider's pickup latitude
   * @param {number} radiusKm - Search radius in kilometers (default 5km)
   * @param {number} limit - Maximum number of drivers to ping (default 5)
   * @returns {Promise<Array<string>>} Array of driver UUIDs sorted by distance
   */
  static async findNearbyDrivers(lon, lat, radiusKm = 5, limit = 5) {
    // GEOSEARCH (Available in Redis 6.2+) replaces the deprecated GEORADIUS.
    // It searches the GEO_KEY from a specific point (FROMLONLAT) outward by a radius.
    // We use 'ASC' to ensure the closest drivers are returned first.
    // 'COUNT' ensures we don't return 100 drivers and overload our network.
    const nearbyDrivers = await redisClient.geosearch(
      this.GEO_KEY,
      'FROMLONLAT', lon, lat,
      'BYRADIUS', radiusKm, 'km',
      'ASC',
      'COUNT', limit
    );

    return nearbyDrivers;
  }
}
