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
  Users2,
  MessageSquare,
  BarChart2,
  MapPin,
  FileText,
  ShieldCheck,
  Package,
  Settings2,
  Calculator,
  Zap,
  Layers
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UsuarioPanel } from '@/lib/custodia-types';

export function MainNav() {
  const pathname = usePathname();
  const db = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return doc(db, 'usuarios_panel', user.email.replace(/\W/g, '_'));
  }, [db, user]);

  const { data: profile } = useDoc<UsuarioPanel>(userProfileRef);

  const canAccess = (moduleId: string) => {
    if (user?.email === 'transportes.especialesjyj@gmail.com') return true;
    if (!profile) return moduleId === 'tablero';
    return profile.modulos_permitidos?.includes(moduleId);
  };

  const menuItems = [
    { id: 'tablero', href: '/dashboard', label: 'Tablero', icon: Home },
    { id: 'servicios', href: '/dashboard/servicios', label: 'Servicios', icon: Briefcase },
    { id: 'conductores', href: '/dashboard/conductores', label: 'Conductores', icon: Users },
    { id: 'vehiculos', href: '/dashboard/vehiculos', label: 'Vehículos', icon: Truck },
    { id: 'reportes', href: '/dashboard/reportes', label: 'Reportes', icon: FileText },
    { id: 'clientes', href: '/dashboard/clientes', label: 'Clientes', icon: Users2 },
  ];

  const finanzasItems = [
    { id: 'analitica', href: '/dashboard/analitica', label: 'Analítica', icon: BarChart2 },
    { id: 'rentabilidad', href: '/dashboard/rentabilidad', label: 'Rentabilidad', icon: PieChart },
    { id: 'facturacion', href: '/dashboard/facturacion', label: 'Facturación', icon: BookText },
    { id: 'contabilidad', href: '/dashboard/contabilidad', label: 'Contabilidad', icon: FileText },
  ];

  const custodiaItems = [
    { id: 'custodia_envios', href: '/dashboard/custodia/envios', label: 'Envíos Blindados', icon: Package },
    { id: 'custodia_cotizador', href: '/dashboard/custodia/cotizador', label: 'Cotizador de Envío', icon: Calculator },
    { id: 'custodia_parametros', href: '/dashboard/custodia/parametros', label: 'Ajuste de Tarifas', icon: Layers },
    { id: 'custodia_config', href: '/dashboard/custodia/configuracion', label: 'Parámetros Operativos', icon: Settings2 },
  ];

  const sistemaItems = [
    { id: 'gps', href: '/dashboard/gps', label: 'Seguimiento GPS', icon: MapPin },
    { id: 'whatsapp_bandeja', href: '/dashboard/whatsapp-bandeja', label: 'Bandeja Nova', icon: MessageSquare },
    { id: 'whatsapp_status', href: '/dashboard/whatsapp-status', label: 'Estado de Nova', icon: Zap },
    { id: 'usuarios', href: '/dashboard/seguridad/usuarios', label: 'Usuarios y Accesos', icon: ShieldCheck },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 text-center">
        <h2 className="font-headline text-2xl font-semibold">
          <span className="text-primary">J&J</span> Connect
        </h2>
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Panel de Control</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>OPERACIÓN PASAJEROS</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.filter(item => canAccess(item.id)).map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {custodiaItems.some(i => canAccess(i.id)) && (
          <SidebarGroup>
            <SidebarGroupLabel>J&J CUSTODIA</SidebarGroupLabel>
            <SidebarMenu>
              {custodiaItems.filter(item => canAccess(item.id)).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>FINANZAS</SidebarGroupLabel>
          <SidebarMenu>
            {finanzasItems.filter(item => canAccess(item.id)).map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>SISTEMA Y SEGURIDAD</SidebarGroupLabel>
          <SidebarMenu>
            {sistemaItems.filter(item => canAccess(item.id)).map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
