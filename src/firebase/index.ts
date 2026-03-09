'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * J&J CONNECT V2.0 - Firebase Initializer
 * Proyecto: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  // LOGS DE DEPURACIÓN PARA VERIFICAR PROYECTO EN F12
  console.log('=== FIREBASE CONFIG ===');
  console.log('projectId:', firebaseConfig.projectId);
  console.log('authDomain:', firebaseConfig.authDomain);
  console.log('======================');

  const cleanConfig = {
    ...firebaseConfig,
    projectId: firebaseConfig.projectId.trim()
  };

  if (!getApps().length) {
    app = initializeApp(cleanConfig);
  } else {
    app = getApp();
  }

  const auth = getAuth(app);
  
  // LÍNEA DE INTERÉS: Se inicializa la base de datos (default)
  const firestore = getFirestore(app);

  console.log('[Firebase] SDK inicializado para:', app.options.projectId);

  return { firebaseApp: app, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
