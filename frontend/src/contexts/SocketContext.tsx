import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// In a production app, this would be loaded from Vite's import.meta.env
const BACKEND_URL = 'http://localhost:3000';

// Define the TypeScript interface for our Context
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Create the Context with a default empty state
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

/**
 * Custom Hook: useSocket
 * Allows any component in the app to instantly access the live WebSocket connection
 * without needing to pass the socket down through props (Prop Drilling).
 */
export const useSocket = () => {
  return useContext(SocketContext);
};

/**
 * SocketProvider
 * Wraps the root of the React application. It establishes the connection
 * ONCE when the app loads, and shares it everywhere.
 */
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Establish the connection
    const socketInstance = io(BACKEND_URL, {
      // Force WebSocket transport instead of falling back to HTTP Long-Polling.
      // This is crucial for the ultra-low latency required by our Redis engine.
      transports: ['websocket'], 
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    // 2. Setup Health Listeners
    socketInstance.on('connect', () => {
      console.log('🟢 Connected to DispatchX Realtime Engine');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔴 Disconnected from Backend');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // 3. Cleanup
    // If the component unmounts (e.g., closing the tab), disconnect cleanly
    // to prevent memory leaks in the Node server.
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};


