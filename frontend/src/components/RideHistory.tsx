import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Ride {
  id: string;
  status: string;
  created_at: string;
  pickup_lat: number;
  pickup_lon: number;
}

interface RideHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RideHistory: React.FC<RideHistoryProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [history, setHistory] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/api/rides/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors font-bold text-xl leading-none"
        >
          &times;
        </button>
        
        <h2 className="text-2xl font-black tracking-tight text-white mb-6 flex items-center gap-3">
          <span className="text-dispatch-neon">RIDE</span> HISTORY
        </h2>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-dispatch-neon border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 bg-red-400/10 p-4 rounded-xl text-sm font-mono border border-red-500/20">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-8 text-zinc-500 font-mono">
            No rides found.
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((ride) => (
              <div 
                key={ride.id} 
                className="bg-black/40 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 hover:border-dispatch-neon/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-zinc-500">
                    ID: {ride.id.split('-')[0]}...
                  </span>
                  <span className={`text-xs font-black px-2 py-1 rounded-md ${
                    ride.status === 'COMPLETED' ? 'bg-dispatch-success/20 text-dispatch-success border border-dispatch-success/30' : 
                    ride.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {ride.status}
                  </span>
                </div>
                <div className="text-sm font-mono text-zinc-300">
                  {new Date(ride.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
