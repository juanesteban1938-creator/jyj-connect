'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Singleton para inicializar Firebase de forma segura en el cliente.
 * Evita errores de inicialización múltiple y asegura el uso del proyecto correcto.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] App inicializada para:', firebaseConfig.projectId);
  } else {
    app = getApp();
  }

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
