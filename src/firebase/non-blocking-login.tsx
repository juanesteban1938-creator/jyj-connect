'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

/** 
 * Inicia sesión anónima. 
 * Se ha actualizado a async/await para garantizar que el token esté listo.
 */
export async function initiateAnonymousSignIn(authInstance: Auth): Promise<void> {
  try {
    await signInAnonymously(authInstance);
  } catch (error) {
    console.error("[Firebase Auth] Error initiateAnonymousSignIn:", error);
  }
}

/** Inicia registro por email. */
export async function initiateEmailSignUp(authInstance: Auth, email: string, password: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(authInstance, email, password);
  } catch (error) {
    console.error("[Firebase Auth] Error initiateEmailSignUp:", error);
  }
}

/** Inicia sesión por email. */
export async function initiateEmailSignIn(authInstance: Auth, email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
  } catch (error) {
    console.error("[Firebase Auth] Error initiateEmailSignIn:", error);
  }
}
