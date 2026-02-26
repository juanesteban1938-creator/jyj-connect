
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, PlusCircle, Eye, Edit, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ServicioForm } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { enviarNotificacionServicio } from '@/lib/whatsapp';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
  conductorTelefono?: string;
  vehiculo: string;
  vehiculoPlaca?: string;
  estado: 'Programado' | 'En Servicio' | 'Finalizado' | 'Cancelado';
  valorServicio: number;
  anticipo: number;
  saldo: number;
  metodoPago: 'Efectivo' | 'Transferencia' | 'Facturacion';
  costoOperacion: number;
  estadoPago: 'Pendiente' | 'Anticipo' | 'Pagado' | 'Anulado';
  paradasAdicionales: string[];
  numeroComprobante?: string;
  banco?: string;
  notificacionSalidaEnviada: boolean;
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
  const db = useFirestore();

  useEffect(() => {
    const s = localStorage.getItem('servicios');
    const v = localStorage.getItem('vehiculos');
    const c = localStorage.getItem('conductores');
    if (s) setServicios(JSON.parse(s));
    if (v) setVehiculos(JSON.parse(v));
    if (c) setConductores(JSON.parse(c));
  }, []);

  const sanitizePhone = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, ''); 
    if (cleaned.length === 10) cleaned = '57' + cleaned;
    return cleaned;
  };

  const handleManualNotification = async (s: Servicio) => {
    const phone = sanitizePhone(s.telefonoCliente);
    const fechaStr = format(new Date(s.fecha), 'dd/MM/yyyy', { locale: es });

    try {
      await enviarNotificacionServicio({
        clienteNombre: s.cliente,
        clienteTelefono: phone,
        fecha: fechaStr,
        hora: s.hora,
        origen: s.origen,
        destino: s.destino,
        placa: s.vehiculoPlaca || 'N/A',
        conductor: s.conductor,
        telefonoConductor: s.conductorTelefono || 'N/A'
      });
      
      addDoc(collection(db, 'notificaciones_whatsapp'), {
        fecha: serverTimestamp(),
        clienteNombre: s.cliente,
        clienteTelefono: phone,
        origen: s.origen,
        destino: s.destino,
        estado: 'enviado'
      });

      toast({ title: "Nova ha enviado la notificación", description: `Se notificó a ${s.cliente} exitosamente.` });
    } catch (err: any) {
      addDoc(collection(db, 'notificaciones_whatsapp'), {
        fecha: serverTimestamp(),
        clienteNombre: s.cliente,
        clienteTelefono: phone,
        origen: s.origen,
        destino: s.destino,
        estado: 'error',
        error: err.message
      });
      toast({ variant: "destructive", title: "Error de notificación", description: "No se pudo conectar con Nova." });
    }
  };

  const handleSave = async (data: any) => {
    const isNew = !selected;
    const newId = Date.now().toString();
    const newConsecutivo = `GA-CCT-${servicios.length + 101}`;
    
    // Resolución de vehículo
    const vehiculoObj = data.esVehiculoNoRegistrado ? null : vehiculos.find(v => v.id === data.vehiculoId);
    const placaReal = vehiculoObj ? vehiculoObj.placa : (data.vehiculoOtro || 'N/A');
    const vehiculoNombre = data.esVehiculoNoRegistrado ? data.vehiculoOtro : (vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.linea}` : 'N/A');
    
    // Resolución de conductor
    const conductorObj = data.esConductorNoRegistrado ? null : conductores.find(c => c.id === data.conductorId);
    const conductorName = conductorObj ? `${conductorObj.nombres} ${conductorObj.apellidos}` : (data.conductorOtro || 'No asignado');
    const conductorPhone = conductorObj ? conductorObj.telefono : (data.conductorTelefonoOtro || 'N/A');

    // PERSISTIR CLIENTE AUTOMÁTICAMENTE
    const storedClientes = localStorage.getItem('clientes');
    const currentClientes = storedClientes ? JSON.parse(storedClientes) : [];
    const clientIndex = currentClientes.findIndex((c: any) => c.nit === data.nitCliente);
    
    if (clientIndex === -1) {
      currentClientes.push({
        id: data.nitCliente,
        razonSocial: data.nombreCliente,
        nit: data.nitCliente,
        telefono: data.telefonoCliente,
        email: data.emailCliente,
        tipo: 'Particular'
      });
    } else {
      currentClientes[clientIndex] = {
        ...currentClientes[clientIndex],
        razonSocial: data.nombreCliente,
        telefono: data.telefonoCliente,
        email: data.emailCliente
      };
    }
    localStorage.setItem('clientes', JSON.stringify(currentClientes));

    const valor = Number(data.valorServicio) || 0;
    const anticipo = Number(data.anticipo) || 0;
    const costo = Number(data.costoOperacion) || 0;
    const saldo = valor - anticipo;

    const nuevoServicioData: Servicio = { 
      ...data, 
      id: selected?.id || newId,
      consecutivo: selected?.consecutivo || newConsecutivo,
      cliente: data.nombreCliente,
      clienteIniciales: data.nombreCliente.substring(0, 2).toUpperCase(),
      origen: data.direccionRecogida,
      destino: data.direccionDestino,
      fecha: data.fechaRecogida.toISOString(),
      hora: data.horaRecogida,
      vehiculo: vehiculoNombre,
      vehiculoPlaca: placaReal,
      conductor: conductorName,
      conductorTelefono: conductorPhone,
      estado: selected?.estado || 'Programado',
      valorServicio: valor,
      anticipo: anticipo,
      costoOperacion: costo,
      saldo: saldo,
      paradasAdicionales: (data.paradasAdicionales || []).map((p: any) => p.direccion),
      notificacionSalidaEnviada: selected?.notificacionSalidaEnviada || false
    };

    let updated;
    if (selected) {
      updated = servicios.map(s => s.id === selected.id ? nuevoServicioData : s);
    } else {
      updated = [...servicios, nuevoServicioData];
    }
    
    setServicios(updated);
    localStorage.setItem('servicios', JSON.stringify(updated));
    setIsFormOpen(false);
    toast({ title: "Servicio guardado exitosamente" });

    // Sincronización con Firestore para el Bot (Cron Job)
    const pickupDateTime = new Date(data.fechaRecogida);
    const [h, m] = data.horaRecogida.split(':');
    pickupDateTime.setHours(parseInt(h), parseInt(m), 0, 0);

    addDoc(collection(db, 'servicios'), {
      ...nuevoServicioData,
      horaRecogidaTimestamp: Timestamp.fromDate(pickupDateTime),
      createdAt: serverTimestamp()
    });

    if (isNew) {
      const phone = sanitizePhone(data.telefonoCliente);
      const fechaStr = format(data.fechaRecogida, 'dd/MM/yyyy', { locale: es });

      try {
        await enviarNotificacionServicio({
          clienteNombre: data.nombreCliente,
          clienteTelefono: phone,
          fecha: fechaStr,
          hora: data.horaRecogida,
          origen: data.direccionRecogida,
          destino: data.direccionDestino,
          placa: placaReal,
          conductor: conductorName,
          telefonoConductor: conductorPhone
        });
        
        addDoc(collection(db, 'notificaciones_whatsapp'), {
          fecha: serverTimestamp(),
          clienteNombre: data.nombreCliente,
          clienteTelefono: phone,
          origen: data.direccionRecogida,
          destino: data.destino,
          estado: 'enviado'
        });

        toast({ title: "Nova ha notificado al cliente", description: "Confirmación enviada automáticamente por WhatsApp." });
      } catch (err: any) {
        addDoc(collection(db, 'notificaciones_whatsapp'), {
          fecha: serverTimestamp(),
          clienteNombre: data.nombreCliente,
          clienteTelefono: phone,
          origen: data.direccionRecogida,
          destino: data.destino,
          estado: 'error',
          error: err.message
        });
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
          <Button onClick={() => setIsFormOpen(true)} className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio</Button>
          <DialogContent className="sm:max-w-4xl">
            <VisuallyHidden><DialogHeader><DialogTitle>{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader></VisuallyHidden>
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
                  <div className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-3 w-3 text-red-500" /> {s.destino}</div>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><PlusCircle className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-green-600 font-bold" onClick={() => handleManualNotification(s)}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Notificar WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No se encontraron servicios.</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={isResumenOpen} onOpenChange={setIsResumenOpen}>
        <DialogContent className="sm:max-w-lg">
          <VisuallyHidden><DialogHeader><DialogTitle>Resumen del Servicio</DialogTitle></DialogHeader></VisuallyHidden>
          <DialogHeader><DialogTitle>Resumen del Servicio</DialogTitle></DialogHeader>
          {selected && <ResumenServicio servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
