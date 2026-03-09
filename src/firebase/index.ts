'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada para asegurar que todo el SDK apunte al mismo proyecto.
 * Proyecto activo: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  // LOGS TEMPORALES PARA DEPURACIÓN SOLICITADOS POR EL USUARIO
  console.log('=== FIREBASE CONFIG ===');
  console.log('projectId:', firebaseConfig.projectId);
  console.log('authDomain:', firebaseConfig.authDomain);
  console.log('======================');

  // Limpieza de espacios en el projectId para evitar errores de red
  const cleanConfig = {
    ...firebaseConfig,
    projectId: firebaseConfig.projectId.trim()
  };

  // Evitar inicializaciones múltiples en el cliente (Next.js)
  if (!getApps().length) {
    app = initializeApp(cleanConfig);
  } else {
    app = getApp();
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  return { firebaseApp: app, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
