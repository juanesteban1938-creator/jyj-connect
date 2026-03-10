'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { auth } = initializeFirebase();
    const storedAuth = localStorage.getItem('isAuthenticated');
    
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const { auth } = initializeFirebase();
    try {
      // Nota: El usuario solicitó explícitamente el flujo de credenciales.
      // Se usa signInWithEmailAndPassword para validar el acceso del administrador.
      await signInWithEmailAndPassword(auth, email, pass);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      router.push('/dashboard');
      return true;
    } catch (err) {
      console.error("[Auth Context] Error de login:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    const { auth } = initializeFirebase();
    signOut(auth).catch(console.error);
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
