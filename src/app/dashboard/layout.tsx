'use client';

import { useAuth } from '@/context/auth-context';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { MainNav } from '@/components/dashboard/main-nav';
import { Button } from '@/components/ui/button';
import { Bell, UserCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';
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
  const { user, isUserLoading: isFirebaseLoading } = useUser();
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  // Sincronización del estado de autenticación local con la ruta
  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (isAuthenticated || storedAuth === 'true') {
      setIsVerified(true);
    } else if (!isFirebaseLoading) {
      router.replace('/login');
    }
  }, [isAuthenticated, router, isFirebaseLoading]);

  // Pantalla de carga mientras se verifica la sesión
  if (!isVerified || isFirebaseLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f6f8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sincronizando Nova</p>
            <p className="text-[10px] text-muted-foreground mt-1">Conectando con el proyecto de producción...</p>
          </div>
        </div>
      </div>
    );
  }

  // Obtener nombre amigable para mostrar
  const adminName = user?.email ? user.email.split('@')[0].toUpperCase() : 'Admin';

  return (
    <SidebarProvider>
      <MainNav />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white px-4 sm:px-6 shadow-sm">
          <div className="flex items-center">
            <SidebarTrigger className="mr-3 md:hidden text-slate-500" />
            <div className="flex flex-col">
                <h1 className="text-sm sm:text-lg font-bold text-gray-800 leading-none">J&J Connect V2.0</h1>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary mt-1">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Bell className="h-5 w-5 text-slate-500" />
              <span className="sr-only">Notificaciones</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full p-1 sm:p-2 hover:bg-muted"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold truncate max-w-[120px]">{adminName}</p>
                    <p className="text-[9px] text-muted-foreground leading-none font-bold uppercase">
                      Sesión Activa
                    </p>
                  </div>
                  <UserCircle className="h-8 w-8 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gestión de Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs font-bold text-slate-600 py-3">
                  <Lock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  {user?.email || 'Admin User'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => router.push('/dashboard/seguridad')}
                  className="text-xs font-black uppercase tracking-tight py-3 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 mr-2 text-orange-500" />
                  Seguridad de Acceso
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 font-bold py-3 cursor-pointer">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-background px-4 py-4 sm:px-8 sm:py-8 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
