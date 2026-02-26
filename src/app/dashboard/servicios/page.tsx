'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  PlusCircle, 
  Eye, 
  Edit, 
  MessageSquare, 
  Loader2, 
  Briefcase, 
  User, 
  Truck 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ServicioForm } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { enviarNotificacionServicio } from '@/lib/whatsapp';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';

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
  const [isSaving, setIsSaving] = useState(false);
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

  const handleManualNotification = async (s: Servicio) => {
    try {
      await enviarNotificacionServicio({
        clienteNombre: s.cliente,
        clienteTelefono: s.telefonoCliente,
        fecha: format(new Date(s.fecha), 'dd/MM/yyyy'),
        hora: s.hora,
        origen: s.origen,
        destino: s.destino,
        placa: s.vehiculoPlaca || 'N/A',
        conductor: s.conductor,
        telefonoConductor: s.conductorTelefono || 'N/A'
      });
      toast({ title: "Notificación enviada" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error de WhatsApp", description: err.message });
    }
  };

  const handleSave = async (data: any) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const isNew = !selected;
      const vehiculoObj = data.esVehiculoNoRegistrado ? null : vehiculos.find(v => v.id === data.vehiculoId);
      const placaFinal = data.esVehiculoNoRegistrado ? (data.vehiculoOtro || 'N/A') : (vehiculoObj?.placa || 'N/A');
      const conductorObj = data.esConductorNoRegistrado ? null : conductores.find(c => c.id === data.conductorId);
      
      const valor = Number(data.valorServicio) || 0;
      const anticipo = Number(data.anticipo) || 0;
      const saldo = valor - anticipo;

      // VALIDACIÓN DE FECHA Y HORA
      const pickupDate = new Date(data.fechaRecogida);
      const [h, m] = (data.horaRecogida || '00:00').split(':').map(Number);
      pickupDate.setHours(h, m, 0, 0);

      if (!isValid(pickupDate)) {
          throw new Error("La fecha u hora seleccionada no es válida.");
      }

      // LIMPIEZA DE TELÉFONO (Solo dígitos)
      const cleanPhone = data.telefonoCliente.replace(/\D/g, '');

      const payload: Servicio = { 
        id: selected?.id || Date.now().toString(),
        consecutivo: selected?.consecutivo || `GA-CCT-${servicios.length + 101}`,
        cliente: data.nombreCliente,
        clienteIniciales: data.nombreCliente.substring(0, 2).toUpperCase(),
        origen: data.direccionRecogida,
        destino: data.direccionDestino,
        telefonoCliente: cleanPhone,
        fecha: data.fechaRecogida.toISOString(),
        hora: data.horaRecogida,
        nitCliente: data.nitCliente,
        emailCliente: data.emailCliente || '',
        vehiculo: data.esVehiculoNoRegistrado ? `OTRO • ${data.vehiculoOtro}` : (vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.linea}` : 'N/A'),
        vehiculoPlaca: placaFinal,
        conductor: data.esConductorNoRegistrado ? data.conductorOtro : (conductorObj ? `${conductorObj.nombres} ${conductorObj.apellidos}` : 'No asignado'),
        conductorTelefono: data.esConductorNoRegistrado ? data.conductorTelefonoOtro : (conductorObj?.telefono || ''),
        estado: selected?.estado || 'Programado',
        valorServicio: valor,
        anticipo: anticipo,
        costoOperacion: Number(data.costoOperacion) || 0,
        saldo: saldo,
        metodoPago: data.metodoPago,
        estadoPago: data.estadoPago,
        paradasAdicionales: (data.paradasAdicionales || []).map((p: any) => p.direccion),
        notificacionSalidaEnviada: selected?.notificacionSalidaEnviada || false
      };

      // GUARDADO LOCAL
      const updatedServicios = selected ? servicios.map(s => s.id === selected.id ? payload : s) : [...servicios, payload];
      setServicios(updatedServicios);
      localStorage.setItem('servicios', JSON.stringify(updatedServicios));

      // GUARDADO EN FIRESTORE (Campos exactos solicitados)
      const firestoreData = {
        ...payload,
        estado: isNew ? "Programado" : payload.estado,
        notificacionSalidaEnviada: isNew ? false : payload.notificacionSalidaEnviada,
        horaRecogidaTimestamp: Timestamp.fromDate(pickupDate),
        updatedAt: serverTimestamp()
      };

      if (isNew) {
        await addDoc(collection(db, 'servicios'), { 
          ...firestoreData, 
          createdAt: serverTimestamp()
        });
      } else {
        await setDoc(doc(db, 'servicios', payload.id), firestoreData, { merge: true });
      }

      toast({ title: isNew ? "Servicio creado" : "Servicio actualizado" });
      setIsFormOpen(false);
      setSelected(null);
      
      if (isNew) handleManualNotification(payload);

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = servicios.filter(s => {
    const isMatch = s.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    s.conductor?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    s.vehiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <Input placeholder="Buscar por cliente, conductor o placa..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 border">
          <TabsTrigger value="activos" className="px-6 font-bold uppercase text-[10px] tracking-widest">Servicios Activos</TabsTrigger>
          <TabsTrigger value="historial" className="px-6 font-bold uppercase text-[10px] tracking-widest">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No se encontraron servicios.</Card>
          ) : filtered.map(s => (
            <Card key={s.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-primary">{s.hora}</p>
                    <span className="text-xs font-bold text-muted-foreground">|</span>
                    <p className="text-xs font-bold uppercase tracking-wider">{s.consecutivo}</p>
                  </div>
                  <p className="text-sm font-semibold">{s.origen} <span className="text-primary mx-1">➔</span> {s.destino}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                    <p className="uppercase"><Briefcase className="inline h-3 w-3 mr-1"/> {s.cliente}</p>
                    <p className="uppercase"><User className="inline h-3 w-3 mr-1"/> {s.conductor}</p>
                    <p className="uppercase font-bold text-primary"><Truck className="inline h-3 w-3 mr-1"/> {s.vehiculoPlaca}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.estado === 'Programado' ? 'secondary' : 'default'} className="text-[10px] font-bold uppercase">{s.estado}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><PlusCircle className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-green-600 font-bold" onClick={() => handleManualNotification(s)}><MessageSquare className="mr-2 h-4 w-4" /> Notificar por WhatsApp</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={o => { if(!isSaving) { setIsFormOpen(o); if(!o) setSelected(null); } }}>
        <DialogContent className="sm:max-w-4xl">
          <VisuallyHidden><DialogHeader><DialogTitle>{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader></VisuallyHidden>
          <DialogHeader><DialogTitle className="text-2xl font-bold">{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader>
          <ServicioForm servicio={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} conductores={conductores} vehiculos={vehiculos} isSaving={isSaving} />
        </DialogContent>
      </Dialog>

      <Dialog open={isResumenOpen} onOpenChange={setIsResumenOpen}>
        <DialogContent className="sm:max-w-lg">
          <VisuallyHidden><DialogHeader><DialogTitle>Resumen del Servicio</DialogTitle></DialogHeader></VisuallyHidden>
          {selected && <ResumenServicio servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
