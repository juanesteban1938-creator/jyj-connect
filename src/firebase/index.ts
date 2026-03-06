'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada de Firebase para J&J Connect V2.0.
 * Forzado para el proyecto de producción: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("[Nova] Firebase Initialized for:", firebaseConfig.projectId);
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
