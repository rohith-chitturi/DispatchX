import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * RiderDashboard
 * The core interface for riders. It triggers the REST API to start the dispatch
 * process, and listens to WebSockets for real-time driver assignment updates.
 */
export const RiderDashboard: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const { userId, logout } = useAuth();
  
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'ASSIGNED'>('IDLE');
  const [rideId, setRideId] = useState<string | null>(null);
  const [assignedDriverId, setAssignedDriverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // WEBSOCKET LISTENERS
  // ==========================================
  useEffect(() => {
    if (!socket) return;

    // Register as a rider
    socket.emit('register', { userId, role: 'RIDER' });

    // When the backend successfully assigns a driver (after the lock race is won)
    // it will broadcast this event to the specific room for this ride.
    socket.on('driver_assigned', ({ driverId }) => {
      setStatus('ASSIGNED');
      setAssignedDriverId(driverId);
    });

    return () => {
      socket.off('driver_assigned');
    };
  }, [socket, userId]);

  // ==========================================
  // REST API TRIGGER
  // ==========================================
  const requestRide = async () => {
    try {
      setStatus('SEARCHING');
      setError(null);

      // We hardcode coordinates that are identical to the Driver's starting point
      // so that they are guaranteed to be found within the 5km Redis GEOSEARCH radius.
      const payload = {
        riderId: userId,
        pickupLat: 40.7128,
        pickupLon: -74.0060,
        dropoffLat: 40.7580,
        dropoffLon: -73.9855
      };

      // 1. Trigger the standard HTTP REST API
      const response = await fetch('http://localhost:3000/api/rides/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request ride');
      }

      setRideId(data.rideId);
      
      // 2. Tell the WebSocket to join the specific room for this Ride UUID
      // so we can receive the 'driver_assigned' push notification.
      socket?.emit('track_ride', { rideId: data.rideId });

    } catch (err: any) {
      setError(err.message);
      setStatus('IDLE');
    }
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    // We apply the 'radar-grid' class here to create the stunning map effect
    <div className="min-h-screen bg-dispatch-black radar-grid flex flex-col items-center p-4">
      
      {/* HEADER */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-dispatch-gray/90 backdrop-blur-md border border-zinc-800 p-4 rounded-xl z-20 mt-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <h2 className="text-xl font-bold tracking-tight">Rider Dashboard</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-dispatch-success' : 'bg-dispatch-danger'}`} />
            <span className="text-xs text-zinc-400 font-mono">
              {isConnected ? 'Socket Connected' : 'Connecting...'}
            </span>
          </div>
          <button onClick={logout} className="text-sm bg-zinc-800 px-3 py-1 rounded hover:bg-zinc-700 transition">Exit</button>
        </div>
      </div>

      {/* MAIN RADAR UI */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        
        {/* Animated Radar Rings - Only visible while searching */}
        {status === 'SEARCHING' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-64 h-64 border-[1px] border-dispatch-neon/40 rounded-full animate-ping-slow absolute" />
            <div className="w-[24rem] h-[24rem] border-[1px] border-dispatch-neon/20 rounded-full animate-ping-slow absolute" style={{ animationDelay: '0.5s' }} />
            <div className="w-[36rem] h-[36rem] border-[1px] border-dispatch-neon/10 rounded-full animate-ping-slow absolute" style={{ animationDelay: '1s' }} />
          </div>
        )}

        {/* Central Interactive Hub */}
        <div className="z-10 bg-black/70 backdrop-blur-2xl border border-white/10 p-10 rounded-[2rem] max-w-md w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          
          {error && (
            <div className="bg-dispatch-danger/10 border border-dispatch-danger/50 text-dispatch-danger p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {status === 'IDLE' && (
            <div className="animate-slide-up">
              <div className="text-7xl mb-6 transform transition-transform hover:scale-110 duration-300">📍</div>
              <h1 className="text-3xl font-extrabold mb-3">Ready to go?</h1>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Tap below to trigger the REST API and initialize the Redis Geospatial dispatch engine.
              </p>
              <button 
                onClick={requestRide}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-2xl transition-all transform active:scale-95 text-xl shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                REQUEST RIDE
              </button>
            </div>
          )}

          {status === 'SEARCHING' && (
            <div className="animate-slide-up">
              <div className="text-7xl mb-6 animate-pulse-slow">📡</div>
              <h1 className="text-3xl font-extrabold text-dispatch-neon mb-3">Locating Drivers</h1>
              <p className="text-dispatch-neon/80 mb-4 font-mono text-sm tracking-widest uppercase">Executing GEOSEARCH</p>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Broadcasting ride request via Redis Pub/Sub to all vehicles within a 5km radius.
              </p>
              
              <div className="w-full bg-zinc-900 rounded-full h-1.5 mb-2 overflow-hidden">
                <div className="bg-dispatch-neon h-1.5 w-full animate-pulse-slow rounded-full" />
              </div>
            </div>
          )}

          {status === 'ASSIGNED' && (
            <div className="animate-slide-up">
              <div className="text-7xl mb-6">🚘</div>
              <h1 className="text-3xl font-extrabold text-dispatch-success mb-3">Driver Found!</h1>
              <p className="text-zinc-300 mb-8 leading-relaxed">
                Your driver successfully won the distributed lock race and is on the way.
              </p>
              
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl text-left mb-8 shadow-inner">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Assigned Driver UUID</p>
                <p className="font-mono text-dispatch-success text-sm truncate">{assignedDriverId}</p>
              </div>

              <button 
                onClick={() => { setStatus('IDLE'); setRideId(null); setAssignedDriverId(null); }}
                className="w-full border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 text-white font-bold py-4 rounded-2xl transition-colors"
              >
                Complete & Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
