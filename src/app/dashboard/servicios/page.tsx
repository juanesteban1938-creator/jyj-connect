
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
  Briefcase, 
  User as UserIcon, 
  Truck,
  PlayCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Loader2,
  Send
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ServicioForm } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, updateDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { enviarNotificacionServicio } from '@/lib/whatsapp';
import type { Servicio, Conductor, Vehiculo } from '@/lib/types';

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [activeTab, setActiveTab] = useState('activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [selected, setSelected] = useState<Servicio | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    const v = localStorage.getItem('vehiculos');
    const c = localStorage.getItem('conductores');
    if (v) setVehiculos(JSON.parse(v));
    if (c) setConductores(JSON.parse(c));

    if (!user || !db) return;

    setIsLoading(true);
    const servicesCol = collection(db, 'services');
    const q = query(servicesCol);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Servicio[];
        setServicios(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        setIsLoading(false);
      },
      async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: servicesCol.path,
          operation: 'list'
        }));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  const handleEnviarWhatsApp = async (s: Servicio) => {
    toast({ title: "Nova", description: "Enviando notificación por WhatsApp..." });
    const result = await enviarNotificacionServicio({
      clienteNombre: s.clienteNombre || s.cliente,
      clienteTelefono: s.telefonoCliente,
      fecha: format(new Date(s.fecha), 'dd/MM/yyyy'),
      hora: s.hora,
      origen: s.origen,
      destino: s.destino,
      placa: s.vehiculoPlaca || s.vehiculo || 'No asignada',
      conductor: s.conductor || 'No asignado',
      telefonoConductor: s.conductorTelefono || 'No disponible'
    });

    if (result.success) {
      toast({ title: "Notificación enviada", description: "El cliente ha sido notificado por Nova." });
      const docRef = doc(db, 'services', s.id);
      await updateDoc(docRef, { notificacionEnviada: true }).catch(() => {});
    } else {
      toast({ variant: "destructive", title: "Error Nova", description: result.error || "No se pudo enviar el WhatsApp." });
    }
  };

  const handleNuevoServicio = () => {
    setSelected(null); 
    setIsFormOpen(true);
  };

  const handleUpdateEstado = async (id: string, nuevoEstado: Servicio['estado']) => {
    const docRef = doc(db, 'services', id);
    try {
      await updateDoc(docRef, { estado: nuevoEstado });
      toast({ title: `Servicio ${nuevoEstado}` });
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { estado: nuevoEstado }
      }));
      toast({ variant: "destructive", title: "Error al actualizar estado" });
    }
  };

  const handleSave = async (formData: any) => {
    setIsSaving(true);
    try {
      const esNuevo = !selected || !selected.id;
      const servicioId = esNuevo ? String(Date.now()) : selected.id;

      const conductorAsignado = conductores.find(c => c.id === formData.conductorId);
      const vehiculoAsignado = vehiculos.find(v => v.id === formData.vehiculoId);

      const payload: Servicio = {
        id: servicioId,
        consecutivo: selected?.consecutivo || `JJ-${servicios.length + 1001}`,
        cliente: formData.nombreCliente,
        clienteNombre: formData.nombreCliente,
        origen: formData.direccionRecogida,
        destino: formData.direccionDestino,
        telefonoCliente: formData.telefonoCliente,
        emailCliente: formData.emailCliente,
        fecha: formData.fechaRecogida.toISOString(),
        hora: formData.horaRecogida,
        nitCliente: formData.nitCliente,
        vehiculoPlaca: formData.esVehiculoNoRegistrado ? formData.vehiculoOtro : (vehiculoAsignado?.placa || ''),
        vehiculo: formData.esVehiculoNoRegistrado ? formData.vehiculoOtro : (vehiculoAsignado ? `${vehiculoAsignado.marca} ${vehiculoAsignado.linea}` : ''),
        conductor: formData.esConductorNoRegistrado ? formData.conductorOtro : (conductorAsignado ? `${conductorAsignado.nombres} ${conductorAsignado.apellidos}` : 'No asignado'),
        conductorTelefono: formData.esConductorNoRegistrado ? formData.conductorTelefonoOtro : (conductorAsignado?.telefono || ''),
        estado: selected?.estado || 'Programado',
        valorServicio: Number(formData.valorServicio) || 0,
        anticipo: Number(formData.anticipo) || 0,
        saldo: (Number(formData.valorServicio) || 0) - (Number(formData.anticipo) || 0),
        metodoPago: formData.metodoPago,
        estadoPago: formData.estadoPago,
        costoOperacion: Number(formData.costoOperacion) || 0,
        notificacionEnviada: selected?.notificacionEnviada || false,
        notificacionSalidaEnviada: selected?.notificacionSalidaEnviada || false,
        clienteIniciales: formData.nombreCliente.substring(0, 2).toUpperCase(),
      };

      const docRef = doc(db, 'services', servicioId);
      await setDoc(docRef, payload, { merge: true });
      
      if (esNuevo) {
        await handleEnviarWhatsApp(payload);
      }
      
      toast({ title: esNuevo ? "Servicio Programado" : "Servicio Actualizado" });
      setIsFormOpen(false);
      setSelected(null);
    } catch (e) {
      console.error("Error al guardar servicio:", e);
      toast({ variant: "destructive", title: "Error al procesar el servicio" });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = servicios.filter(s => {
    const isMatch = (s.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (s.conductor || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (s.vehiculoPlaca || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isTabMatch = activeTab === 'activos' 
      ? (s.estado === 'Programado' || s.estado === 'En Servicio') 
      : (s.estado === 'Finalizado' || s.estado === 'Cancelado');
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
          <Input 
            placeholder="Buscar servicios..." 
            className="pl-9"
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button onClick={handleNuevoServicio} className="btn-action">
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="activos" className="px-6 font-bold uppercase text-[10px]">Activos</TabsTrigger>
          <TabsTrigger value="historial" className="px-6 font-bold uppercase text-[10px]">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-bold uppercase">Sincronizando servicios...</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No se encontraron servicios registrados.
            </Card>
          ) : filtered.map(s => (
            <Card key={s.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-primary">{s.hora}</p>
                    <span className="text-xs font-bold text-muted-foreground">|</span>
                    <p className="text-xs font-bold uppercase">{s.consecutivo}</p>
                    {s.notificacionEnviada && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none ml-2 px-1 py-0 h-4 text-[9px]"><Send className="h-2 w-2 mr-1"/> Notificado</Badge>}
                  </div>
                  <p className="text-sm font-semibold">{s.origen} ➔ {s.destino}</p>
                  <div className="flex flex-wrap gap-x-4 text-[11px] text-muted-foreground font-medium uppercase">
                    <p><Briefcase className="inline h-3 w-3 mr-1"/> {s.cliente}</p>
                    <p><UserIcon className="inline h-3 w-3 mr-1"/> {s.conductor}</p>
                    <p className="text-primary font-bold"><Truck className="inline h-3 w-3 mr-1"/> {s.vehiculoPlaca}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.estado === 'Programado' ? 'secondary' : s.estado === 'En Servicio' ? 'default' : 'outline'} className="text-[10px] font-bold uppercase">{s.estado}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEnviarWhatsApp(s)}><MessageSquare className="mr-2 h-4 w-4" /> Notificar WhatsApp</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {s.estado === 'Programado' && (
                        <DropdownMenuItem onClick={() => handleUpdateEstado(s.id, 'En Servicio')} className="text-blue-600 font-bold"><PlayCircle className="mr-2 h-4 w-4" /> Iniciar</DropdownMenuItem>
                      )}
                      {(s.estado === 'Programado' || s.estado === 'En Servicio') && (
                        <DropdownMenuItem onClick={() => handleUpdateEstado(s.id, 'Finalizado')} className="text-green-600 font-bold"><CheckCircle className="mr-2 h-4 w-4" /> Finalizar</DropdownMenuItem>
                      )}
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
          <VisuallyHidden><DialogHeader><DialogTitle>Programar Servicio</DialogTitle></DialogHeader></VisuallyHidden>
          <DialogHeader><DialogTitle className="text-2xl font-bold">{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader>
          <ServicioForm 
            servicio={selected} 
            onSave={handleSave} 
            onCancel={() => setIsFormOpen(false)} 
            conductores={conductores} 
            vehiculos={vehiculos} 
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isResumenOpen} onOpenChange={o => { setIsResumenOpen(o); if(!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          <VisuallyHidden><DialogHeader><DialogTitle>Detalles del Servicio</DialogTitle></DialogHeader></VisuallyHidden>
          {selected && <ResumenServicio servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
