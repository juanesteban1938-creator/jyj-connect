'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

/**
 * Inicialización centralizada de Firebase.
 * Proyecto activo: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  let app: FirebaseApp;
  
  // Limpieza estricta del Project ID
  const cleanProjectId = firebaseConfig.projectId.trim();

  // Logs para depuración en F12
  console.log('=== NOVA FIREBASE BOOT ===');
  console.log('Target Project:', cleanProjectId);
  console.log('Auth Domain:', firebaseConfig.authDomain);

  const cleanConfig = {
    ...firebaseConfig,
    projectId: cleanProjectId
  };

  if (!getApps().length) {
    app = initializeApp(cleanConfig);
    console.log('Firebase: Nueva instancia creada');
  } else {
    app = getApp();
    console.log('Firebase: Reutilizando instancia existente');
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  console.log('Firestore: Inicializado para', app.options.projectId);
  console.log('==========================');

  return { firebaseApp: app, auth, firestore };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
