import React from 'react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  fare: string | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, fare }) => {
  if (!isOpen || !fare) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border-2 border-dispatch-neon/50 rounded-3xl p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,255,255,0.15)] relative">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-dispatch-success/20 rounded-full flex items-center justify-center mb-4 border border-dispatch-success/50">
            <span className="text-3xl">✅</span>
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            RIDE <span className="text-dispatch-success">COMPLETED</span>
          </h2>
          
          <p className="text-zinc-400 font-mono text-sm mb-8">
            Your driver has dropped you off.
          </p>
          
          <div className="bg-black/50 border border-zinc-800 w-full rounded-2xl p-6 mb-8">
            <div className="text-sm font-mono text-zinc-500 mb-2">TOTAL FARE</div>
            <div className="text-5xl font-black text-white">
              <span className="text-dispatch-neon mr-1">$</span>{fare}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl transition-transform transform active:scale-95 text-lg"
          >
            PAY & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
