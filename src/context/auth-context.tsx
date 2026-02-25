'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

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
    const auth = getAuth();
    
    // 1. Sincronizar estado local con localStorage
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
      
      // 2. Asegurar sesión en Firebase si no existe
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.error("Error al iniciar sesión anónima en Firebase:", err);
        });
      }
    }

    // 3. Listener de estado de autenticación para debugging
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase Auth sincronizado (UID):", user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, pass: string) => {
    if (email === CORRECT_EMAIL && pass === CORRECT_PASS) {
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      
      // Iniciar sesión en Firebase para habilitar Security Rules
      const auth = getAuth();
      signInAnonymously(auth).catch((err) => {
        console.error("Error al sincronizar con Firebase Auth durante login:", err);
      });

      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    
    const auth = getAuth();
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