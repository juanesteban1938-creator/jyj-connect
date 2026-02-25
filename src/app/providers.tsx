'use client';

import { AuthProvider } from '@/context/auth-context';
import { FirebaseClientProvider } from '@/firebase';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
