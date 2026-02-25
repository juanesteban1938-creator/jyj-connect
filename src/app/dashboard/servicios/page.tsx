
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, PlusCircle, Eye, Edit, Bus, Calendar as CalendarIcon, CheckCircle, Clock, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ServicioForm } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { enviarNotificacionServicio } from '@/lib/whatsapp';

export type Servicio = {
  id: string;
  consecutivo: string;
  hora: string;
  fecha: string;
  origen: string;
  destino: string;
  cliente: string;
  nitCliente: string;
  telefonoCliente: string;
  clienteIniciales: string;
  emailCliente?: string;
  conductor: string;
  vehiculo: string;
  estado: 'Programado' | 'En Servicio' | 'Finalizado' | 'Cancelado';
  valorServicio?: number;
  anticipo?: number;
  saldo?: number;
  metodoPago: 'Efectivo' | 'Transferencia' | 'Facturacion';
  costoOperacion?: number;
  estadoPago: 'Pendiente' | 'Anticipo' | 'Pagado' | 'Anulado';
  paradasAdicionales: string[];
};

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [selected, setSelected] = useState<Servicio | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const s = localStorage.getItem('servicios');
    const v = localStorage.getItem('vehiculos');
    const c = localStorage.getItem('conductores');
    if (s) setServicios(JSON.parse(s));
    if (v) setVehiculos(JSON.parse(v));
    if (c) setConductores(JSON.parse(c));
  }, []);

  const handleSave = async (data: any) => {
    let updated;
    let isNew = !selected;
    const newId = Date.now().toString();
    const newConsecutivo = `GA-CCT-${servicios.length + 100}`;
    
    if (selected) {
      updated = servicios.map(s => s.id === selected.id ? { ...s, ...data } : s);
    } else {
      updated = [...servicios, { 
        ...data, 
        id: newId, 
        consecutivo: newConsecutivo, 
        estado: 'Programado',
        cliente: data.nombreCliente,
        clienteIniciales: data.nombreCliente.substring(0, 2).toUpperCase(),
        origen: data.direccionRecogida,
        destino: data.direccionDestino,
        fecha: data.fechaRecogida.toISOString(),
        hora: data.horaRecogida,
        vehiculo: data.esVehiculoNoRegistrado ? data.vehiculoOtro : data.vehiculoId,
        conductor: data.esConductorNoRegistrado ? data.conductorOtro : data.conductorId,
      }];
    }
    
    setServicios(updated);
    localStorage.setItem('servicios', JSON.stringify(updated));
    setIsFormOpen(false);
    toast({ title: "Servicio guardado" });

    // Notificación avanzada por WhatsApp para nuevos servicios con Nova
    if (isNew) {
      const placa = data.esVehiculoNoRegistrado ? data.vehiculoOtro : (vehiculos.find(v => v.id === data.vehiculoId)?.placa || data.vehiculoId);
      const conductorObj = data.esConductorNoRegistrado ? null : conductores.find(c => c.id === data.conductorId);
      const conductorName = conductorObj ? `${conductorObj.nombres} ${conductorObj.apellidos}` : (data.conductorOtro || 'No asignado');
      const conductorPhone = conductorObj?.telefono || 'N/A';
      
      const valorStr = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(data.valorServicio || 0);
      const fechaStr = format(data.fechaRecogida, 'dd/MM/yyyy', { locale: es });
      
      try {
        await enviarNotificacionServicio({
          clienteNombre: data.nombreCliente,
          clienteTelefono: data.telefonoCliente,
          fecha: fechaStr,
          hora: data.horaRecogida,
          origen: data.direccionRecogida,
          destino: data.direccionDestino,
          placa: placa,
          conductor: conductorName,
          telefonoConductor: conductorPhone,
          valor: valorStr
        });
        toast({ title: "Nova ha notificado al cliente", description: "Se envió el resumen y el mensaje de confirmación." });
      } catch (err) {
        console.error("Error al notificar por WhatsApp", err);
      }
    }
    
    setSelected(null);
  };

  const filtered = servicios.filter(s => {
    const isMatch = s.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || s.conductor?.toLowerCase().includes(searchTerm.toLowerCase());
    const isTabMatch = activeTab === 'activos' ? (s.estado === 'Programado' || s.estado === 'En Servicio') : (s.estado === 'Finalizado' || s.estado === 'Cancelado');
    return isMatch && isTabMatch;
  });

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de Servicios</h1>
        <p className="page-subtitle">Administra y supervisa los traslados en tiempo real.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o conductor..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Dialog open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if(!o) setSelected(null); }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader><DialogTitle>{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader>
            <ServicioForm servicio={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} conductores={conductores} vehiculos={vehiculos} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border">
          <TabsTrigger value="activos" className="px-6">Activos / Programados</TabsTrigger>
          <TabsTrigger value="historial" className="px-6">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          {filtered.map(s => (
            <Card key={s.id} className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-0 overflow-hidden">
              <div className="grid grid-cols-12 items-center gap-4 p-6 hover:bg-muted/10 transition-colors">
                <div className="col-span-12 sm:col-span-2 text-center border-r pr-4">
                  <p className="text-xl font-bold text-primary">{s.hora}</p>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    {s.fecha ? format(new Date(s.fecha), 'dd MMM', { locale: es }) : 'N/A'}
                  </p>
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold"><div className="h-2 w-2 rounded-full bg-green-500" /> {s.origen}</div>
                  <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-3 w-3 text-red-500" /> {s.destino}</div>
                </div>
                <div className="col-span-6 sm:col-span-3 flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-primary/10"><AvatarFallback className="text-[10px] font-bold">{s.clienteIniciales}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-bold">{s.cliente}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{s.conductor}</p>
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-3 flex justify-end gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold">{s.estado}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No se encontraron servicios.</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={isResumenOpen} onOpenChange={setIsResumenOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Resumen del Servicio</DialogTitle></DialogHeader>
          {selected && <ResumenServicio servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
