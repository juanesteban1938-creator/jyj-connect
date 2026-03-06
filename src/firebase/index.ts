'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada para J&J Connect V2.0.
 * Forzamos el uso del proyecto de producción jj-connect--18988325-5ab9e.
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("[Nova] Producción Conectada:", firebaseConfig.projectId);
  } else {
    // Si ya existe una instancia (por ejemplo de Studio), nos aseguramos de usar la configuración correcta
    const existingApp = getApp();
    if (existingApp.options.projectId !== firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig, 'production-app');
    } else {
      app = existingApp;
    }
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  return { app, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';