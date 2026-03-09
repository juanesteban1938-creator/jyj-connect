'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada y limpia de Firebase.
 * Proyecto: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  const cleanConfig = {
    ...firebaseConfig,
    projectId: 'jj-connect--18988325-5ab9e'.trim()
  };

  if (!getApps().length) {
    app = initializeApp(cleanConfig);
    console.log('[Firebase] Inicialización exitosa:', app.options.projectId);
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
