'use client';
import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';

/** 
 * Inicia sesión anónima de forma exclusiva. 
 * Se ha eliminado cualquier otro método de autenticación para evitar tokens 'custom'.
 */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<void> {
  try {
    // Forzamos el cierre de cualquier sesión previa antes de iniciar la nueva
    await authInstance.signOut();
    await signInAnonymously(authInstance);
    console.log("[Firebase Auth] Sesión anónima iniciada correctamente.");
  } catch (error) {
    console.error("[Firebase Auth] Error initiateAnonymousSignIn:", error);
  }
}
