'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: any | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const auth = getAuth();
    let unsubscribeSnapshot: (() => void) | undefined;

    // GARANTÍA: La consulta solo se ejecuta dentro del callback de estado de autenticación
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log("[useCollection] Esperando autenticación...");
        return;
      }

      console.log("[useCollection] Autenticación confirmada. Iniciando suscripción Firestore.");
      
      unsubscribeSnapshot = onSnapshot(
        memoizedTargetRefOrQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const results: ResultItemType[] = [];
          for (const doc of snapshot.docs) {
            results.push({ ...(doc.data() as T), id: doc.id });
          }
          setData(results);
          setError(null);
          setIsLoading(false);
        },
        (err: FirestoreError) => {
          const path: string =
            memoizedTargetRefOrQuery.type === 'collection'
              ? (memoizedTargetRefOrQuery as CollectionReference).path
              : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();

          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });

          setError(contextualError);
          setData(null);
          setIsLoading(false);
          errorEmitter.emit('permission-error', contextualError);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
