'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Inicializa Firebase utilizando la configuración de producción confirmada.
 * Forza el uso del Project ID: jj-connect--18988325-5ab9e
 */
export function initializeFirebase() {
  const apps = getApps();
  // Buscamos si ya existe una instancia conectada a nuestro proyecto específico
  const existingApp = apps.find(app => app.options.projectId === firebaseConfig.projectId);
  
  if (existingApp) {
    return getSdks(existingApp);
  }

  // Si no existe, inicializamos una nueva instancia con nombre único para evitar conflictos con Studio
  const firebaseApp = initializeApp(firebaseConfig, 'jj-connect-production-v2');

  console.log('[Firebase] Conexión establecida con el proyecto:', firebaseConfig.projectId);
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
