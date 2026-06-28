import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { RoleSelection } from './components/RoleSelection';
import { RiderDashboard } from './components/RiderDashboard';
import { DriverDashboard } from './components/DriverDashboard';

/**
 * AppRouter
 * This inner component reads the Auth state and determines which View to show.
 * It is separated from the main App component so it can consume the useAuth hook.
 */
const AppRouter: React.FC = () => {
  const { role } = useAuth();

  // If the user hasn't selected a role yet, show the landing page.
  if (!role) {
    return <RoleSelection />;
  }

  // Once a role is selected, we mount the SocketProvider.
  // This is a CRITICAL architectural decision: We do NOT connect to WebSockets
  // on the landing page. We only establish the TCP connection once we know 
  // exactly who the user is. This saves immense server resources.
  return (
    <SocketProvider>
      {role === 'RIDER' ? <RiderDashboard /> : <DriverDashboard />}
    </SocketProvider>
  );
};

/**
 * Root App Component
 * Wraps the entire application in our AuthProvider.
 */
export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;










