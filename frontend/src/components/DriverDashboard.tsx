import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const driverIcon = new L.DivIcon({
  className: 'bg-transparent text-4xl',
  html: '🚕',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const riderIcon = new L.DivIcon({
  className: 'bg-transparent text-3xl',
  html: '🧍',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// A mock route path down Broadway, New York
const DRIVER_ROUTE = [
  [40.7180, -74.0020], // Start
  [40.7170, -74.0030],
  [40.7160, -74.0040],
  [40.7150, -74.0050],
  [40.7140, -74.0055],
  [40.7128, -74.0060]  // End (Matches Rider default location)
];

/**
 * DriverDashboard
 * Simulates a driver going online, receiving ride requests from Redis Pub/Sub,
 * and visually driving towards the rider on a Leaflet map.
 */
export const DriverDashboard: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const { token, logout } = useAuth();
  
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  
  // Map State
  const [driverLocation, setDriverLocation] = useState<[number, number]>(DRIVER_ROUTE[0] as [number, number]);
  const [routeIndex, setRouteIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isOnline && socket && isConnected) {
      // 1a. Register the socket securely using the JWT
      socket.emit('register', { token });

      // 1b. Start moving the car along the route every 3 seconds
      interval = setInterval(() => {
        setRouteIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % DRIVER_ROUTE.length;
          const newLoc = DRIVER_ROUTE[nextIndex] as [number, number];
          setDriverLocation(newLoc);
          
          // Stream the new GPS coordinates to the Redis Geo-spatial index
          socket.emit('location_update', { lat: newLoc[0], lon: newLoc[1] });
          return nextIndex;
        });
      }, 3000);

      // Listen for incoming ride requests dispatched by the backend
      socket.on('ride_request', (ride) => {
        console.log('New Ride Request Received!', ride);
        if (!activeRide) setIncomingRide(ride);
      });

    } else if (socket) {
      socket.off('ride_request');
    }

    return () => {
      clearInterval(interval);
      socket?.off('ride_request');
    };
  }, [isOnline, socket, isConnected, token, activeRide]);

  const acceptRide = async () => {
    if (!incomingRide) return;

    try {
      // Race condition! We must hit the REST API to secure the Redis Distributed Lock.
      const response = await fetch('http://localhost:3000/api/rides/accept', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          rideId: incomingRide.id,
          driverLat: driverLocation[0],
          driverLon: driverLocation[1]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      console.log('Successfully won the lock and accepted the ride!', data);
      
      // We won! Store the active ride and dismiss the incoming prompt.
      setActiveRide(incomingRide);
      setIncomingRide(null);
      
      // Join the specific ride's WebSocket room so the rider can see our GPS updates
      socket?.emit('join_ride_room', incomingRide.id);

    } catch (error: any) {
      console.error('Failed to accept ride (Lock lost or error):', error);
      alert(error.message);
      setIncomingRide(null); // Clear it so they can wait for the next one
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white relative font-sans">
      
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 w-full z-[1000] p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h1 className="text-3xl font-black tracking-tight">
          Dispatch<span className="text-dispatch-neon">X</span> <span className="text-zinc-500 font-medium text-lg">DRIVER</span>
        </h1>
        <div className="flex items-center space-x-4 pointer-events-auto">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-dispatch-success' : 'bg-dispatch-danger'}`} />
            <span className="text-sm font-mono text-zinc-400">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
          <button onClick={logout} className="text-sm font-mono text-zinc-500 hover:text-white transition-colors">
            LOGOUT
          </button>
        </div>
      </div>

      {/* Real-time Map Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={driverLocation} 
          zoom={15} 
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Driver's Location Marker */}
          <Marker position={driverLocation} icon={driverIcon}>
            <Popup className="font-mono">Your Vehicle</Popup>
          </Marker>

          {/* Rider's Location Marker (Only visible when a ride is active) */}
          {activeRide && (
            <Marker position={[activeRide.pickup_lat, activeRide.pickup_lon]} icon={riderIcon}>
              <Popup className="font-mono">Pickup Passenger Here</Popup>
            </Marker>
          )}

          {/* Draw a line connecting the driver to the rider */}
          {activeRide && (
            <Polyline 
              positions={[driverLocation, [activeRide.pickup_lat, activeRide.pickup_lon]]} 
              color="#00FF64" 
              dashArray="5, 10"
              weight={4}
            />
          )}
        </MapContainer>
      </div>

      {/* Bottom Action Panel */}
      <div className="absolute bottom-0 left-0 w-full z-[1000] p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-md mx-auto space-y-4">
          
          {incomingRide && !activeRide && (
            <div className="bg-zinc-900/90 backdrop-blur-xl border border-dispatch-neon rounded-2xl p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)] animate-slide-up">
              <h3 className="text-dispatch-neon font-black text-xl mb-1">NEW RIDE REQUEST!</h3>
              <p className="text-zinc-400 font-mono text-sm mb-6">Pickup: Downtown NY</p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={acceptRide}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl transition-transform transform active:scale-95"
                >
                  ACCEPT RIDE
                </button>
                <button 
                  onClick={() => setIncomingRide(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-xl transition-colors"
                >
                  DECLINE
                </button>
              </div>
            </div>
          )}

          {activeRide && (
            <div className="bg-dispatch-success/20 backdrop-blur-xl border border-dispatch-success rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(0,255,100,0.2)]">
              <h3 className="text-dispatch-success font-black text-2xl">EN ROUTE TO PICKUP</h3>
              <p className="text-dispatch-success/80 font-mono text-sm mt-2">Streaming live GPS data to rider...</p>
            </div>
          )}

          {!activeRide && !incomingRide && (
            <button 
              onClick={() => setIsOnline(!isOnline)}
              className={`w-full font-black py-5 rounded-2xl text-xl transition-all shadow-lg ${
                isOnline 
                  ? 'bg-dispatch-danger hover:bg-red-600 text-white shadow-dispatch-danger/30' 
                  : 'bg-white hover:bg-zinc-200 text-black shadow-white/30'
              }`}
            >
              {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
