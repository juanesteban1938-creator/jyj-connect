'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Escuchador global de errores de permisos de Firebase.
 * Mejora la UX al evitar bloqueos de la aplicación por propagación de reglas.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // En lugar de lanzar una excepción fatal, usamos un Toast para informar al usuario
      toast({
        variant: "destructive",
        title: "Aviso de Seguridad",
        description: "No se pudieron cargar los datos. Esto suele ocurrir mientras se actualizan los permisos en el servidor. Intente refrescar en unos segundos.",
      });
      
      // Mantenemos el registro técnico en consola
      console.warn("[Nova Security] Acceso denegado por reglas:", error.message);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
