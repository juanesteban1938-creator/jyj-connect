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
      console.log("[Auth] Intentando acceso para:", email);
      // Kamus1938* o Admin2024 (según lo configurado en la consola)
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      
      if (userCredential.user) {
        localStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
        console.log("[Auth] Acceso concedido con UID:", userCredential.user.uid);
        router.push('/dashboard');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("[Auth Context] Error de login:", err.code, err.message);
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
