'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Escuchador global de errores de permisos de Firebase.
 * Captura los errores de Firestore y los muestra como notificaciones discretas
 * en lugar de permitir que bloqueen la UI de Next.js.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Notificación silenciosa para el usuario
      toast({
        variant: "destructive",
        title: "Sincronizando permisos...",
        description: "Estamos conectando con la base de datos de producción. Si el error persiste, intente refrescar la página.",
      });
      
      // Log técnico para depuración sin interrumpir al usuario
      console.warn("[Nova Security] Acceso denegado temporalmente:", error.message);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
