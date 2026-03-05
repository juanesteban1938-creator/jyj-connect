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
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import type { Servicio } from '@/lib/types';

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

  /**
   * VERSIÓN FINAL: CIERRE INSTANTÁNEO Y EJECUCIÓN EN SEGUNDO PLANO
   * Esta función es llamada por el formulario cuando se presiona "Guardar"
   */
  const handleSave = async (formData: any) => {
    console.log('[Nova] Iniciando handleSave con payload:', formData);
    
    // 1. CIERRE E INTERFAZ INMEDIATA (Solicitado por el usuario)
    // Cerramos el modal y notificamos al usuario ANTES de cualquier operación asíncrona
    setIsFormOpen(false);
    toast({ title: "Guardando en segundo plano... 🚐💨" });

    const servicioId = selected?.id || String(Date.now());
    const yaNotificado = selected?.notificacionEnviada === true;

    // Preparación de datos para Firestore
    const cleanPhone = (phone: string): string => {
      let cleaned = String(phone || '').replace(/\D/g, '');
      return '57' + cleaned.slice(-10);
    };

    let horaRecogidaTimestamp = null;
    if (formData.fechaRecogida && formData.horaRecogida) {
      try {
        const fechaStr = formData.fechaRecogida instanceof Date 
          ? formData.fechaRecogida.toISOString().split('T')[0] 
          : new Date(formData.fechaRecogida).toISOString().split('T')[0];
        const fechaUTC = new Date(`${fechaStr}T${formData.horaRecogida}:00-05:00`);
        if (isValid(fechaUTC)) {
          horaRecogidaTimestamp = Timestamp.fromDate(fechaUTC);
        }
      } catch (e) { console.error('Error Timestamp:', e); }
    }

    const payload: Servicio = {
      id: servicioId,
      consecutivo: selected?.consecutivo || `JJ-${servicios.length + 1001}`,
      cliente: formData.nombreCliente,
      clienteNombre: formData.nombreCliente,
      clienteIniciales: formData.nombreCliente.substring(0, 2).toUpperCase(),
      origen: formData.direccionRecogida,
      destino: formData.direccionDestino,
      telefonoCliente: cleanPhone(formData.telefonoCliente),
      fecha: formData.fechaRecogida instanceof Date ? formData.fechaRecogida.toISOString() : new Date(formData.fechaRecogida).toISOString(),
      hora: formData.horaRecogida,
      nitCliente: formData.nitCliente,
      emailCliente: formData.emailCliente || '',
      vehiculo: formData.esVehiculoNoRegistrado ? `OTRO • ${formData.vehiculoOtro}` : (vehiculos.find(v => v.id === formData.vehiculoId)?.placa || 'N/A'),
      vehiculoPlaca: formData.esVehiculoNoRegistrado ? formData.vehiculoOtro : (vehiculos.find(v => v.id === formData.vehiculoId)?.placa || 'N/A'),
      conductor: formData.esConductorNoRegistrado ? formData.conductorOtro : (conductores.find(c => c.id === formData.conductorId) ? `${conductores.find(c => c.id === formData.conductorId).nombres} ${conductores.find(c => c.id === formData.conductorId).apellidos}` : 'No asignado'),
      conductorTelefono: formData.esConductorNoRegistrado ? formData.conductorTelefonoOtro : (conductores.find(c => c.id === formData.conductorId)?.telefono || ''),
      estado: 'Programado',
      valorServicio: Number(formData.valorServicio) || 0,
      anticipo: Number(formData.anticipo) || 0,
      costoOperacion: Number(formData.costoOperacion) || 0,
      saldo: (Number(formData.valorServicio) || 0) - (Number(formData.anticipo) || 0),
      metodoPago: formData.metodoPago,
      estadoPago: formData.estadoPago,
      notificacionEnviada: yaNotificado,
      notificacionSalidaEnviada: selected?.notificacionSalidaEnviada || false,
      horaRecogidaTimestamp: horaRecogidaTimestamp,
    };

    // 2. ACTUALIZACIÓN LOCAL (Para reflejar cambios sin esperar a la red)
    const updated = selected ? servicios.map(s => s.id === servicioId ? payload : s) : [...servicios, payload];
    setServicios(updated);
    localStorage.setItem('servicios', JSON.stringify(updated));
    setSelected(null);

    // 3. TRABAJO EN SEGUNDO PLANO (Firestore y WhatsApp)
    // Usamos .then() para no bloquear el hilo principal con 'await'
    console.log('[Nova] Intentando setDoc en segundo plano para:', servicioId);
    setDoc(doc(db, 'services', servicioId), payload, { merge: true })
      .then(() => {
        console.log('✅ Guardado exitoso en Firestore:', servicioId);
        // Si no se había notificado, disparamos WhatsApp
        if (!yaNotificado) {
          enviarNotificacionServicio({
            clienteNombre: payload.clienteNombre || payload.cliente,
            clienteTelefono: payload.telefonoCliente,
            fecha: format(new Date(payload.fecha), 'dd/MM/yyyy'),
            hora: payload.hora,
            origen: payload.origen,
            destino: payload.destino,
            placa: payload.vehiculoPlaca || 'N/A',
            conductor: payload.conductor,
            telefonoConductor: payload.conductorTelefono || 'N/A'
          }).then(res => {
            if (res.success) {
              setDoc(doc(db, 'services', servicioId), { notificacionEnviada: true }, { merge: true });
              toast({ title: "Nova notificó al cliente ✅" });
            }
          });
        }
      })
      .catch(e => {
        console.error('❌ Error Firestore:', e.message);
        toast({ variant: 'destructive', title: "Error guardando en Firestore" });
      });
  };

  const filtered = servicios.filter(s => {
    const isMatch = (s.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (s.conductor || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (s.vehiculoPlaca || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isTabMatch = activeTab === 'activos' ? (s.estado === 'Programado' || s.estado === 'En Servicio') : (s.estado === 'Finalizado' || s.estado === 'Cancelado');
    return isMatch && isTabMatch;
  });

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de Servicios</h1>
        <p className="page-subtitle">Administra y supervisa los traslados de Transportes Especiales J&J.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
            placeholder="Buscar por cliente, conductor o placa..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
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
                    <DropdownMenuTrigger asChild><PlusCircle className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-primary transition-colors" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsResumenOpen(true); }}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-green-600 font-bold" onClick={() => {
                         enviarNotificacionServicio({
                          clienteNombre: s.clienteNombre || s.cliente,
                          clienteTelefono: s.telefonoCliente,
                          fecha: format(new Date(s.fecha), 'dd/MM/yyyy'),
                          hora: s.hora,
                          origen: s.origen,
                          destino: s.destino,
                          placa: s.vehiculoPlaca || 'N/A',
                          conductor: s.conductor,
                          telefonoConductor: s.conductorTelefono || 'N/A'
                        }).then(res => {
                           if (res.success) toast({ title: "Re-notificación enviada a Nova ✅" });
                        });
                      }}><MessageSquare className="mr-2 h-4 w-4" /> Re-notificar Nova</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={o => { setIsFormOpen(o); if(!o) setSelected(null); }}>
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
