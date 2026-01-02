'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Truck,
  Briefcase,
  Monitor,
  TrendingUp,
  BookText,
  LogOut,
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

const menuItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/conductores', label: 'Conductores', icon: Users },
  { href: '/dashboard/vehiculos', label: 'Vehículos', icon: Truck },
  { href: '/dashboard/servicios', label: 'Servicios', icon: Briefcase },
  { href: '/dashboard/monitoreo', label: 'Monitoreo', icon: Monitor },
];

const finanzasItems = [
    { href: '/dashboard/rentabilidad', label: 'Rentabilidad', icon: TrendingUp },
    { href: '/dashboard/facturacion', label: 'Facturación y Cartera', icon: BookText },
]

export function MainNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 text-center">
        <h2 className="font-headline text-2xl font-semibold">
          <span className="text-primary">J&J</span> Connect
        </h2>
        <p className="text-xs text-muted-foreground">TRANSPORTES ESPECIALES</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
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
        <SidebarGroup>
            <SidebarGroupLabel>FINANZAS</SidebarGroupLabel>
            <SidebarMenu>
                 {finanzasItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref legacyBehavior>
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
