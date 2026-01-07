'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Edit,
  Eye,
  MoreHorizontal,
  PlusCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Servicio } from '@/app/dashboard/servicios/page';
import { format, parseISO, startOfDay, endOfDay, isBefore, isAfter, startOfWeek, endOfWeek, subWeeks, startOfMonth, getMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/jj-ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FacturacionForm, type FacturacionFormValues } from '@/components/dashboard/facturacion/facturacion-form';
import { CuentaCobro } from '@/components/dashboard/facturacion/cuenta-cobro';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { AbonoForm, AbonoFormValues } from '@/components/dashboard/facturacion/abono-form';
import { FacturacionMensual, type MonthlyBilling } from '@/components/dashboard/facturacion/facturacion-mensual';

const StatCard = ({ title, value, change, changeType, icon: Icon, iconBgColor }: { title: string; value: string; change?: string; changeType?: 'positive' | 'negative'; icon: React.ElementType, iconBgColor: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-primary ${iconBgColor}`}>
            <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            <span className={cn(
                changeType === 'positive' && 'text-green-600',
                changeType === 'negative' && 'text-red-600'
            )}>
              {change}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
);

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function FacturacionPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [isInicioOpen, setIsInicioOpen] = useState(false);
  const [isFinOpen, setIsFinOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAbonoFormOpen, setIsAbonoFormOpen] = useState(false);
  const [isFacturaOpen, setIsFacturaOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [isFacturacionMesOpen, setIsFacturacionMesOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    try {
      const storedServicios = localStorage.getItem('servicios');
      if (storedServicios) {
        setServicios(JSON.parse(storedServicios).map((s:Servicio) => ({...s, fecha: parseISO(s.fecha)})));
      }
    } catch (error) {
      console.error("Failed to load services from localStorage", error);
      toast({
          variant: "destructive",
          title: "Error al cargar datos",
          description: "No se pudieron cargar los datos de los servicios.",
      });
    }
  }, [toast]);
  
  const handleSave = (data: FacturacionFormValues) => {
    if (!selectedServicio) return;

    const updatedServicios = servicios.map(s => {
      if (s.id === selectedServicio.id) {
        const valorServicio = data.valorServicio || 0;
        const anticipo = data.estadoPago === 'Anticipo' ? (data.anticipo || 0) : 0;
        
        let updatedService: Servicio = {
          ...s,
          ...data,
          saldo: valorServicio - anticipo,
        };

        if (data.metodoPago !== 'Transferencia') {
            delete updatedService.numeroComprobante;
            delete updatedService.banco;
        }

        return updatedService;
      }
      return s;
    });

    localStorage.setItem('servicios', JSON.stringify(updatedServicios));
    setServicios(updatedServicios);

    toast({
      title: '¡Servicio Actualizado!',
      description: `La información financiera del servicio ${selectedServicio.consecutivo} ha sido actualizada.`,
    });

    setIsFormOpen(false);
    setSelectedServicio(null);
  };
  
    const handleSaveAbono = (data: AbonoFormValues) => {
    if (!selectedServicio) return;
    
    const updatedServicios = servicios.map(s => {
      if (s.id === selectedServicio.id) {
        const valorAbono = data.valorAbono || 0;
        const anticipoAnterior = s.anticipo || 0;
        const nuevoAnticipo = anticipoAnterior + valorAbono;
        const valorServicio = s.valorServicio || 0;
        const nuevoSaldo = valorServicio - nuevoAnticipo;

        let updatedService: Servicio = {
          ...s,
          anticipo: nuevoAnticipo,
          saldo: nuevoSaldo,
          estadoPago: nuevoSaldo <= 0 ? 'Pagado' : data.nuevoEstadoPago,
          metodoPago: data.metodoPago,
          numeroComprobante: data.metodoPago === 'Transferencia' ? data.numeroComprobante : s.numeroComprobante,
          banco: data.metodoPago === 'Transferencia' ? data.banco : s.banco,
        };

        return updatedService;
      }
      return s;
    });

    localStorage.setItem('servicios', JSON.stringify(updatedServicios));
    setServicios(updatedServicios);

    toast({
      title: '¡Abono Registrado!',
      description: `Se ha registrado un abono de ${currencyFormatter.format(data.valorAbono || 0)} al servicio ${selectedServicio.consecutivo}.`,
    });

    setIsAbonoFormOpen(false);
    setSelectedServicio(null);
  }

  const handleOpenResumen = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setIsResumenOpen(true);
  }

  const handleOpenFactura = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setIsFacturaOpen(true);
  }
  
  const handleOpenAbono = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setIsAbonoFormOpen(true);
  }

  const handleOpenEditar = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setIsFormOpen(true);
  }


  const filteredServicios = useMemo(() => {
    return servicios
      .filter(s => {
        const searchLower = searchTerm.toLowerCase();
        return (
          s.cliente.toLowerCase().includes(searchLower) ||
          s.consecutivo.toLowerCase().includes(searchLower) ||
          s.origen.toLowerCase().includes(searchLower) ||
          s.destino.toLowerCase().includes(searchLower)
        );
      })
      .filter(s => {
        if (!s.fecha) return true;
        try {
            const fechaServicio = new Date(s.fecha);
            if (fechaInicio && isBefore(fechaServicio, startOfDay(fechaInicio))) return false;
            if (fechaFin && isAfter(fechaServicio, endOfDay(fechaFin))) return false;
            return true;
        } catch (e){
             console.error("Error parsing service date:", s.fecha, e);
            return true;
        }
      });
  }, [servicios, searchTerm, fechaInicio, fechaFin]);
  
  const paginatedServicios = filteredServicios.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredServicios.length / ITEMS_PER_PAGE);
  
  const { facturacionTotal, gananciaNeta, carteraPendiente, facturasPendientes } = useMemo(() => {
    return servicios.reduce((acc, s) => {
        const venta = s.valorServicio || 0;
        const costo = s.costoOperacion || 0;
        
        acc.facturacionTotal += venta;
        
        if(s.estadoPago === 'Pagado') {
            acc.gananciaNeta += (venta - costo);
        }

        if(s.estadoPago === 'Pendiente' || s.estadoPago === 'Anticipo') {
            const saldo = s.saldo ?? (venta - (s.anticipo ?? 0));
            acc.carteraPendiente += saldo;
            if(s.estadoPago === 'Pendiente') acc.facturasPendientes += 1;
        }
        
        return acc;
    }, { facturacionTotal: 0, gananciaNeta: 0, carteraPendiente: 0, facturasPendientes: 0});
  }, [servicios]);

  const getEstadoBadge = (estado: Servicio['estadoPago']) => {
    switch (estado) {
      case 'Pagado':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pagado</Badge>;
      case 'Pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendiente</Badge>;
      case 'Anticipo':
          return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Anticipo</Badge>;
      case 'Anulado':
        return <Badge variant="destructive">Anulado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };
  
  const { monthlyRecordData, annualRecordData, facturacionMensualData } = useMemo(() => {
    const now = new Date();
    
    // Monthly data (last 4 weeks)
    const monthlyData = [0, 1, 2, 3].map(weekIndex => {
      const weekStart = startOfWeek(subWeeks(now, weekIndex), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, weekIndex), { weekStartsOn: 1 });
      const total = servicios
        .filter(s => {
          const serviceDate = new Date(s.fecha);
          return isAfter(serviceDate, weekStart) && isBefore(serviceDate, weekEnd);
        })
        .reduce((sum, s) => sum + (s.valorServicio || 0), 0);
      return { name: `Sem ${4 - weekIndex}`, total };
    }).reverse();

    // Annual data
    const annualData = Array.from({ length: 12 }, (_, i) => ({
      month: format(startOfMonth(new Date(now.getFullYear(), i)), 'MMM', { locale: es }),
      ventas: 0,
      costos: 0,
    }));

     const monthlyBillingMap = new Map<string, MonthlyBilling>();

    servicios.forEach(s => {
      const serviceDate = new Date(s.fecha);
      if (getYear(serviceDate) === getYear(now)) {
        const monthIndex = getMonth(serviceDate);
        annualData[monthIndex].ventas += s.valorServicio || 0;
        annualData[monthIndex].costos += s.costoOperacion || 0;
      }
      
      const monthKey = format(serviceDate, 'yyyy-MM');
      if (!monthlyBillingMap.has(monthKey)) {
        monthlyBillingMap.set(monthKey, {
            mes: format(serviceDate, 'MMMM yyyy', { locale: es }),
            totalFacturado: 0,
            totalCostos: 0,
            ganancia: 0,
            numServicios: 0,
        });
      }

      const monthBilling = monthlyBillingMap.get(monthKey)!;
      const venta = s.valorServicio || 0;
      const costo = s.costoOperacion || 0;
      
      monthBilling.totalFacturado += venta;
      monthBilling.totalCostos += costo;
      monthBilling.ganancia += (venta - costo);
      monthBilling.numServicios += 1;
    });

    return { monthlyRecordData: monthlyData, annualRecordData: annualData, facturacionMensualData: Array.from(monthlyBillingMap.values()) };
  }, [servicios]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Inicio / Facturación</p>
        <h1 className="font-headline text-3xl font-bold">Facturación y Cartera</h1>
        <p className="text-muted-foreground">
          Gestión financiera, control de pagos y estado de cuenta.
        </p>
      </header>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <StatCard 
            title="FACTURACIÓN TOTAL" 
            value={currencyFormatter.format(facturacionTotal)}
            change="+12% vs mes anterior"
            changeType="positive"
            icon={DollarSign}
            iconBgColor="bg-blue-100"
         />
          <StatCard 
            title="GANANCIA NETA" 
            value={currencyFormatter.format(gananciaNeta)}
            change="+5% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            iconBgColor="bg-green-100"
         />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CARTERA PENDIENTE</CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-primary bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{currencyFormatter.format(carteraPendiente)}</div>
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-red-600">{facturasPendientes} Facturas pendientes</span>
                </p>
            </CardContent>
          </Card>
      </div>

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Récord Mensual ({format(new Date(), 'MMMM', {locale: es})})</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px] w-full">
              <BarChart data={monthlyRecordData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis hide={true}/>
                <Tooltip content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(value as number)} />} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Récord Anual ({getYear(new Date())})</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[200px] w-full">
              <LineChart data={annualRecordData} margin={{ top: 20, right: 40, bottom: 20, left: 0 }}>
                 <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => currencyFormatter.format(val).slice(0,-4) + 'M'} />
                <Tooltip content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(value as number)} />} />
                <Line type="monotone" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }}/>
                <Line type="monotone" dataKey="costos" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="3 3"/>
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
       <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setSelectedServicio(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Datos Financieros</DialogTitle>
          </DialogHeader>
          {selectedServicio && (
            <FacturacionForm
              servicio={selectedServicio}
              onSave={handleSave}
              onCancel={() => { setIsFormOpen(false); setSelectedServicio(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
      
       <Dialog open={isAbonoFormOpen} onOpenChange={(isOpen) => { setIsAbonoFormOpen(isOpen); if (!isOpen) setSelectedServicio(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>Abona un pago al saldo pendiente del servicio {selectedServicio?.consecutivo}.</DialogDescription>
          </DialogHeader>
          {selectedServicio && (
            <AbonoForm
              servicio={selectedServicio}
              onSave={handleSaveAbono}
              onCancel={() => { setIsAbonoFormOpen(false); setSelectedServicio(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFacturaOpen} onOpenChange={(isOpen) => { setIsFacturaOpen(isOpen); if (!isOpen) setSelectedServicio(null); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Cuenta de Cobro</DialogTitle>
            <DialogDescription>
              Visualización de la cuenta de cobro para el servicio {selectedServicio?.consecutivo}.
            </DialogDescription>
          </DialogHeader>
            {selectedServicio && (
              <CuentaCobro servicio={selectedServicio} />
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isResumenOpen} onOpenChange={(isOpen) => { setIsResumenOpen(isOpen); if (!isOpen) setSelectedServicio(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resumen del Servicio</DialogTitle>
            <DialogDescription>
              Resumen financiero detallado para el servicio {selectedServicio?.consecutivo}.
            </DialogDescription>
          </DialogHeader>
            {selectedServicio && (
              <ResumenServicio servicio={selectedServicio} />
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFacturacionMesOpen} onOpenChange={setIsFacturacionMesOpen}>
        <DialogContent className="sm:max-w-3xl">
          <FacturacionMensual data={facturacionMensualData} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 flex-1">
                    <Popover open={isInicioOpen} onOpenChange={setIsInicioOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal md:w-[180px]", !fechaInicio && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fechaInicio ? format(fechaInicio, 'dd MMM yyyy') : <span>Fecha Inicio</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}>
                            <Calendar mode="single" selected={fechaInicio} onSelect={(date) => { setFechaInicio(date); setIsInicioOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Popover open={isFinOpen} onOpenChange={setIsFinOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal md:w-[180px]", !fechaFin && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fechaFin ? format(fechaFin, 'dd MMM yyyy') : <span>Fecha Fin</span>}
                            </Button>
                        </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}>
                            <Calendar mode="single" selected={fechaFin} onSelect={(date) => { setFechaFin(date); setIsFinOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por cliente, ruta o ID..." className="pl-9" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
                    </div>
                </div>
                 <Button className="w-full sm:w-auto" onClick={() => setIsFacturacionMesOpen(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Facturación por Mes
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>ID Servicio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ruta / Descripción</TableHead>
                <TableHead className="text-right">Venta</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Ganancia</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedServicios.map((servicio) => (
                <TableRow key={servicio.id}>
                    <TableCell className="font-medium">{servicio.consecutivo}</TableCell>
                    <TableCell>{format(new Date(servicio.fecha), "dd MMM yyyy", { locale: es })}</TableCell>
                    <TableCell>{servicio.cliente}</TableCell>
                    <TableCell>{servicio.origen} - {servicio.destino}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(servicio.valorServicio || 0)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(servicio.costoOperacion || 0)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                        {currencyFormatter.format((servicio.valorServicio || 0) - (servicio.costoOperacion || 0))}
                    </TableCell>
                    <TableCell className="text-center">{getEstadoBadge(servicio.estadoPago)}</TableCell>
                     <TableCell className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menú</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenResumen(servicio)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver resumen
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOpenEditar(servicio)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar información
                                </DropdownMenuItem>
                                 <DropdownMenuItem onSelect={() => handleOpenFactura(servicio)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Ver cuenta de cobro
                                </DropdownMenuItem>
                                 {(servicio.saldo ?? 0) > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleOpenAbono(servicio)} className="text-blue-600 focus:text-blue-700">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Registrar Abono
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
                 {paginatedServicios.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                            No se encontraron servicios para el rango seleccionado.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
         <div className="flex flex-col items-center justify-between gap-4 p-4 border-t md:flex-row">
          <div className="text-sm text-muted-foreground">
            Mostrando <strong>{filteredServicios.length > 0 ? Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredServicios.length) : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredServicios.length)}</strong> de <strong>{filteredServicios.length}</strong> servicios
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

    