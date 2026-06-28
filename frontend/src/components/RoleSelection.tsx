import React, { useState } from 'react';
import { useAuth, Role } from '../contexts/AuthContext';

/**
 * RoleSelection (Auth Portal)
 * Upgraded from a mock 1-click selector to a production-grade 
 * JWT Authentication portal with Login and Registration flows.
 */
export const RoleSelection: React.FC = () => {
  const { login } = useAuth();
  
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('RIDER');
  
  // UX State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
      
      const payload = isLoginView 
        ? { email, password }
        : { name, email, password, role };

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Successfully authenticated! 
      // We pass the secure JWT token back into our React Context
      login(data.token, data.user.id, data.user.role);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen radar-grid flex flex-col items-center justify-center p-4 relative">
      
      {/* Premium Glassmorphism Container */}
      <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-slide-up z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight mb-2">
            Dispatch<span className="text-dispatch-neon">X</span>
          </h1>
          <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">
            {isLoginView ? 'Secure Login' : 'Create Account'}
          </p>
        </div>

        {error && (
          <div className="bg-dispatch-danger/10 border border-dispatch-danger/50 text-dispatch-danger p-4 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginView && (
            <div>
              <label className="block text-xs font-mono text-zinc-500 mb-1">FULL NAME</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dispatch-neon transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-500 mb-1">EMAIL ADDRESS</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dispatch-neon transition-colors"
              placeholder="engineer@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-500 mb-1">PASSWORD</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-dispatch-neon transition-colors"
              placeholder="••••••••"
            />
          </div>

          {!isLoginView && (
            <div>
              <label className="block text-xs font-mono text-zinc-500 mb-2 mt-4">ACCOUNT TYPE</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('RIDER')}
                  className={`py-3 rounded-xl border transition-all ${
                    role === 'RIDER' 
                      ? 'bg-dispatch-neon/20 border-dispatch-neon text-dispatch-neon' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  Rider
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DRIVER')}
                  className={`py-3 rounded-xl border transition-all ${
                    role === 'DRIVER' 
                      ? 'bg-dispatch-success/20 border-dispatch-success text-dispatch-success' 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  Driver
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-white hover:bg-zinc-200 text-black font-black py-4 rounded-xl mt-8 transition-transform transform active:scale-95 text-lg flex justify-center items-center"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              isLoginView ? 'AUTHENTICATE' : 'REGISTER'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError('');
            }}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {isLoginView ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};


