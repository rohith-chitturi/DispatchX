-- PostgreSQL Initialization Script for DispatchX
-- This file defines the permanent source of truth for the application.

-- ==========================================
-- 1. ENUMS (Custom Data Types)
-- ==========================================
-- Restricting values at the database level prevents bad data from entering via API bugs.
CREATE TYPE user_role AS ENUM ('RIDER', 'DRIVER');
CREATE TYPE ride_status AS ENUM ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- ==========================================
-- 2. USERS TABLE
-- ==========================================
-- Stores permanent accounts. We use UUIDs to prevent ID guessing attacks.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. RIDES TABLE
-- ==========================================
-- The core transactional entity. This table tracks the financial and historical lifecycle.
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The user requesting the ride.
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- driver_id is NULL initially. It is populated only when a driver 
    -- successfully acquires the Redis Distributed Lock and accepts the ride.
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Origin/Destination coordinates for permanent historical record (e.g., receipts).
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lon DECIMAL(11, 8) NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lon DECIMAL(11, 8) NOT NULL,
    
    status ride_status NOT NULL DEFAULT 'REQUESTED',
    
    -- Final price of the ride. Nullable until COMPLETED.
    fare DECIMAL(10, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. INDEXES
-- ==========================================
-- Essential for fast lookups as the table grows to millions of rows.

-- Used for fetching a Rider's ride history
CREATE INDEX idx_rides_rider_id ON rides(rider_id);

-- Used for calculating a Driver's past earnings
CREATE INDEX idx_rides_driver_id ON rides(driver_id);

-- (Advanced) Partial Index for Active Rides
-- We frequently need to check if a user is currently in a ride to prevent double-booking.
-- A partial index ONLY indexes rows that match the WHERE clause. 
-- This keeps the index tiny and lightning-fast, even if we have 10 million completed rides.
CREATE INDEX idx_active_rides ON rides(status) 
WHERE status IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS');

-- ==========================================
-- 5. TRIGGERS
-- ==========================================
-- Automatically updates the updated_at timestamp when the status changes.
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rides_modtime
    BEFORE UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
