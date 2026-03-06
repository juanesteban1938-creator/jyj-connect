'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada de Firebase para J&J Connect V2.0.
 * Garantiza que la conexión se realice exclusivamente al proyecto jj-connect--18988325-5ab9e.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  // Verificamos si ya existe una instancia para evitar colisiones en modo desarrollo
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
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
