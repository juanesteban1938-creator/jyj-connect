'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  MoreHorizontal,
  PlusCircle,
  Eye,
  Edit,
  Bus,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Circle,
  MapPin,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO, endOfDay, startOfDay, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/jj-ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ServicioForm, type ServicioFormValues } from '@/components/dashboard/servicios/servicio-form';
import type { Conductor } from '@/app/dashboard/conductores/page';
import type { Vehiculo } from '@/app/dashboard/vehiculos/page';

type ServicioEstado = 'Programado' | 'En Servicio' | 'Finalizado' | 'Cancelado';
type MetodoPago = 'Efectivo' | 'Transferencia' | 'Facturacion';
type EstadoPago = 'Pendiente' | 'Anticipo' | 'Pagado' | 'Anulado';


export type Servicio = {
  id: string;
  consecutivo: string;
  hora: string;
  fecha: string;
  origen: string;
  destino: string;
  cliente: string;
  clienteIniciales: string;
  emailCliente?: string;
  conductor: string;
  vehiculo: string;
  estado: ServicioEstado;
  valorServicio?: number;
  anticipo?: number;
  saldo?: number;
  metodoPago: MetodoPago;
  costoOperacion?: number;
  estadoPago: EstadoPago;
  paradasAdicionales: string[];
};

const StatCard = ({ title, value, icon, iconBgColor }: { title: string; value: string; icon: React.ReactNode; iconBgColor: string; }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-primary ${iconBgColor}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
);

const OrigenIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7.5" fill="white" stroke="#22C55E"/>
        <circle cx="8" cy="8" r="4" fill="#22C55E"/>
    </svg>
);

const DestinoIcon = () => (
     <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.99992 14.6667C9.23724 13.0933 12.6666 9.42668 12.6666 6.00001C12.6666 3.42468 10.5753 1.33334 7.99992 1.33334C5.42459 1.33334 3.33325 3.42468 3.33325 6.00001C3.33325 9.42668 6.76259 13.0933 7.99992 14.6667Z" fill="#F43F5E"/>
    </svg>
);


export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [activeTab, setActiveTab] = useState('activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date | undefined>();
  const [fechaFin, setFechaFin] = useState<Date | undefined>();
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [consecutiveId, setConsecutiveId] = useState(101);
  const { toast } = useToast();
  const ITEMS_PER_PAGE = 5;
  const [isInicioOpen, setIsInicioOpen] = useState(false);
  const [isFinOpen, setIsFinOpen] = useState(false);


  useEffect(() => {
    try {
        const storedServicios = localStorage.getItem('servicios');
        const initialServicios: Servicio[] = storedServicios ? JSON.parse(storedServicios) : [
          {
            id: '1',
            consecutivo: 'GA-CCT-100',
            hora: '14:30',
            fecha: '2024-10-12',
            origen: 'Aeropuerto AGP (T3)',
            destino: 'Hotel Miramar Palace',
            cliente: 'TechConf 2023',
            clienteIniciales: 'TC',
            emailCliente: 'test@test.com',
            conductor: 'Carlos M.',
            vehiculo: 'Mercedes V-Class • 2390 KLP',
            estado: 'En Servicio',
            metodoPago: 'Facturacion',
            costoOperacion: 50000,
            estadoPago: 'Pendiente',
            paradasAdicionales: [],
          },
          {
            id: '2',
            consecutivo: 'GA-CCT-101',
            hora: '10:00',
            fecha: format(new Date(), 'yyyy-MM-dd'),
            origen: 'Oficina Central',
            destino: 'Centro de Convenciones',
            cliente: 'Global Corp',
            clienteIniciales: 'GC',
            emailCliente: 'test2@test.com',
            conductor: 'Luisa P.',
            vehiculo: 'Sprinter • ABC-456',
            estado: 'Programado',
            metodoPago: 'Facturacion',
            costoOperacion: 45000,
            estadoPago: 'Pendiente',
            paradasAdicionales: [],
          },
           {
            id: '3',
            consecutivo: 'GA-CCT-102',
            hora: '09:00',
            fecha: '2024-07-28',
            origen: 'Punto A',
            destino: 'Punto B',
            cliente: 'Cliente de Prueba 1',
            clienteIniciales: 'CP',
            emailCliente: 'test3@test.com',
            conductor: 'Conductor de Prueba',
            vehiculo: 'XYZ-789',
            estado: 'Finalizado',
            metodoPago: 'Efectivo',
            costoOperacion: 30000,
            estadoPago: 'Pagado',
            paradasAdicionales: [],
          },
          {
            id: '4',
            consecutivo: 'GA-CCT-103',
            hora: '15:00',
            fecha: '2024-07-29',
            origen: 'Punto C',
            destino: 'Punto D',
            cliente: 'Cliente de Prueba 2',
            clienteIniciales: 'C2',
            emailCliente: 'test4@test.com',
            conductor: 'Otro Conductor',
            vehiculo: 'DEF-456',
            estado: 'Finalizado',
            metodoPago: 'Transferencia',
            costoOperacion: 60000,
            estadoPago: 'Pagado',
            paradasAdicionales: [],
          },
        ];

        if (!storedServicios) {
          localStorage.setItem('servicios', JSON.stringify(initialServicios));
        }
        setServicios(initialServicios);
    } catch(e) {
        console.error(e);
    }
    
    const storedConsecutive = localStorage.getItem('servicioConsecutivo');
    if(storedConsecutive) {
      setConsecutiveId(parseInt(storedConsecutive, 10));
    }

    try {
        const storedConductores = localStorage.getItem('conductores');
        if (storedConductores) {
          setConductores(JSON.parse(storedConductores));
        }
    } catch (e) {
        console.error(e);
    }

    try {
        const storedVehiculos = localStorage.getItem('vehiculos');
        if (storedVehiculos) {
          setVehiculos(JSON.parse(storedVehiculos));
        }
    } catch (e) {
        console.error(e)
    }

  }, []);

  const handleSaveServicio = (data: ServicioFormValues) => {
    try {
        const conductorName = data.esConductorNoRegistrado
          ? data.conductorOtro
          : conductores.find(c => c.id === data.conductorId)?.nombres;
        
        const vehiculoPlaca = data.esVehiculoNoRegistrado
          ? data.vehiculoOtro
          : vehiculos.find(v => v.id === data.vehiculoId)?.placa;

        const nuevoServicio: Servicio = {
            id: new Date().toISOString(),
            consecutivo: `GA-CCT-${consecutiveId}`,
            fecha: format(data.fechaRecogida, 'yyyy-MM-dd'),
            hora: data.horaRecogida || "00:00",
            cliente: data.nombreCliente,
            clienteIniciales: data.nombreCliente.substring(0,2).toUpperCase(),
            emailCliente: data.emailCliente,
            origen: data.direccionRecogida,
            destino: data.direccionDestino,
            conductor: conductorName || 'No asignado',
            vehiculo: vehiculoPlaca || 'No asignado',
            estado: 'Programado',
            valorServicio: data.valorServicio,
            anticipo: data.estadoPago === 'Anticipo' ? data.anticipo : 0,
            saldo: (data.valorServicio || 0) - (data.estadoPago === 'Anticipo' ? (data.anticipo || 0) : 0),
            metodoPago: data.metodoPago,
            costoOperacion: data.costoOperacion,
            estadoPago: data.estadoPago,
            paradasAdicionales: data.paradasAdicionales.map(p => p.direccion).filter(Boolean),
        };

        const updatedServicios = [...servicios, nuevoServicio];
        localStorage.setItem('servicios', JSON.stringify(updatedServicios));
        setServicios(updatedServicios);

        const nextId = consecutiveId + 1;
        setConsecutiveId(nextId);
        localStorage.setItem('servicioConsecutivo', nextId.toString());

        toast({
            title: '¡Servicio Creado!',
            description: `El servicio ${nuevoServicio.consecutivo} para ${nuevoServicio.cliente} ha sido programado.`,
        });
        setIsFormOpen(false);
    } catch (error) {
        console.error("Error saving service:", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: "Ocurrió un problema al intentar guardar el servicio.",
        });
    }
  };

  const filteredServicios = servicios
    .filter(s => {
        const tabCondition = activeTab === 'activos' 
            ? s.estado === 'Programado' || s.estado === 'En Servicio' 
            : s.estado === 'Finalizado' || s.estado === 'Cancelado';
        return tabCondition;
    })
    .filter(s => {
        const searchLower = searchTerm.toLowerCase();
        return (
            s.cliente.toLowerCase().includes(searchLower) ||
            s.conductor.toLowerCase().includes(searchLower) ||
            s.origen.toLowerCase().includes(searchLower) ||
            s.destino.toLowerCase().includes(searchLower)
        );
    })
    .filter(s => {
        if(estadoFiltro === 'todos') return true;
        return s.estado === estadoFiltro;
    })
     .filter(s => {
        if (!s.fecha) return true;
        try {
            const fechaServicio = new Date(s.fecha);
            if (fechaInicio && isBefore(fechaServicio, startOfDay(fechaInicio))) return false;
            if (fechaFin && isAfter(fechaServicio, endOfDay(fechaFin))) return false;
            return true;
        } catch (e) {
            console.error("Error parsing service date:", s.fecha, e);
            return true;
        }
    });

  const totalPages = Math.ceil(filteredServicios.length / ITEMS_PER_PAGE);
  const paginatedServicios = filteredServicios.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getEstadoBadge = (estado: ServicioEstado) => {
    switch (estado) {
      case 'En Servicio':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="mr-1 h-3 w-3"/>{estado}</Badge>;
      case 'Programado':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200"><CalendarIcon className="mr-1 h-3 w-3"/>{estado}</Badge>;
      case 'Finalizado':
        return <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle className="mr-1 h-3 w-3"/>{estado}</Badge>;
      case 'Cancelado':
        return <Badge variant="destructive">{estado}</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };
  
  const formatDateHeader = (dateString: string) => {
    try {
        const date = parseISO(dateString);
        const today = startOfDay(new Date());
        const tomorrow = startOfDay(new Date());
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let relativeDay;
        if (startOfDay(date).getTime() === today.getTime()) {
        relativeDay = 'Hoy';
        } else if (startOfDay(date).getTime() === tomorrow.getTime()) {
        relativeDay = 'Mañana';
        } else {
        relativeDay = format(date, 'E', { locale: es });
        }

        return `${relativeDay}, ${format(date, 'dd MMM', {locale: es})}`;
    } catch (error) {
        return "Fecha inválida"
    }
  }
  
  const serviciosEnServicio = servicios.filter(s => s.estado === 'En Servicio').length;
  const serviciosProgramadosHoy = servicios.filter(s => s.estado === 'Programado' && s.fecha === format(new Date(), 'yyyy-MM-dd')).length;
  const serviciosFinalizados = servicios.filter(s => s.estado === 'Finalizado').length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
      <p className="text-muted-foreground">
        Administra y supervisa los traslados en tiempo real.
      </p>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
         <div className="grid gap-4 sm:grid-cols-3 flex-1">
            <StatCard title="En Servicio" value={serviciosEnServicio.toString()} icon={<Bus className="h-5 w-5"/>} iconBgColor="bg-yellow-100" />
            <StatCard title="Programados Hoy" value={serviciosProgramadosHoy.toString()} icon={<CalendarIcon className="h-5 w-5"/>} iconBgColor="bg-blue-100" />
            <StatCard title="Finalizados" value={serviciosFinalizados.toString()} icon={<CheckCircle className="h-5 w-5"/>} iconBgColor="bg-green-100" />
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Servicio
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Programar Nuevo Servicio <Badge variant="outline" className="ml-2">{`GA-CCT-${consecutiveId}`}</Badge></DialogTitle>
                    <CardDescription>Diligencie la información para crear una orden de servicio.</CardDescription>
                </DialogHeader>
                <ServicioForm onSave={handleSaveServicio} onCancel={() => setIsFormOpen(false)} conductores={conductores} vehiculos={vehiculos} />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList>
              <TabsTrigger value="activos">Servicios Activos / Programados</TabsTrigger>
              <TabsTrigger value="historial">Historial de Servicios</TabsTrigger>
            </TabsList>
            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por cliente, conductor o ruta..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Popover open={isInicioOpen} onOpenChange={setIsInicioOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal md:w-[150px]", !fechaInicio && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fechaInicio ? format(fechaInicio, 'dd MMM yyyy') : <span>Fecha Inicio</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}>
                          <Calendar mode="single" selected={fechaInicio} onSelect={(date) => { setFechaInicio(date); setIsInicioOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Popover open={isFinOpen} onOpenChange={setIsFinOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal md:w-[150px]", !fechaFin && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fechaFin ? format(fechaFin, 'dd MMM yyyy') : <span>Fecha Fin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" onInteractOutside={(e) => e.preventDefault()}>
                          <Calendar mode="single" selected={fechaFin} onSelect={(date) => { setFechaFin(date); setIsFinOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                     <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los Estados</SelectItem>
                            {activeTab === 'activos' && <SelectItem value="Programado">Programado</SelectItem>}
                            {activeTab === 'activos' && <SelectItem value="En Servicio">En Servicio</SelectItem>}
                            {activeTab === 'historial' && <SelectItem value="Finalizado">Finalizado</SelectItem>}
                            {activeTab === 'historial' && <SelectItem value="Cancelado">Cancelado</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <TabsContent value={activeTab}>
            <CardContent className="space-y-4">
                {paginatedServicios.map(servicio => (
                    <div key={servicio.id} className="grid grid-cols-12 items-center gap-4 rounded-lg border p-4 hover:bg-muted/50">
                        <div className="col-span-12 sm:col-span-2 md:col-span-1 text-center sm:text-left">
                            <p className="text-lg font-bold">{servicio.hora}</p>
                            <p className="text-xs text-muted-foreground">{formatDateHeader(servicio.fecha)}</p>
                        </div>

                        <div className="col-span-12 sm:col-span-4 md:col-span-3">
                            <div className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                    <OrigenIcon />
                                    <div className="w-px h-6 bg-border my-1"></div>
                                    <DestinoIcon />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="font-medium">{servicio.origen}</p>
                                    <p className="font-medium">{servicio.destino}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-6 sm:col-span-3 md:col-span-2 flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{servicio.clienteIniciales}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm">{servicio.cliente}</p>
                        </div>
                        
                        <div className="col-span-6 sm:col-span-3 md:col-span-3">
                             <p className="font-medium text-sm">{servicio.conductor}</p>
                             <p className="text-xs text-muted-foreground">{servicio.vehiculo}</p>
                        </div>

                        <div className="col-span-6 sm:col-span-3 md:col-span-2">
                            {getEstadoBadge(servicio.estado)}
                        </div>

                        <div className="col-span-6 sm:col-span-1 flex justify-end gap-1">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4"/></Button>
                        </div>
                    </div>
                ))}
                {paginatedServicios.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">No se encontraron servicios.</div>
                )}
            </CardContent>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col items-center justify-between gap-4 p-4 border-t md:flex-row">
            <div className="text-sm text-muted-foreground">
                Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredServicios.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredServicios.length)} de {filteredServicios.length} servicios.
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages}>Siguiente</Button>
            </div>
        </div>
      </Card>
    </div>
  );
}
