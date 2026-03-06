'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORRECT_EMAIL = 'transportes.especialesjyj@gmail.com';
const CORRECT_PASS = 'Kamus1938*';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // CRÍTICO: Usar el inicializador centralizado para obtener las instancias correctas
    const { auth } = initializeFirebase();
    
    // 1. Sincronizar estado local con localStorage
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      
      // 2. Asegurar sesión en Firebase si no existe
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.error("[Auth Context] Error sesión anónima:", err);
        });
      }
    }

    // 3. Listener de estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Auth Context] Firebase Auth sincronizado:", user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, pass: string) => {
    if (email === CORRECT_EMAIL && pass === CORRECT_PASS) {
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      
      const { auth } = initializeFirebase();
      signInAnonymously(auth).catch((err) => {
        console.error("[Auth Context] Error login Firebase:", err);
      });

      router.push('/dashboard');
      return true;
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
