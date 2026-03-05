'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANTE: Se ha forzado el uso de firebaseConfig para evitar desincronización con el bot de Nova
export function initializeFirebase() {
  if (!getApps().length) {
    // Forzamos la inicialización manual con el config de jj-connect-18988325-5ab9e
    // Esto evita que la app se conecte al proyecto interno de Studio por error.
    const firebaseApp = initializeApp(firebaseConfig);
    console.log('[Firebase] Inicializado manualmente con proyecto:', firebaseConfig.projectId);
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
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
