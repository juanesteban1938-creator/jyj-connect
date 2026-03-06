'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Inicializa Firebase de forma robusta para el cliente.
 * Utiliza la instancia por defecto para evitar errores de "Uncaught Error" en el SDK.
 */
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (!getApps().length) {
    // Inicializa la app por defecto con la configuración de producción
    firebaseApp = initializeApp(firebaseConfig);
    console.log('[Firebase] App inicializada con éxito:', firebaseConfig.projectId);
  } else {
    // Usa la app ya inicializada
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
