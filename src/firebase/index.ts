'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Inicializa Firebase utilizando la configuración de producción.
 * Asegura que el Proyecto ID sea jj-connect--18988325-5ab9e (con doble guion).
 */
export function initializeFirebase() {
  // Verificamos si ya existe una app inicializada con el ID correcto
  const existingApp = getApps().find(app => app.options.projectId === firebaseConfig.projectId);
  
  if (existingApp) {
    return getSdks(existingApp);
  }

  // Si no hay apps o la existente no es la correcta, inicializamos
  // Si ya hay una app [DEFAULT] pero no es la nuestra, inicializamos con nombre para evitar colisiones en Studio
  const firebaseApp = getApps().length === 0 
    ? initializeApp(firebaseConfig) 
    : initializeApp(firebaseConfig, 'jj-connect-prod');

  console.log('[Firebase] Sistema inicializado exitosamente:', firebaseConfig.projectId);
  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Exportación de hooks y utilidades del sistema Firebase
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
