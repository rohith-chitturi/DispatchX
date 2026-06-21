# DispatchX 🚖

> A real-time, highly concurrent ride-dispatch platform demonstrating advanced distributed systems concepts and Redis expertise.

**DispatchX** is not just another CRUD application. It is a robust backend system designed to solve the complexities of real-time geospatial matching, concurrent state management, and event-driven architectures typically found in companies like Uber, Ola, or Doordash.

## 🚀 Key Features & Redis Integration

This project was built specifically to showcase how **Redis** can be used beyond simple caching to solve hard engineering problems:

1. **Geospatial Dispatch Engine**: Uses Redis `GEOADD` and `GEOSEARCH` to instantly find the nearest available drivers to a rider's request within microseconds.
2. **Real-time Event Broadcasting**: Utilizes Redis **Pub/Sub** to broadcast ride requests to specific regional channels, ensuring only relevant drivers receive the ping.
3. **Concurrency Control**: Implements **Distributed Locks** (`SET NX EX`) to prevent race conditions when multiple drivers attempt to accept the exact same ride simultaneously.
4. **Reliable Event Sourcing**: Leverages Redis **Streams** as an append-only log to record critical state transitions (Ride Requested -> Ride Accepted -> Ride Started) for fault tolerance and asynchronous processing.
5. **Ephemeral State Management**: Relies on Redis **TTL (Time-To-Live)** to automatically expire unaccepted ride requests.

## 🛠️ Tech Stack

*   **Caching & Real-time Brain**: Redis
*   **Persistent Storage**: PostgreSQL
*   **Backend API & WebSockets**: Node.js, Express, Socket.IO
*   **Frontend Client**: React, TypeScript, Tailwind CSS
*   **Infrastructure**: Docker & Docker Compose

## 🏗️ System Architecture

*   **Application Tier**: Stateless Node.js microservices. All state is offloaded to Redis/Postgres, meaning the application can be scaled horizontally without breaking WebSockets or locks.
*   **Persistence Tier**: PostgreSQL guarantees ACID compliance for user accounts, billing history, and completed rides.
*   **Real-time Tier**: Redis acts as the high-throughput, low-latency engine for everything happening *right now* (driver locations, active dispatching).

## 🏃‍♂️ Running Locally

1. Ensure you have Docker and Docker Compose installed.
2. Clone the repository.
3. Run the following command to spin up the database, Redis, and backend services:
   ```bash
   docker-compose up -d
   ```
4. Access the API and Frontend. (Ports to be added as services are implemented).

## 👨‍💻 Author

Built by [Rohith Chitturi] as a demonstration of backend engineering and distributed systems.
