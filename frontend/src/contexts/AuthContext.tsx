import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'RIDER' | 'DRIVER' | null;

interface AuthContextType {
  userId: string | null;
  role: Role;
  login: (selectedRole: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  role: null,
  login: () => {},
  logout: () => {},
});

/**
 * Custom Hook: useAuth
 * Allows components to instantly know if the user is a RIDER or DRIVER.
 */
export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider
 * For this architecture demonstration, we bypass a complex JWT/Passport setup.
 * Instead, we generate a cryptographically secure UUID on the fly and store it
 * in localStorage. This allows you to open two tabs (one Rider, one Driver) 
 * and test the real-time Redis engine seamlessly.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);

  // Hydrate state from localStorage on initial load to survive page refreshes
  useEffect(() => {
    const storedUserId = localStorage.getItem('dispatchx_userId');
    const storedRole = localStorage.getItem('dispatchx_role') as Role;

    if (storedUserId && storedRole) {
      setUserId(storedUserId);
      setRole(storedRole);
    }
  }, []);

  const login = (selectedRole: Role) => {
    // Generate a secure UUID natively in the browser (no external libraries needed)
    // In production, this ID would come from the PostgreSQL users table.
    const newUserId = crypto.randomUUID();
    
    setUserId(newUserId);
    setRole(selectedRole);

    localStorage.setItem('dispatchx_userId', newUserId);
    localStorage.setItem('dispatchx_role', selectedRole as string);
  };

  const logout = () => {
    setUserId(null);
    setRole(null);
    localStorage.removeItem('dispatchx_userId');
    localStorage.removeItem('dispatchx_role');
  };

  return (
    <AuthContext.Provider value={{ userId, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
