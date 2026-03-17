'use client';

import {
  Briefcase,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, orderBy } from 'firebase/firestore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  differenceInDays,
  isBefore
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const StatCard = ({
  title,
  value,
  icon: Icon,
  gradient,
  shadowColor,
}: {
  title: string;
  value: string;
  icon: any;
  gradient: string;
  shadowColor: string;
}) => (
  <Card className={cn("border-none shadow-lg transition-all hover:scale-[1.02] overflow-hidden", shadowColor)}>
    <div className={cn("p-5 sm:p-6 h-full flex flex-col justify-between text-white", gradient)}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase opacity-80 tracking-widest">{title}</span>
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{value}</p>
      </div>
    </div>
  </Card>
);

const currencyFormatter = new Intl.NumberFormat('es-CO', { 
  style: 'currency', 
  currency: 'COP', 
  minimumFractionDigits: 0 
});

export default function DashboardHomePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
    setCurrentDate(new Date());
  }, []);

  // Consultas sincronizadas con la nube
  const servicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'services'), orderBy('fecha', 'desc'), limit(20));
  }, [db, user]);

  const conductoresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'conductores'));
  }, [db, user]);

  const vehiculosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'vehiculos'));
  }, [db, user]);

  const { data: serviciosRaw, isLoading: isServicesLoading } = useCollection(servicesQuery);
  const { data: conductoresRaw } = useCollection(conductoresQuery);
  const { data: vehiculosRaw } = useCollection(vehiculosQuery);

  const servicios = serviciosRaw || [];
  const conductores = conductoresRaw || [];
  const vehiculos = vehiculosRaw || [];

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

  // Lógica de Calendario
  const monthDays = useMemo(() => {
    if (!currentDate) return [];
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Alertas de Documentos
  const alerts = useMemo(() => {
    const allAlerts: any[] = [];
    const now = new Date();
    
    vehiculos.forEach(v => {
      const docs = [
        { name: 'SOAT', date: v.vencimientoSoat },
        { name: 'Tecnomecánica', date: v.vencimientoTecnomecanica },
        { name: 'Tarjeta Op.', date: v.vencimientoTarjetaOperacion },
        { name: 'RCC', date: v.vencimientoRcc },
        { name: 'RCE', date: v.vencimientoRce },
      ];

      docs.forEach(d => {
        if (d.date) {
          const expDate = new Date(d.date);
          const diff = differenceInDays(expDate, now);
          let status: 'critico' | 'advertencia' | 'vigente' = 'vigente';
          
          if (isBefore(expDate, now) || diff <= 30) status = 'critico';
          else if (diff <= 60) status = 'advertencia';
          
          if (status !== 'vigente') {
            allAlerts.push({
              placa: v.placa,
              docName: d.name,
              daysLeft: diff,
              date: expDate,
              status
            });
          }
        }
      });
    });

    return allAlerts.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
  }, [vehiculos]);

  if (!currentDate) return null; // Prevenir hidratación mismatch

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <div className="space-y-6 sm:space-y-8">
        {/* Header con Saludo */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
              {greeting}, Admin 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <Link href="/dashboard/servicios" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-orange-200/50 shadow-lg h-11 sm:h-12 px-8">
              <Plus className="mr-2 h-5 w-5" /> Programar Servicio
            </Button>
          </Link>
        </header>

        {/* Grid de Stats */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Flota Activa"
            value={`${stats.vehiculos} Vehículos`}
            icon={Briefcase}
            gradient="bg-gradient-to-br from-blue-600 to-blue-400"
            shadowColor="shadow-blue-100"
          />
          <StatCard
            title="Talento Humano"
            value={`${stats.conductores} Conductores`}
            icon={Users}
            gradient="bg-gradient-to-br from-indigo-600 to-indigo-400"
            shadowColor="shadow-indigo-100"
          />
          <StatCard
            title="Cartera Pendiente"
            value={stats.cartera}
            icon={AlertTriangle}
            gradient="bg-gradient-to-br from-rose-600 to-rose-400"
            shadowColor="shadow-rose-100"
          />
          <StatCard
            title="Ventas Totales"
            value={stats.venta}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-emerald-600 to-emerald-400"
            shadowColor="shadow-emerald-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Calendario y Próximos Servicios */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="border-b bg-gray-50/50 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-tight">Agenda Operativa</CardTitle>
                  </div>
                  <Badge variant="outline" className="hidden sm:flex font-bold border-orange-200 text-orange-600 bg-orange-50">
                    {format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Grid de días */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <span key={`${d}-${i}`} className="text-[10px] font-black text-gray-400 mb-2">{d}</span>
                      ))}
                      {monthDays.map(day => {
                        const dayServices = servicios.filter(s => isSameDay(new Date(s.fecha), day));
                        const isProgrammed = dayServices.some(s => s.estado === 'Programado');
                        const isFinished = dayServices.every(s => s.estado === 'Finalizado') && dayServices.length > 0;
                        
                        return (
                          <div
                            key={day.toString()}
                            className={cn(
                              "aspect-square flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-lg relative cursor-default transition-colors",
                              isToday(day) ? "bg-black text-white" : "text-gray-600",
                              isProgrammed && !isToday(day) && "bg-orange-100 text-orange-700",
                              isFinished && !isToday(day) && "bg-gray-100 text-gray-400"
                            )}
                          >
                            {format(day, 'd')}
                            {isProgrammed && (
                              <span className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Programado</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Finalizado</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de próximos */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Próximos Traslados</h4>
                    <div className="space-y-3">
                      {isServicesLoading ? (
                        <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
                      ) : servicios.filter(s => s.estado === 'Programado').slice(0, 5).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-orange-50 flex flex-col items-center justify-center text-orange-600">
                              <span className="text-[8px] sm:text-[10px] font-black leading-none">{format(new Date(s.fecha), 'MMM', { locale: es }).toUpperCase()}</span>
                              <span className="text-xs sm:text-sm font-bold">{format(new Date(s.fecha), 'dd')}</span>
                            </div>
                            <div className="max-w-[100px] sm:max-w-[180px]">
                              <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{s.cliente}</p>
                              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase">
                                <Clock className="h-3 w-3" /> {s.hora}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="hidden sm:flex text-[8px] sm:text-[9px] font-black uppercase border-orange-200 text-orange-600 bg-orange-50">
                            {s.consecutivo}
                          </Badge>
                        </div>
                      ))}
                      {servicios.filter(s => s.estado === 'Programado').length === 0 && (
                        <p className="text-[10px] text-gray-400 italic text-center py-4 uppercase">Sin servicios pendientes</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas de Documentos */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm bg-white h-full">
              <CardHeader className="border-b bg-gray-50/50 p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-tight">Alertas de Documentos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {alerts.length > 0 ? alerts.map((alert, i) => (
                    <div 
                      key={`${alert.placa}-${alert.docName}-${i}`} 
                      className={cn(
                        "p-3 sm:p-4 rounded-2xl flex items-center justify-between border transition-all",
                        alert.status === 'critico' ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-amber-50 border-amber-100 text-amber-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl",
                          alert.status === 'critico' ? "bg-rose-200/50" : "bg-amber-200/50"
                        )}>
                          {alert.status === 'critico' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase opacity-60 leading-none mb-1">{alert.docName}</p>
                          <p className="text-xs sm:text-sm font-bold">{alert.placa}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black">
                          {alert.daysLeft < 0 ? 'VENCIDO' : `Faltan ${alert.daysLeft} d`}
                        </p>
                        <p className="text-[8px] sm:text-[10px] font-bold opacity-60">
                          {format(alert.date, 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-40">
                      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      <p className="text-xs font-bold uppercase tracking-widest">Documentación al día</p>
                    </div>
                  )}
                  {vehiculos.length > 0 && (
                    <Link href="/dashboard/vehiculos" className="block">
                      <Button variant="ghost" className="w-full text-[9px] font-black uppercase text-gray-400 hover:text-orange-500 hover:bg-orange-50 mt-4 h-9">
                        Gestionar Documentos <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sección de Acceso Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Link href="/dashboard/conductores">
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer bg-white overflow-hidden">
              <div className="p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-xs sm:text-sm uppercase tracking-tight">Plantilla</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Conductores y personal</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/vehiculos">
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer bg-white overflow-hidden">
              <div className="p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-50 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-xs sm:text-sm uppercase tracking-tight">Flota J&J</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Estado de vehículos</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/facturacion">
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer bg-white overflow-hidden">
              <div className="p-5 sm:p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-emerald-50 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-xs sm:text-sm uppercase tracking-tight">Finanzas</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Facturación y cobros</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
