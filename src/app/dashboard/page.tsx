'use client';

import {
  Briefcase,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';

const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  iconColor,
  bgColor,
}: {
  title: string;
  value: string;
  icon: any;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconColor: string;
  bgColor: string;
}) => (
  <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{title}</span>
        <div className={`p-2 rounded-full ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <p className="text-xs flex items-center gap-1">
            <span className={changeType === 'positive' ? 'text-green-600 font-bold' : changeType === 'negative' ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
              {change}
            </span>
            <span className="text-muted-foreground">crecimiento</span>
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function DashboardHomePage() {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const db = useFirestore();
  const { user } = useUser();

  // Query optimizada: Solo se activa si hay base de datos y usuario autenticado
  const servicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'services'), orderBy('fecha', 'desc'), limit(5));
  }, [db, user]);

  const { data: serviciosRaw, isLoading: isServicesLoading, error } = useCollection(servicesQuery);
  const servicios = serviciosRaw || [];

  useEffect(() => {
    const v = localStorage.getItem('vehiculos');
    const c = localStorage.getItem('conductores');
    if (v) setVehiculos(JSON.parse(v));
    if (c) setConductores(JSON.parse(c));
  }, []);

  const stats = useMemo(() => {
    const totalVenta = servicios.reduce((acc, s) => acc + (Number(s.valorServicio) || 0), 0);
    const totalCartera = servicios.reduce((acc, s) => {
        const valor = Number(s.valorServicio) || 0;
        const anticipo = Number(s.anticipo) || 0;
        const saldo = (s.saldo !== undefined && s.saldo !== null) ? Number(s.saldo) : (valor - anticipo);
        if (s.estadoPago === 'Pendiente' || s.estadoPago === 'Anticipo') return acc + saldo;
        return acc;
    }, 0);

    return {
      venta: currencyFormatter.format(totalVenta),
      cartera: currencyFormatter.format(totalCartera),
      vehiculos: vehiculos.length,
      conductores: conductores.length,
    };
  }, [servicios, vehiculos, conductores]);

  return (
    <div className="page-container">
      <header className="mb-8">
        <h1 className="page-title">Panel de Control</h1>
        <p className="page-subtitle">Gestión centralizada de Transportes Especiales J&J.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-[11px] font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            CONECTANDO CON LA NUBE... SI EL ERROR PERSISTE, REFRESCAR PÁGINA (F5).
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total de Vehículos"
          value={stats.vehiculos.toString()}
          icon={Briefcase}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Conductores Activos"
          value={stats.conductores.toString()}
          icon={Users}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Cartera Pendiente"
          value={stats.cartera}
          icon={AlertTriangle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          title="Ingresos Registrados"
          value={stats.venta}
          icon={TrendingUp}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none relative overflow-hidden bg-primary/5">
           <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="z-10 text-center md:text-left">
                <h3 className="text-2xl font-bold text-gray-800">Operaciones J&J</h3>
                <p className="mt-2 max-w-md text-muted-foreground">Gestión ágil de servicios y monitoreo de flota en tiempo real.</p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                  <Link href="/dashboard/servicios"><Button className="btn-action shadow-md"><Plus className="mr-2 h-4 w-4" /> Nuevo Servicio</Button></Link>
                  <Link href="/dashboard/facturacion"><Button variant="outline" className="btn-action bg-white">Ver Facturación</Button></Link>
                </div>
              </div>
               <div className="hidden md:block text-primary/10"><Briefcase className="h-40 w-40" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardHeader className="p-6">
            <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
            <CardDescription>Sincronización en tiempo real.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {isServicesLoading ? (
              <div className="flex flex-col items-center justify-center p-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Cargando datos...</span>
              </div>
            ) : servicios.length > 0 ? servicios.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-bold text-sm">Servicio {s.consecutivo}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{s.cliente}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold uppercase">{s.estado}</Badge>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">No hay operaciones registradas en la nube.</p>
            )}
            <Link href="/dashboard/servicios" className="flex items-center justify-center text-primary text-xs font-bold hover:underline gap-1 pt-2">
                Ver todos los servicios <ChevronRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
