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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { auth } = initializeFirebase();
    
    // Verificamos si el usuario ya estaba marcado como autenticado localmente
    const storedAuth = localStorage.getItem('isAuthenticated');
    
    const initSession = async () => {
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        try {
          // CRÍTICO: Limpiar sesión anterior para purgar proveedores 'custom'
          await signOut(auth);
          await signInAnonymously(auth);
          console.log("[Auth Context] Sesión purgada y renovada como anónima.");
        } catch (err) {
          console.error("[Auth Context] Error al purgar sesión:", err);
        }
      }
    };

    initSession();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("[Auth Context] Usuario activo (UID):", user.uid, "Provider:", user.providerData[0]?.providerId || 'anonymous');
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const { auth } = initializeFirebase();
    try {
      // Forzamos limpieza absoluta
      await signOut(auth);
      // Iniciamos sesión anónima (único método permitido para evitar errores de Firestore)
      await signInAnonymously(auth);
      
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      console.log("[Auth Context] Acceso concedido mediante sesión anónima pura.");
      
      router.push('/dashboard');
      return true;
    } catch (err) {
      console.error("[Auth Context] Fallo al iniciar sesión anónima:", err);
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
