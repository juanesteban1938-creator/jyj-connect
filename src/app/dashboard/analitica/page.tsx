'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Target, 
  Loader2,
  DollarSign,
  ArrowUpRight,
  Briefcase
} from 'lucide-react';
import { format, subMonths, isAfter, parseISO, startOfMonth, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const PIE_COLORS = [COLORS.verde, COLORS.naranja, COLORS.rojo, COLORS.azul];

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

    // 2. Area Chart Data
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
      { name: 'Hace 2 Meses', total: lastMonthTotal * 0.8 },
      { name: 'Mes Anterior', total: lastMonthTotal },
      { name: 'Mes Actual', total: currentMonthTotal },
    ];

    const diff = currentMonthTotal - lastMonthTotal;
    const variation = lastMonthTotal > 0 ? ((diff / lastMonthTotal) * 100).toFixed(1) : '0';

    // 3. Servicios por Estado
    const estadosMap: Record<string, number> = {
      'Finalizado': 0,
      'Programado': 0,
      'Cancelado': 0,
      'En Servicio': 0
    };
    filteredServicios.forEach(s => {
      if (estadosMap[s.estado] !== undefined) {
        estadosMap[s.estado] = (estadosMap[s.estado] || 0) + 1;
      }
    });
    const estadosData = Object.entries(estadosMap).map(([name, value]) => ({ name, value }));

    // 4. Clientes Nuevos
    const clientesMap: Record<string, number> = {};
    clientes.forEach(c => {
      const date = c.updatedAt ? parseISO(c.updatedAt) : now;
      const month = format(date, 'MMM', { locale: es });
      clientesMap[month] = (clientesMap[month] || 0) + 1;
    });
    const clientesData = Object.entries(clientesMap).map(([name, total]) => ({ name, total })).slice(-6);

    return {
      ingresosData,
      comparativoData,
      estadosData,
      clientesData,
      conversionRate: cotizaciones.length > 0 ? ((cotizaciones.filter(c => c.estado === 'programado').length / cotizaciones.length) * 100).toFixed(1) : 0,
      variation,
      isPositive: diff >= 0,
      totalIngresos: filteredServicios.reduce((acc, s) => acc + (Number(s.valorServicio) || 0), 0),
      countServicios: filteredServicios.length
    };
  }, [servicios, clientes, cotizaciones, range]);

  if (loadingServicios || loadingClientes || loadingCotizaciones) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-orange-500 animate-spin" />
            <BarChart2 className="h-6 w-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Cargando Inteligencia J&J</p>
        </div>
      </div>
    );
  }

  const KPICard = ({ title, value, icon: Icon, variation, isPositive }: any) => (
    <Card className="border-none shadow-sm overflow-hidden bg-white group hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg",
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {variation}%
          </div>
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Fintech Style */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 pb-24 pt-8 px-4 sm:px-8">
        <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 bg-orange-500 rounded-full" />
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Analítica J&J</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium">Panel de control y rendimiento operativo Nova.</p>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            {[
              { val: '1', label: '1M' },
              { val: '3', label: '3M' },
              { val: '6', label: '6M' },
              { val: '12', label: '1A' }
            ].map(p => (
              <button
                key={p.val}
                onClick={() => setRange(p.val)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all",
                  range === p.val 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-16 space-y-8 pb-12">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Ingresos Totales" 
            value={currencyFormatter.format(stats?.totalIngresos || 0)} 
            icon={DollarSign}
            variation={stats?.variation}
            isPositive={stats?.isPositive}
          />
          <KPICard 
            title="Conversión" 
            value={`${stats?.conversionRate}%`} 
            icon={Target}
            variation="+2.4"
            isPositive={true}
          />
          <KPICard 
            title="Servicios" 
            value={`${stats?.countServicios} Ops.`} 
            icon={Briefcase}
            variation={stats?.variation}
            isPositive={stats?.isPositive}
          />
          <KPICard 
            title="Cartera Clientes" 
            value={`${clientes?.length || 0} Activos`} 
            icon={Users}
            variation="+1.8"
            isPositive={true}
          />
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Ingresos (Dark) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden rounded-3xl">
            <CardHeader className="p-8 pb-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" /> Rendimiento de Ventas
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1 font-bold">Distribución mensual de ingresos brutos</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.ingresosData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#ffffff0a" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#475569"
                    dy={10}
                  />
                  <YAxis 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#475569"
                    tickFormatter={(v) => `$${v/1000000}M`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [currencyFormatter.format(value), 'Ingreso']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="url(#barGradient)" 
                    radius={[8, 8, 0, 0]} 
                    barSize={32}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Area Chart (White) */}
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
            <CardHeader className="p-8 pb-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-slate-800">
                    Curva de Crecimiento
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1 font-bold">Tendencia operativa inmediata</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                  <ArrowUpRight className="h-4 w-4" /> TRENDING
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.comparativoData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [currencyFormatter.format(value), 'Total']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#F59E0B" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 3: Estado Donut (Dark) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden rounded-3xl">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" /> Estado de Operación
              </CardTitle>
              <p className="text-xs text-orange-500 mt-1 font-bold">Distribución logística de la flota</p>
            </CardHeader>
            <CardContent className="p-8 h-[400px] relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] text-center z-10">
                <p className="text-4xl font-black text-white leading-none">{stats?.countServicios}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Servicios</p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.estadosData}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    {stats?.estadosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    iconType="circle"
                    wrapperStyle={{ 
                      paddingTop: '20px', 
                      fontSize: '10px', 
                      fontWeight: '900', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      color: '#94a3b8'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 4: Captación Clientes (White with Orange Top) */}
          <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl border-t-4 border-t-orange-500">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Captación de Clientes</CardTitle>
              <p className="text-xs text-slate-400 mt-1 font-bold">Crecimiento de la base Nova</p>
            </CardHeader>
            <CardContent className="p-8 h-[400px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.clientesData}>
                  <defs>
                    <linearGradient id="blueOrangeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                  <YAxis 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => Math.floor(v).toString()}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="url(#blueOrangeGradient)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40} 
                    animationDuration={1500}
                  />
                  {stats?.clientesData && stats.clientesData.length > 0 && (
                    <ReferenceLine 
                      y={stats.clientesData.reduce((acc, curr) => acc + curr.total, 0) / stats.clientesData.length} 
                      stroke="#F59E0B" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Promedio', position: 'right', fill: '#F59E0B', fontSize: 10, fontWeight: 'bold' }} 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}