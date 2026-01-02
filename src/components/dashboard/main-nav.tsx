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
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';

const menuItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/conductores', label: 'Conductores', icon: Users },
  { href: '/dashboard/vehiculos', label: 'Vehículos', icon: Truck },
  { href: '/dashboard/servicios', label: 'Servicios', icon: Briefcase },
  { href: '/dashboard/monitoreo', label: 'Monitoreo', icon: Monitor },
  { href: '/dashboard/rentabilidad', label: 'Rentabilidad', icon: TrendingUp },
  { href: '/dashboard/facturacion', label: 'Facturación', icon: BookText },
];

export function MainNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="font-headline text-xl font-semibold text-primary">
          J&J Connect V2.0
        </h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} tooltip="Cerrar Sesión">
              <LogOut />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
