'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORRECT_EMAIL = 'transportes.especialesjyj@gmail.com';
const CORRECT_PASS = 'Kamus1938*';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { auth } = initializeFirebase();
    
    // Sincronizar estado local con localStorage
    const storedAuth = localStorage.getItem('isAuthenticated');
    
    const initSession = async () => {
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        try {
          // CRÍTICO: Limpiar sesión anterior potencialmente corrupta y forzar una nueva
          await signOut(auth);
          await signInAnonymously(auth);
          console.log("[Auth Context] Sesión anónima renovada automáticamente.");
        } catch (err) {
          console.error("[Auth Context] Error al renovar sesión:", err);
        }
      }
    };

    initSession();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Auth Context] Firebase Auth ACTIVO (UID):", user.uid);
      } else {
        console.log("[Auth Context] Firebase Auth INACTIVO.");
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    if (email === CORRECT_EMAIL && pass === CORRECT_PASS) {
      const { auth } = initializeFirebase();
      try {
        // CRÍTICO: Forzar limpieza y nuevo login para evitar tokens 'custom'
        await signOut(auth);
        await signInAnonymously(auth);
        
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        console.log("[Auth Context] Login exitoso y sesión anónima iniciada.");
        
        router.push('/dashboard');
        return true;
      } catch (err) {
        console.error("[Auth Context] Fallo crítico en el proceso de login:", err);
        return false;
      }
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    
    const { auth } = initializeFirebase();
    auth.signOut().catch(console.error);

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
