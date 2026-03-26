'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Truck,
  Briefcase,
  PieChart,
  BookText,
  LogOut,
  Users2,
  MessageSquare,
  ClipboardList,
  BarChart2,
  MapPin,
  CreditCard,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

const menuItems = [
  { href: '/dashboard', label: 'Tablero', icon: Home },
  { href: '/dashboard/servicios', label: 'Servicios', icon: Briefcase },
  { href: '/dashboard/conductores', label: 'Conductores', icon: Users },
  { href: '/dashboard/vehiculos', label: 'Vehículos', icon: Truck },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users2 },
];

const finanzasItems = [
    { href: '/dashboard/analitica', label: 'Analítica', icon: BarChart2 },
    { href: '/dashboard/rentabilidad', label: 'Rentabilidad', icon: PieChart },
    { href: '/dashboard/facturacion', label: 'Facturación', icon: BookText },
    { href: '/dashboard/pagos', label: 'Pagos', icon: CreditCard },
]

const sistemaItems = [
    { href: '/dashboard/gps', label: 'Seguimiento GPS', icon: MapPin },
    { href: '/dashboard/whatsapp-bandeja', label: 'Bandeja Nova', icon: MessageSquare },
    { href: '/dashboard/whatsapp-status', label: 'Estado WhatsApp', icon: MessageSquare },
]

export function MainNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const db = useFirestore();
  const { user } = useUser();

  const pendingCotQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'cotizaciones'), where('estado', '==', 'pendiente'));
  }, [db, user]);

  const activeGPSQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'ubicaciones_gps'), where('activo', '==', true));
  }, [db, user]);

  const pendingPaymentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'pagos_pendientes_correo'), where('pendiente', '==', true));
  }, [db, user]);

  const { data: pendingCotizaciones } = useCollection(pendingCotQuery);
  const { data: activeGPS } = useCollection(activeGPSQuery);
  const { data: pendingPayments } = useCollection(pendingPaymentsQuery);
  
  const pendingCount = pendingCotizaciones?.length || 0;
  const activeGPSCount = activeGPS?.length || 0;
  const pendingPaymentsCount = pendingPayments?.length || 0;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 text-center">
        <h2 className="font-headline text-2xl font-semibold">
          <span className="text-primary">J&J</span> Admin
        </h2>
        <p className="text-xs text-muted-foreground">Transportes Especiales</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="justify-start"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem>
            <Link href="/dashboard/cotizaciones">
              <SidebarMenuButton
                isActive={pathname === '/dashboard/cotizaciones'}
                tooltip="Cotizaciones"
                className="justify-start"
              >
                <div className="relative">
                  <ClipboardList />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white ring-2 ring-white animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span>Cotizaciones</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup>
            <SidebarGroupLabel>FINANZAS</SidebarGroupLabel>
            <SidebarMenu>
                 {finanzasItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                        <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        className="justify-start"
                        >
                        <div className="relative">
                          <item.icon />
                          {item.href === '/dashboard/pagos' && pendingPaymentsCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-white animate-pulse">
                              {pendingPaymentsCount}
                            </span>
                          )}
                        </div>
                        <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
            <SidebarGroupLabel>SISTEMA</SidebarGroupLabel>
            <SidebarMenu>
                 {sistemaItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                        <SidebarMenuButton
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        className="justify-start"
                        >
                        <div className="relative">
                          <item.icon />
                          {item.href === '/dashboard/gps' && activeGPSCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Cerrar Sesión" className="justify-start">
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
