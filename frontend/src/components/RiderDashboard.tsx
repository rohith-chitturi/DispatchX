import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RideHistory } from './RideHistory';
import { ReceiptModal } from './ReceiptModal';

// Fix Leaflet's default icon path issues in React/Vite by using custom Emoji Icons
const riderIcon = new L.DivIcon({
  className: 'bg-transparent text-3xl',
  html: '🧍',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const driverIcon = new L.DivIcon({
  className: 'bg-transparent text-4xl',
  html: '🚕',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Default Mock Location (Downtown New York)
const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.0060;

/**
 * RiderDashboard
 * A production-grade map interface for riders to request rides and track drivers in real-time.
 */
export const RiderDashboard: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const { token, logout } = useAuth();
  
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'ASSIGNED'>('IDLE');
  const [rideId, setRideId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [receiptFare, setReceiptFare] = useState<string | null>(null);
  const [completedRideId, setCompletedRideId] = useState<string | null>(null);
  
  // Coordinates
  const [riderLocation] = useState<[number, number]>([DEFAULT_LAT, DEFAULT_LON]);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!socket) return;

    // Register as a rider securely
    socket.emit('register', { token });

    // When the backend successfully assigns a driver
    socket.on('ride_assigned', (data) => {
      console.log('Driver Assigned!', data);
      setStatus('ASSIGNED');
    });

    // Real-time GPS stream from the assigned driver
    socket.on('driver_location_update', (data) => {
      console.log('Live GPS Received:', data);
      setDriverLocation([data.lat, data.lon]);
    });

    socket.on('ride_cancelled_event', () => {
      console.log('Ride was cancelled');
      setStatus('IDLE');
      setDriverLocation(null);
      setRideId(null);
    });

    socket.on('ride_completed_event', (data: any) => {
      console.log('Ride completed by driver!', data);
      setStatus('IDLE');
      setDriverLocation(null);
      setCompletedRideId(rideId); // Store before clearing
      setRideId(null);
      if (data && data.fare) {
        setReceiptFare(data.fare);
      }
    });

    return () => {
      socket.off('ride_assigned');
      socket.off('driver_location_update');
      socket.off('ride_cancelled_event');
      socket.off('ride_completed_event');
    };
  }, [socket, token]);

  const requestRide = async () => {
    setStatus('SEARCHING');
    setErrorMessage(null);
    try {
      const response = await fetch('http://localhost:3000/api/rides/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          pickupLat: riderLocation[0],
          pickupLon: riderLocation[1],
          dropoffLat: 40.7300,
          dropoffLon: -73.9900
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setRideId(data.rideId);
      
      // Join the specific socket room for this ride to receive GPS updates
      socket?.emit('join_ride_room', data.rideId);

    } catch (error: any) {
      console.error('Request failed:', error);
      setErrorMessage(error.message || 'An unknown error occurred.');
      setStatus('IDLE');
    }
  };

  const cancelRide = async () => {
    if (!rideId) return;
    try {
      const response = await fetch('http://localhost:3000/api/rides/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rideId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      // Notify the room via WebSocket so backend/driver clears state
      socket?.emit('ride_cancelled', { rideId });
      
      setStatus('IDLE');
      setDriverLocation(null);
      setRideId(null);
    } catch (error: any) {
      console.error('Failed to cancel ride:', error);
      setErrorMessage(error.message || 'Could not cancel ride.');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white relative font-sans">
      
      {/* Top Navbar */}
      <div className="absolute top-0 left-0 w-full z-[1000] p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-3xl font-black tracking-tight">
          Dispatch<span className="text-dispatch-neon">X</span> <span className="text-zinc-500 font-medium text-lg">RIDER</span>
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-dispatch-success' : 'bg-dispatch-danger'}`} />
            <span className="text-sm font-mono text-zinc-400">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
          <button onClick={() => setIsHistoryOpen(true)} className="text-sm font-mono text-zinc-500 hover:text-white transition-colors mr-2">
            HISTORY
          </button>
          <button onClick={logout} className="text-sm font-mono text-zinc-500 hover:text-white transition-colors">
            LOGOUT
          </button>
        </div>
      </div>

      {/* Real-time Map Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
          center={riderLocation} 
          zoom={14} 
          className="h-full w-full"
          zoomControl={false}
        >
          {/* We use a sleek dark-mode map tile from CartoDB */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Rider's Location Marker */}
          <Marker position={riderLocation} icon={riderIcon}>
            <Popup className="font-mono">Your Pickup Location</Popup>
          </Marker>

          {/* Driver's Live Location Marker */}
          {driverLocation && (
            <Marker position={driverLocation} icon={driverIcon}>
              <Popup className="font-mono">Your Driver is Approaching!</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Bottom Action Panel */}
      <div className="absolute bottom-0 left-0 w-full z-[1000] p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-md mx-auto">
          {errorMessage && (
            <div className="mb-4 bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-xl text-sm font-mono backdrop-blur-md">
              ⚠️ {errorMessage}
            </div>
          )}

          {status === 'IDLE' && (
            <button 
              onClick={requestRide}
              className="w-full bg-white text-black font-black py-5 rounded-2xl text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform"
            >
              REQUEST RIDE NOW
            </button>
          )}

          {status === 'SEARCHING' && (
            <div className="flex space-x-3">
              <div className="flex-1 bg-zinc-900/80 backdrop-blur-xl border border-dispatch-neon text-dispatch-neon font-black py-5 rounded-xl text-lg flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-4 border-dispatch-neon border-t-transparent rounded-full animate-spin" />
                <span>SEARCHING...</span>
              </div>
              <button 
                onClick={cancelRide}
                className="bg-red-500/20 border border-red-500 hover:bg-red-500/40 text-red-400 font-black px-6 rounded-xl transition-colors"
              >
                CANCEL
              </button>
            </div>
          )}

          {status === 'ASSIGNED' && (
            <div className="flex flex-col space-y-3">
              <div className="w-full bg-dispatch-success/20 backdrop-blur-xl border border-dispatch-success text-dispatch-success font-black py-5 rounded-xl text-xl text-center shadow-[0_0_40px_rgba(0,255,100,0.2)]">
                DRIVER INBOUND
                <div className="text-xs font-mono font-normal mt-1 opacity-80">Tracking Live GPS on Map</div>
              </div>
              <button 
                onClick={cancelRide}
                className="w-full bg-red-500/10 border border-red-500/50 hover:bg-red-500/30 text-red-400 font-black py-3 rounded-xl transition-colors text-sm"
              >
                CANCEL RIDE
              </button>
            </div>
          )}
        </div>
      </div>

      <RideHistory isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      
      <ReceiptModal 
        isOpen={!!receiptFare} 
        fare={receiptFare} 
        rideId={completedRideId}
        onClose={() => {
          setReceiptFare(null);
          setCompletedRideId(null);
        }} 
      />

    </div>
  );
};






