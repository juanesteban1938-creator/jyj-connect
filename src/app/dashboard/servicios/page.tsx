
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Search, PlusCircle, Eye, Edit, MessageSquare, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ServicioForm } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { enviarNotificacionServicio } from '@/lib/whatsapp';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, setDoc } from 'firebase/firestore';

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
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSave = async (data: any) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const isNew = !selected;
      const vehiculoObj = data.esVehiculoNoRegistrado ? null : vehiculos.find(v => v.id === data.vehiculoId);
      const placaReal = data.esVehiculoNoRegistrado ? (data.vehiculoOtro || 'N/A') : (vehiculoObj?.placa || 'N/A');
      const conductorObj = data.esConductorNoRegistrado ? null : conductores.find(c => c.id === data.conductorId);
      
      const valor = Number(data.valorServicio) || 0;
      const anticipo = Number(data.anticipo) || 0;
      const saldo = valor - anticipo;

      const payload: Servicio = { 
        id: selected?.id || Date.now().toString(),
        consecutivo: selected?.consecutivo || `GA-CCT-${servicios.length + 101}`,
        cliente: data.nombreCliente,
        clienteIniciales: data.nombreCliente.substring(0, 2).toUpperCase(),
        origen: data.direccionRecogida,
        destino: data.direccionDestino,
        telefonoCliente: data.telefonoCliente,
        fecha: data.fechaRecogida.toISOString(),
        hora: data.horaRecogida,
        nitCliente: data.nitCliente,
        emailCliente: data.emailCliente || '',
        vehiculo: data.esVehiculoNoRegistrado ? data.vehiculoOtro : (vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.linea}` : 'N/A'),
        vehiculoPlaca: placaReal,
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

      // 1. LocalStorage
      const updated = selected ? servicios.map(s => s.id === selected.id ? payload : s) : [...servicios, payload];
      setServicios(updated);
      localStorage.setItem('servicios', JSON.stringify(updated));

      // 2. Firestore
      const pickupDate = new Date(data.fechaRecogida);
      const [h, m] = (data.horaRecogida || '00:00').split(':').map(Number);
      pickupDate.setHours(h, m, 0, 0);

      const firestoreData = {
        ...payload,
        horaRecogidaTimestamp: Timestamp.fromDate(pickupDate),
        updatedAt: serverTimestamp()
      };

      if (isNew) {
        await addDoc(collection(db, 'servicios'), { ...firestoreData, createdAt: serverTimestamp() });
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
          <Input placeholder="Buscar..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Servicio</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 border">
          <TabsTrigger value="activos" className="px-6">Activos</TabsTrigger>
          <TabsTrigger value="historial" className="px-6">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          {filtered.map(s => (
            <Card key={s.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-primary">{s.hora} - {s.consecutivo}</p>
                  <p className="text-sm font-semibold">{s.origen} ➔ {s.destino}</p>
                  <p className="text-xs text-muted-foreground uppercase">{s.cliente} | {s.conductor} ({s.vehiculoPlaca})</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{s.estado}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><PlusCircle className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-green-600" onClick={() => handleManualNotification(s)}><MessageSquare className="mr-2 h-4 w-4" /> Notificar</DropdownMenuItem>
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
          <DialogHeader><DialogTitle>{selected ? 'Editar' : 'Programar'} Servicio</DialogTitle></DialogHeader>
          <ServicioForm servicio={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} conductores={conductores} vehiculos={vehiculos} isSaving={isSaving} />
        </DialogContent>
      </Dialog>

      <Dialog open={isResumenOpen} onOpenChange={setIsResumenOpen}>
        <DialogContent className="sm:max-w-lg">
          <VisuallyHidden><DialogHeader><DialogTitle>Resumen</DialogTitle></DialogHeader></VisuallyHidden>
          {selected && <ResumenServicio servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
