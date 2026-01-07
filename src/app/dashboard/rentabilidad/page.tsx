'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  DollarSign,
  Filter,
  Fuel,
  LineChart as LineChartIcon,
  Search,
  Wrench,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart
} from 'recharts';
import type { Servicio } from '@/app/dashboard/servicios/page';
import type { Vehiculo } from '@/app/dashboard/vehiculos/page';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, getMonth, getYear, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { RentabilidadForms } from '@/components/dashboard/rentabilidad/rentabilidad-forms';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

export type Transaccion = {
  id: string;
  tipo: 'Ingreso' | 'Gasto';
  fecha: string;
  descripcion: string;
  categoria: 'Servicio' | 'Combustible' | 'Mantenimiento' | 'Peajes' | 'Otros';
  valor: number;
  vehiculoId?: string;
  vehiculoPlaca?: string;
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const StatCard = ({ title, value, change, changeType, icon: Icon, iconBgColor }: { title: string; value: string; change?: string; changeType?: 'positive' | 'negative' | 'neutral'; icon: React.ElementType, iconBgColor: string }) => (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-primary ${iconBgColor}`}>
            <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {change && <p className={cn("text-xs", changeType === 'positive' ? 'text-green-600' : 'text-red-600')}>{change}</p>}
      </CardContent>
    </Card>
);

const COLORS = ['#FF8042', '#00C49F', '#0088FE', '#FFBB28'];

export default function RentabilidadPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    try {
      const storedServicios = localStorage.getItem('servicios');
      if (storedServicios) setServicios(JSON.parse(storedServicios));
      
      const storedVehiculos = localStorage.getItem('vehiculos');
      if (storedVehiculos) setVehiculos(JSON.parse(storedVehiculos));
      
      const storedTransacciones = localStorage.getItem('transacciones');
      if (storedTransacciones) {
        setTransacciones(JSON.parse(storedTransacciones));
      }

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      toast({ variant: "destructive", title: "Error al cargar datos" });
    }
  }, [toast]);
  
  const handleSaveTransaccion = (transaccion: Omit<Transaccion, 'id'>) => {
     try {
        const newTransaccion = { ...transaccion, id: new Date().toISOString() };
        const updatedTransacciones = [...transacciones, newTransaccion];
        localStorage.setItem('transacciones', JSON.stringify(updatedTransacciones));
        setTransacciones(updatedTransacciones);
        toast({ title: "¡Éxito!", description: `${transaccion.tipo} registrado correctamente.` });
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast({ variant: "destructive", title: "Error al registrar" });
    }
  };
  
  const { ingresosBrutos, gastosTotales, utilidadNeta, distribucionGastos, rentabilidadMensual } = useMemo(() => {
    const ingresos = servicios.reduce((sum, s) => sum + (s.valorServicio || 0), 0);
    const gastos = transacciones
        .filter(t => t.tipo === 'Gasto')
        .reduce((sum, t) => sum + t.valor, 0);

    const distribucion: { [key: string]: number } = {
        'Combustible': 0, 'Mantenimiento': 0, 'Peajes': 0, 'Otros': 0
    };
    transacciones.filter(t => t.tipo === 'Gasto').forEach(g => {
        if(distribucion[g.categoria] !== undefined) {
            distribucion[g.categoria] += g.valor;
        }
    });
    
    const pieData = Object.entries(distribucion)
        .filter(([, valor]) => valor > 0)
        .map(([name, value]) => ({ name, value }));

    const rentabilidadData = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
            month: format(date, 'MMM', { locale: es }),
            ganancia: 0,
        }
    });

    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
    
    servicios.forEach(s => {
        const serviceDate = new Date(s.fecha);
        if(serviceDate >= sixMonthsAgo) {
            const monthIndex = (getMonth(serviceDate) - getMonth(sixMonthsAgo) + 12) % 12;
            if(monthIndex >= 0 && monthIndex < 6) {
                rentabilidadData[monthIndex].ganancia += (s.valorServicio || 0) - (s.costoOperacion || 0);
            }
        }
    });

    return { 
        ingresosBrutos: ingresos, 
        gastosTotales: gastos, 
        utilidadNeta: ingresos - gastos,
        distribucionGastos: pieData,
        rentabilidadMensual: rentabilidadData
    };

  }, [servicios, transacciones]);
  
  const filteredTransacciones = useMemo(() => {
    return transacciones.filter(t => {
        const searchLower = searchTerm.toLowerCase();
        return (
            t.descripcion.toLowerCase().includes(searchLower) ||
            t.categoria.toLowerCase().includes(searchLower) ||
            (t.vehiculoPlaca && t.vehiculoPlaca.toLowerCase().includes(searchLower))
        )
    }).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [transacciones, searchTerm]);

  const paginatedTransacciones = filteredTransacciones.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredTransacciones.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Inicio / Rentabilidad</p>
        <h1 className="font-headline text-3xl font-bold">Gestión de P&G</h1>
        <p className="text-muted-foreground">
          Administración financiera de la flota y rentabilidad.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Ingresos Brutos" value={currencyFormatter.format(ingresosBrutos)} change="+12% vs mes ant." changeType="positive" icon={DollarSign} iconBgColor="bg-green-100" />
        <StatCard title="Gastos Totales" value={currencyFormatter.format(gastosTotales)} change="+5% vs mes ant." changeType="negative" icon={LineChartIcon} iconBgColor="bg-red-100" />
        <StatCard title="Utilidad Neta" value={currencyFormatter.format(utilidadNeta)} change="+8% vs mes ant." changeType="positive" icon={CreditCard} iconBgColor="bg-orange-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <RentabilidadForms vehiculos={vehiculos} onSave={handleSaveTransaccion} />
        </div>
        <div className="lg:col-span-3 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Distribución de Gastos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                   <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                        <Pie data={distribucionGastos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                            {distribucionGastos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                         <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-foreground">
                            {currencyFormatter.format(gastosTotales).slice(0,-4)}M
                        </text>
                        <text x="50%" y="50%" dy={18} textAnchor="middle" className="text-sm fill-muted-foreground">
                            Total
                        </text>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 text-xs">
                        {distribucionGastos.map((entry, index) => (
                             <div key={`legend-${index}`} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Rentabilidad (Últ. 6 meses)</span>
                        <span className="text-sm font-medium text-green-600">+8.4% Promedio</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={rentabilidadMensual} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize: 12}} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${currencyFormatter.format(value).slice(0,-4)}M`} tick={{fontSize: 12}}/>
                            <Tooltip formatter={(value: number) => currencyFormatter.format(value)} cursor={{fill: 'hsl(var(--muted))'}} />
                            <Bar dataKey="ganancia" radius={[4, 4, 0, 0]}>
                               {rentabilidadMensual.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.ganancia >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Histórico de Transacciones</CardTitle>
           <div className="flex justify-between items-center pt-2">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtrar</Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransacciones.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.fecha), 'dd MMM yyyy', {locale: es})}</TableCell>
                  <TableCell>
                    {t.tipo === 'Ingreso' ? 
                        <Badge variant="outline" className="text-green-600 border-green-200"><ArrowDown className="mr-1 h-3 w-3" />Ingreso</Badge> : 
                        <Badge variant="outline" className="text-red-600 border-red-200"><ArrowUp className="mr-1 h-3 w-3" />Gasto</Badge>}
                  </TableCell>
                  <TableCell>{t.vehiculoPlaca || 'N/A'}</TableCell>
                  <TableCell>
                     <Badge variant="secondary">{t.categoria}</Badge>
                  </TableCell>
                  <TableCell>{t.descripcion}</TableCell>
                  <TableCell className={cn("text-right font-semibold", t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600')}>
                      {t.tipo === 'Ingreso' ? '+' : '-'}{currencyFormatter.format(t.valor)}
                  </TableCell>
                </TableRow>
              ))}
               {paginatedTransacciones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No se encontraron transacciones.</TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
         <div className="flex items-center justify-between gap-4 p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredTransacciones.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransacciones.length)}</strong> de <strong>{filteredTransacciones.length}</strong> transacciones
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}>Siguiente</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
