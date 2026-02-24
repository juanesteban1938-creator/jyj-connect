'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/dashboard/main-nav';
import { Button } from '@/components/ui/button';
import { Bell, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (isAuthenticated || storedAuth === 'true') {
      setIsVerified(true);
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isVerified) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <MainNav />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white px-6 shadow-sm">
          <h1 className="text-xl font-semibold">J&J Connect V2.0</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificaciones</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full p-2 hover:bg-muted"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold">Admin Principal</p>
                    <p className="text-xs text-muted-foreground">
                      Gerente de Operaciones
                    </p>
                  </div>
                  <UserCircle className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Configuración</DropdownMenuItem>
                <DropdownMenuItem>Soporte</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Cerrar Sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-[#f4f6f8] p-4 sm:p-8 md:p-10 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
