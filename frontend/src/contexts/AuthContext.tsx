import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'RIDER' | 'DRIVER' | null;

interface AuthContextType {
  userId: string | null;
  role: Role;
  token: string | null;
  login: (token: string, userId: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  role: null,
  token: null,
  login: () => {},
  logout: () => {},
});

/**
 * Custom Hook: useAuth
 */
export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider
 * Now updated to store securely generated JWTs from the backend instead of mocked UUIDs.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // We use this to prevent rendering the app until localStorage is checked,
  // avoiding a flash of the login screen if the user is already authenticated.
  const [isReady, setIsReady] = useState(false);

  // Hydrate state from localStorage on initial load
  useEffect(() => {
    const storedUserId = localStorage.getItem('dispatchx_userId');
    const storedRole = localStorage.getItem('dispatchx_role') as Role;
    const storedToken = localStorage.getItem('dispatchx_token');

    if (storedUserId && storedRole && storedToken) {
      setUserId(storedUserId);
      setRole(storedRole);
      setToken(storedToken);
    }
    setIsReady(true);
  }, []);

  const login = (newToken: string, newUserId: string, newRole: Role) => {
    setToken(newToken);
    setUserId(newUserId);
    setRole(newRole);

    localStorage.setItem('dispatchx_token', newToken);
    localStorage.setItem('dispatchx_userId', newUserId);
    localStorage.setItem('dispatchx_role', newRole as string);
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    setRole(null);
    localStorage.removeItem('dispatchx_token');
    localStorage.removeItem('dispatchx_userId');
    localStorage.removeItem('dispatchx_role');
  };

  // Don't render the application tree until we've checked the storage
  if (!isReady) return null;

  return (
    <AuthContext.Provider value={{ userId, role, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


