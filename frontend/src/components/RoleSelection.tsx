import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * RoleSelection Component
 * The landing page of the application. It provides a premium, glassmorphism UI
 * for the user to choose whether they want to test the Rider or Driver flow.
 */
export const RoleSelection: React.FC = () => {
  const { login } = useAuth();

  return (
    // We apply our custom 'radar-grid' class from index.css to the background
    <div className="min-h-screen radar-grid flex flex-col items-center justify-center p-4">
      
      {/* Premium Glassmorphism Container */}
      {/* backdrop-blur-xl creates the frosted glass effect */}
      <div className="bg-dispatch-gray/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-slide-up">
        
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            Dispatch<span className="text-dispatch-neon">X</span>
          </h1>
          <p className="text-zinc-400 text-lg">
            High-Performance Real-Time Redis Dispatch Engine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ========================================== */}
          {/* RIDER CARD */}
          {/* ========================================== */}
          <button 
            onClick={() => login('RIDER')}
            className="group relative flex flex-col items-center justify-center p-8 bg-black/40 hover:bg-dispatch-neon/10 border border-zinc-800 hover:border-dispatch-neon rounded-2xl transition-all duration-300 overflow-hidden"
          >
            {/* Subtle background glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-dispatch-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">👤</div>
            <h2 className="text-2xl font-bold mb-2">I am a Rider</h2>
            <p className="text-zinc-500 text-sm text-center">
              Request rides and watch the Redis GEO engine find drivers in real-time.
            </p>
          </button>

          {/* ========================================== */}
          {/* DRIVER CARD */}
          {/* ========================================== */}
          <button 
            onClick={() => login('DRIVER')}
            className="group relative flex flex-col items-center justify-center p-8 bg-black/40 hover:bg-dispatch-success/10 border border-zinc-800 hover:border-dispatch-success rounded-2xl transition-all duration-300 overflow-hidden"
          >
            {/* Subtle background glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-dispatch-success/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">🚘</div>
            <h2 className="text-2xl font-bold mb-2">I am a Driver</h2>
            <p className="text-zinc-500 text-sm text-center">
              Broadcast GPS data and compete for rides via Distributed Locks.
            </p>
          </button>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-zinc-600 font-medium tracking-wide">
            💡 TIP: Open this app in two separate browser windows side-by-side to test both roles simultaneously.
          </p>
        </div>
        
      </div>
    </div>
  );
};
