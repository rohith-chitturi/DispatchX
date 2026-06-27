import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * DriverDashboard
 * The core interface for drivers. It continuously streams mock GPS coordinates
 * to the backend and listens for Redis Pub/Sub broadcast events.
 */
export const DriverDashboard: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const { userId, logout } = useAuth();
  
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<string | null>(null);

  // ==========================================
  // 1. LOCATION BROADCASTING (Redis GEO)
  // ==========================================
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isOnline && socket && isConnected) {
      // 1a. Register the socket so the backend knows this is a Driver
      socket.emit('register', { userId, role: 'DRIVER' });

      // 1b. Mock Coordinates (e.g., Downtown NY)
      let currentLat = 40.7128;
      let currentLon = -74.0060;

      // Every 3 seconds, fire coordinates to the backend to update the Redis GEO index.
      interval = setInterval(() => {
        // Add slight random jitter to simulate the car driving
        currentLat += (Math.random() - 0.5) * 0.001;
        currentLon += (Math.random() - 0.5) * 0.001;

        socket.emit('update_location', { lon: currentLon, lat: currentLat });
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isOnline, socket, isConnected, userId]);

  // ==========================================
  // 2. DISPATCH LISTENERS (Redis Pub/Sub)
  // ==========================================
  useEffect(() => {
    if (!socket) return;

    // Triggered when DispatchService.js publishes to this driver's Redis channel
    socket.on('ride_request', (rideDetails) => {
      setIncomingRide(rideDetails);
      // Automatically hide the modal after 30 seconds to match the Redis TTL
      setTimeout(() => setIncomingRide(null), 30000);
    });

    // Triggered if THIS driver wins the Distributed Lock race
    socket.on('ride_accepted_success', ({ rideId }) => {
      setIncomingRide(null);
      setActiveRide(rideId);
      setIsOnline(false); // Stop broadcasting location to the general pool
    });

    // Triggered if ANOTHER driver clicked accept 1 millisecond faster
    socket.on('ride_accepted_failed', ({ reason }) => {
      alert(`⚠️ You missed it! ${reason}`);
      setIncomingRide(null);
    });

    return () => {
      socket.off('ride_request');
      socket.off('ride_accepted_success');
      socket.off('ride_accepted_failed');
    };
  }, [socket]);

  const handleAcceptRide = () => {
    if (socket && incomingRide) {
      // Attempt to acquire the Redis Distributed Lock on the backend
      socket.emit('accept_ride', { rideId: incomingRide.rideId });
    }
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-dispatch-black p-4 flex flex-col items-center">
      {/* HEADER */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8 bg-dispatch-gray p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚘</span>
          <h2 className="text-xl font-bold tracking-tight">Driver Terminal</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-dispatch-success' : 'bg-dispatch-danger'}`} />
            <span className="text-xs text-zinc-400 font-mono">
              {isConnected ? 'Socket Connected' : 'Connecting...'}
            </span>
          </div>
          <button onClick={logout} className="text-sm bg-zinc-800 px-3 py-1 rounded hover:bg-zinc-700 transition">Exit</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {!activeRide ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10">
          <div className="text-center mb-12">
            <h1 className={`text-6xl font-black tracking-tighter transition-colors duration-500 ${isOnline ? 'text-dispatch-success' : 'text-zinc-600'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </h1>
            <p className="text-zinc-400 mt-4 text-lg">
              {isOnline ? 'Transmitting GPS to Redis Geo Index...' : 'Tap the button to start receiving rides'}
            </p>
          </div>

          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={`w-64 h-64 rounded-full text-3xl font-black tracking-widest transition-all duration-500 shadow-2xl ${
              isOnline 
                ? 'bg-dispatch-success/10 text-dispatch-success border-4 border-dispatch-success animate-pulse-slow shadow-[0_0_60px_rgba(16,185,129,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            {isOnline ? 'STOP' : 'START'}
          </button>
        </div>
      ) : (
        <div className="bg-dispatch-success/10 border border-dispatch-success rounded-2xl p-10 text-center animate-slide-up w-full max-w-2xl mt-20">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-4xl font-bold text-dispatch-success mb-4">Ride Secured!</h2>
          <p className="text-zinc-300 text-lg">You won the lock race. Navigate to the pickup location.</p>
          <div className="bg-black/50 p-4 rounded-lg mt-6 inline-block border border-zinc-800">
            <p className="font-mono text-sm text-zinc-400">Ride ID: {activeRide}</p>
          </div>
          <br/>
          <button 
            onClick={() => { setActiveRide(null); setIsOnline(true); }} 
            className="mt-10 bg-dispatch-gray hover:bg-zinc-700 px-8 py-3 rounded-xl font-bold transition"
          >
            Complete Ride
          </button>
        </div>
      )}

      {/* INCOMING RIDE MODAL (Pub/Sub Event) */}
      {incomingRide && !activeRide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-up">
          <div className="bg-dispatch-black border-2 border-dispatch-neon rounded-3xl p-8 max-w-sm w-full shadow-[0_0_80px_rgba(14,165,233,0.3)]">
            <div className="text-center mb-6">
              <div className="text-5xl animate-ping-slow mb-4">🚨</div>
              <h3 className="text-3xl font-black text-white">Ride Request!</h3>
              <p className="text-dispatch-neon font-mono text-sm mt-2">Redis Pub/Sub Broadcast</p>
            </div>
            
            <button 
              onClick={handleAcceptRide}
              className="w-full bg-dispatch-neon hover:bg-sky-400 text-black font-black text-xl py-5 rounded-2xl transition-all transform active:scale-95 shadow-[0_0_20px_rgba(14,165,233,0.5)]"
            >
              ACCEPT RIDE
            </button>
            <button 
              onClick={() => setIncomingRide(null)}
              className="w-full mt-4 text-zinc-500 hover:text-white py-3 rounded-xl transition"
            >
              Ignore
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
