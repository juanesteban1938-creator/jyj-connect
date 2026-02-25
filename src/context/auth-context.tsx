'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const correctEmail = 'transportes.especialesjyj@gmail.com';
const correctPass = 'Kamus1938*';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      // Asegurar sesión de Firebase Auth al recargar
      const auth = getAuth();
      if (!auth.currentUser) {
        signInAnonymously(auth).catch(console.error);
      }
    }
  }, []);

  const login = (email: string, pass: string) => {
    if (email === correctEmail && pass === correctPass) {
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      
      // Iniciar sesión anónima en Firebase para habilitar Security Rules
      const auth = getAuth();
      signInAnonymously(auth).catch((err) => {
        console.error("Error al sincronizar con Firebase Auth:", err);
      });

      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    
    // Opcionalmente cerrar sesión en Firebase
    const auth = getAuth();
    auth.signOut();

    router.push('/login');
  };

  const value = { isAuthenticated, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}