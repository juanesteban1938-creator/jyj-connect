'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { Loader2, ShieldCheck } from 'lucide-react';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // El login ahora solo activa la sesión anónima limpia
      await login('guest', 'guest');
    } catch (err) {
      console.error('Error al entrar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">J&J Connect</CardTitle>
          <CardDescription>
            Accede al panel de control de Transportes Especiales J&J.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Se iniciará una sesión segura y anónima para gestionar la operación.
          </p>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Conectando...
              </>
            ) : (
              'Entrar al Sistema'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
