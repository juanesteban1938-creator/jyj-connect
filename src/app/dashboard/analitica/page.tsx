'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Target, 
  Calendar,
  Loader2,
  DollarSign
} from 'lucide-react';
import { format, subMonths, isAfter, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const COLORS = {
  naranja: '#F59E0B',
  azul: '#3B82F6',
  rojo: '#EF4444',
  verde: '#10B981',
  slate: '#64748B',
};

const PIE_COLORS = [COLORS.azul, COLORS.naranja, COLORS.verde, COLORS.rojo];

export default function AnaliticaPage() {
  const [range, setRange] = useState('3');
  const db = useFirestore();
  const { user } = useUser();

  // Consultas a Firestore
  const servicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'services'), orderBy('fecha', 'asc'));
  }, [db, user]);

  const clientesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'clientes'));
  }, [db, user]);

  const cotizacionesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'cotizaciones'));
  }, [db, user]);

  const { data: servicios, isLoading: loadingServicios } = useCollection(servicesQuery);
  const { data: clientes, isLoading: loadingClientes } = useCollection(clientesQuery);
  const { data: cotizaciones, isLoading: loadingCotizaciones } = useCollection(cotizacionesQuery);

  const stats = useMemo(() => {
    if (!servicios || !clientes || !cotizaciones) return null;

    const now = new Date();
    const startDate = subMonths(now, parseInt(range));

    // Filtrar por rango
    const filteredServicios = servicios.filter(s => isAfter(parseISO(s.fecha), startDate));
    
    // 1. Ingresos por Mes
    const ingresosMap: Record<string, number> = {};
    filteredServicios.forEach(s => {
      const month = format(parseISO(s.fecha), 'MMM yyyy', { locale: es });
      ingresosMap[month] = (ingresosMap[month] || 0) + (Number(s.valorServicio) || 0);
    });
    const ingresosData = Object.entries(ingresosMap).map(([name, total]) => ({ name, total }));

    // 2. Comparativo Mes Actual vs Anterior
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    
    let currentMonthTotal = 0;
    let lastMonthTotal = 0;

    servicios.forEach(s => {
      const date = parseISO(s.fecha);
      if (isSameMonth(date, currentMonthStart)) currentMonthTotal += Number(s.valorServicio) || 0;
      if (isSameMonth(date, lastMonthStart)) lastMonthTotal += Number(s.valorServicio) || 0;
    });

    const comparativoData = [
      { name: 'Mes Anterior', total: lastMonthTotal },
      { name: 'Mes Actual', total: currentMonthTotal },
    ];

    // 3. Servicios por Estado
    const estadosMap: Record<string, number> = {};
    filteredServicios.forEach(s => {
      estadosMap[s.estado] = (estadosMap[s.estado] || 0) + 1;
    });
    const estadosData = Object.entries(estadosMap).map(([name, value]) => ({ name, value }));

    // 4. Clientes Nuevos por Mes
    const clientesMap: Record<string, number> = {};
    clientes.forEach(c => {
      if (c.updatedAt) {
        const month = format(parseISO(c.updatedAt), 'MMM yyyy', { locale: es });
        clientesMap[month] = (clientesMap[month] || 0) + 1;
      }
    });
    const clientesData = Object.entries(clientesMap).map(([name, total]) => ({ name, total })).slice(-6);

    // 5. Tasa de Conversión
    const totalCot = cotizaciones.length;
    const programadas = cotizaciones.filter(c => c.estado === 'programado').length;
    const conversionRate = totalCot > 0 ? ((programadas / totalCot) * 100).toFixed(1) : 0;

    return {
      ingresosData,
      comparativoData,
      estadosData,
      clientesData,
      conversionRate,
      totalIngresos: filteredServicios.reduce((acc, s) => acc + (Number(s.valorServicio) || 0), 0),
      countServicios: filteredServicios.length
    };
  }, [servicios, clientes, cotizaciones, range]);

  if (loadingServicios || loadingClientes || loadingCotizaciones) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Generando Analítica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container px-4 py-4 sm:px-8 sm:py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-orange-500" /> Analítica J&J
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Inteligencia de datos y rendimiento operativo.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-slate-400 ml-2" />
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-full sm:w-[180px] border-none font-bold text-xs uppercase focus:ring-0">
              <SelectValue placeholder="Rango de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último Mes</SelectItem>
              <SelectItem value="3">Últimos 3 Meses</SelectItem>
              <SelectItem value="6">Últimos 6 Meses</SelectItem>
              <SelectItem value="12">Último Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Ingresos Periodo</p>
            <h3 className="text-2xl font-black">{currencyFormatter.format(stats?.totalIngresos || 0)}</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-lg">
              <TrendingUp className="h-3 w-3" /> Rendimiento Bruto
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tasa de Conversión</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.conversionRate}%</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-lg">
              <Target className="h-3 w-3" /> Cotizaciones vs Servicios
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Volumen Servicios</p>
            <h3 className="text-2xl font-black text-slate-900">{stats?.countServicios} Ops.</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded-lg">
              <Calendar className="h-3 w-3" /> Trayectos Ejecutados
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cartera Clientes</p>
            <h3 className="text-2xl font-black text-slate-900">{clientes?.length || 0} Activos</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
              <Users className="h-3 w-3" /> Base de Datos Nova
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Chart 1: Ingresos por Mes */}
        <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4 text-orange-500" /> Ingresos por Mes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Consolidado de ventas brutas</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.ingresosData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [currencyFormatter.format(value), 'Ingreso']}
                />
                <Bar dataKey="total" fill={COLORS.naranja} radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Comparativo Mensual */}
        <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-slate-700">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Comparativo Mes a Mes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Crecimiento financiero inmediato</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.comparativoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [currencyFormatter.format(value), 'Total']}
                />
                <Line type="monotone" dataKey="total" stroke={COLORS.azul} strokeWidth={4} dot={{ r: 6, fill: COLORS.azul }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Servicios por Estado */}
        <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-slate-700">
              <BarChart2 className="h-4 w-4 text-green-500" /> Estado de la Operación
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Distribución logística</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.estadosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.estadosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Clientes Nuevos */}
        <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-slate-700">
              <Users className="h-4 w-4 text-indigo-500" /> Captación de Clientes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Crecimiento de cartera mensual</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.clientesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill={COLORS.azul} radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
