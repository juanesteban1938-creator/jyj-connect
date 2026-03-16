'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Truck,
  Briefcase,
  Monitor,
  PieChart,
  BookText,
  LogOut,
  Users2,
  MessageSquare,
  ClipboardList,
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
  SidebarMenuBadge,
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
    { href: '/dashboard/rentabilidad', label: 'Rentabilidad', icon: PieChart },
    { href: '/dashboard/facturacion', label: 'Facturación', icon: BookText },
]

const sistemaItems = [
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

  const { data: pendingCotizaciones } = useCollection(pendingCotQuery);
  const pendingCount = pendingCotizaciones?.length || 0;

  return (
    <Sidebar>
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
                <ClipboardList />
                <span>Cotizaciones</span>
              </SidebarMenuButton>
            </Link>
            {pendingCount > 0 && (
              <SidebarMenuBadge className="bg-orange-500 text-white font-black text-[10px]">
                {pendingCount}
              </SidebarMenuBadge>
            )}
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
                        <item.icon />
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
                        <item.icon />
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
