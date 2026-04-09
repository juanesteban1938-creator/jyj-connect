'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Send,
  ArrowRight,
  Clock as ClockIcon
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ServicioForm, type ServicioFormValues } from '@/components/dashboard/servicios/servicio-form';
import { ResumenServicio } from '@/components/dashboard/facturacion/resumen-servicio';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, updateDoc, collection, query } from 'firebase/firestore';
import { enviarNotificacionServicio } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import type { Servicio } from '@/lib/types';

export default function ServiciosPage() {
  const [activeTab, setActiveTab] = useState('activos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [selected, setSelected] = useState<Servicio | null>(null);
  const [selectedResumen, setSelectedResumen] = useState<Servicio | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const servicesColQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'services'));
  }, [db, user]);

  const conductoresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'conductores'));
  }, [db, user]);

  const vehiculosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'vehiculos'));
  }, [db, user]);

  const { data: serviciosRaw, isLoading: servicesLoading } = useCollection(servicesColQuery);
  const { data: conductoresRaw } = useCollection(conductoresQuery);
  const { data: vehiculosRaw } = useCollection(vehiculosQuery);

  const servicios = serviciosRaw || [];
  const conductores = useMemo(() => conductoresRaw || [], [conductoresRaw]);
  const vehiculos = useMemo(() => vehiculosRaw || [], [vehiculosRaw]);

  const handleCancelForm = useCallback(() => setIsFormOpen(false), []);

  useEffect(() => {
    if (!servicesLoading) {
      setIsLoading(false);
    }
  }, [servicesLoading]);

  const activeServicesCount = servicios.filter(s => s.estado === 'Programado' || s.estado === 'En Servicio').length;

  const getStatusStyles = (estado: string) => {
    switch (estado) {
      case 'Programado':
        return {
          border: 'border-l-blue-500',
          badge: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'En Servicio':
        return {
          border: 'border-l-green-500',
          badge: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200',
          dot: 'bg-green-500'
        };
      case 'Finalizado':
        return {
          border: 'border-l-slate-400',
          badge: 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200',
          dot: 'bg-slate-400'
        };
      case 'Cancelado':
        return {
          border: 'border-l-red-500',
          badge: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200',
          dot: 'bg-red-500'
        };
      default:
        return {
          border: 'border-l-gray-200',
          badge: 'bg-gray-100 text-gray-600',
          dot: 'bg-gray-400'
        };
    }
  };

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
      updateDoc(docRef, { notificacionEnviada: true }).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { notificacionEnviada: true }
        }));
      });
    } else {
      toast({ variant: "destructive", title: "Error Nova", description: result.error || "No se pudo enviar el WhatsApp." });
    }
  };

  const handleNuevoServicio = () => {
    setSelected(null); 
    setIsFormOpen(true);
  };

  const handleUpdateEstado = useCallback(async (id: string, nuevoEstado: Servicio['estado']) => {
    const docRef = doc(db, 'services', id);

    if (nuevoEstado === 'En Servicio') {
      const servicioActual = servicios.find(s => s.id === id);
      if (servicioActual?.conductorTelefono) {
        const gpsLink = `${window.location.origin}/gps/${id}`;
        
        fetch(`https://focused-harmony-production.up.railway.app/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'jj-connect-2026'
          },
          body: JSON.stringify({
            jid: `57${servicioActual.conductorTelefono.replace(/\D/g, '')}@c.us`,
            mensaje: `🚐 *Servicio ${servicioActual.consecutivo} INICIADO*\n\nHola *${servicioActual.conductor}*, tu servicio ha comenzado.\n\n📍 *Destino:* ${servicioActual.destino}\n👤 *Cliente:* ${servicioActual.clienteNombre || servicioActual.cliente}\n\n━━━━━━━━━━━━━━━━\n⚠️ *IMPORTANTE:* Por favor abre este link para activar el GPS y NO lo cierres durante el trayecto:\n\n🔗 ${gpsLink}\n━━━━━━━━━━━━━━━━\n\n¡Buen viaje! 🌟`
          })
        }).catch(err => console.error("Error al notificar conductor:", err));
      }
    }

    updateDoc(docRef, { estado: nuevoEstado })
      .then(() => toast({ title: `Servicio ${nuevoEstado}` }))
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { estado: nuevoEstado }
        }));
        toast({ variant: "destructive", title: "Error al actualizar estado" });
      });
  }, [db, toast, servicios]);

  const handleSave = async (formData: ServicioFormValues) => {
    setIsSaving(true);
    const esNuevo = !selected || !selected.id;
    const servicioId = esNuevo ? String(Date.now()) : selected.id;

    const conductorAsignado = conductores.find(c => c.id === formData.conductorId);
    const vehiculoAsignado = vehiculos.find(v => v.id === formData.vehiculoId);

    const puntosRecogidaStrings = formData.puntosRecogida.map(p => p.address);
    const puntosDestinoStrings = formData.puntosDestino.map(p => p.address);

    const payload: Servicio = {
      id: servicioId,
      consecutivo: selected?.consecutivo || `JJ-${servicios.length + 1001}`,
      cliente: formData.nombreCliente,
      clienteNombre: formData.nombreCliente,
      origen: puntosRecogidaStrings[0] || '',
      destino: puntosDestinoStrings[puntosDestinoStrings.length - 1] || '',
      puntosRecogida: puntosRecogidaStrings,
      puntosDestino: puntosDestinoStrings,
      telefonoCliente: formData.telefonoCliente,
      emailCliente: formData.emailCliente,
      fecha: formData.fechaRecogida.toISOString(),
      hora: formData.horaRecogida,
      nitCliente: formData.nitCliente,
      vehiculoPlaca: formData.esVehiculoNoRegistrado ? formData.vehiculoOtro : (vehiculoAsignado?.placa || ''),
      vehiculo: formData.esVehiculoNoRegistrado ? formData.vehiculoOtro : (vehiculoAsignado ? `${vehiculoAsignado.marca} ${vehiculoAsignado.linea}` : ''),
      conductor: formData.esConductorNoRegistrado ? formData.conductorOtro : (conductorAsignado ? `${conductorAsignado.nombres} ${conductorAsignado.apellidos}` : 'No asignado'),
      conductorTelefono: formData.esConductorNoRegistrado ? formData.conductorOtro : (conductorAsignado?.telefono || ''),
      estado: selected?.estado || 'Programado',
      valorServicio: Number(formData.valorServicio) || 0,
      anticipo: Number(formData.anticipo) || 0,
      saldo: (Number(formData.valorServicio) || 0) - (Number(formData.anticipo) || 0),
      metodoPago: formData.metodoPago,
      estadoPago: formData.estadoPago as any,
      costoOperacion: Number(formData.costoOperacion) || 0,
      notificacionEnviada: selected?.notificacionEnviada || false,
      notificacionSalidaEnviada: selected?.notificacionSalidaEnviada || false,
      clienteIniciales: formData.nombreCliente.substring(0, 2).toUpperCase(),
    };

    const docRef = doc(db, 'services', servicioId);
    setDoc(docRef, payload, { merge: true })
      .then(() => {
        if (formData.nitCliente) {
          const clienteRef = doc(db, 'clientes', formData.nitCliente);
          setDoc(clienteRef, {
            id: formData.nitCliente,
            nombre: formData.nombreCliente,
            razonSocial: formData.nombreCliente,
            nit: formData.nitCliente,
            telefono: formData.telefonoCliente,
            email: formData.emailCliente,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        
        toast({ title: esNuevo ? "Servicio Programado" : "Servicio Actualizado" });
        
        setTimeout(() => {
          setIsFormOpen(false);
          setSelected(null);
        }, 100);

        if (esNuevo) {
          handleEnviarWhatsApp(payload);
        }
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: payload
        }));
        toast({ variant: "destructive", title: "Error al procesar el servicio" });
      })
      .finally(() => {
        setIsSaving(false);
      });
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
    <div className="min-h-screen bg-[#F8F9FA] pb-12 w-full overflow-hidden">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Servicios
            <Badge className="bg-orange-500 text-white border-none font-black px-2 py-0.5 text-[10px] sm:text-xs rounded-lg shadow-sm">
              {activeServicesCount}
            </Badge>
          </h1>
        </div>
        <Button 
          onClick={handleNuevoServicio} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-200 h-10 px-4 sm:px-6"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Programar
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="pl-9 h-9 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-orange-500 text-xs w-full"
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-white border rounded-xl h-9 p-1 shadow-sm w-full sm:w-fit">
            <TabsTrigger value="activos" className="flex-1 sm:px-6 font-black uppercase text-[9px] rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Activos</TabsTrigger>
            <TabsTrigger value="historial" className="flex-1 sm:px-6 font-black uppercase text-[9px] rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Historial</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Sincronizando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground bg-white border-dashed rounded-3xl">
            <div className="flex flex-col items-center gap-2 opacity-40">
              <Briefcase className="h-8 w-8" />
              <p className="font-bold uppercase text-[10px]">Sin registros</p>
            </div>
          </Card>
        ) : filtered.sort((a, b) => a.hora.localeCompare(b.hora)).map(s => {
          const styles = getStatusStyles(s.estado);
          const iniciales = (s.clienteNombre || s.cliente || '??').substring(0, 2).toUpperCase();
          
          return (
            <Card 
              key={s.id} 
              className={cn(
                "group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-xl w-full",
                "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                styles.border.replace('border-l-', 'before:bg-')
              )}
            >
              <div className="p-4 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[100px_1fr_200px_auto] items-center gap-4 w-full">
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Recogida</span>
                  <p className="text-lg sm:text-2xl font-black text-orange-600 tracking-tighter leading-none">{s.hora}</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1 font-bold whitespace-nowrap">
                    {format(new Date(s.fecha), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>

                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="hidden xs:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#F59E0B] items-center justify-center text-white font-black text-xs shadow-inner shrink-0">
                    {iniciales}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-slate-800 text-xs sm:text-base leading-tight uppercase truncate">{s.cliente}</p>
                      <Badge variant="outline" className="hidden lg:flex text-[8px] font-black uppercase h-3.5 px-1 border-slate-200 text-slate-400 shrink-0">
                        {s.consecutivo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] sm:text-xs font-bold text-slate-500">
                      <span className="truncate">{s.origen}</span>
                      <ArrowRight className="h-2 w-2 text-orange-400 flex-shrink-0" />
                      <span className="truncate text-slate-800">{s.destino}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center px-4 border-l border-slate-100 max-w-[200px] min-w-0">
                  <div className="min-w-0 w-full">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 truncate w-full">
                      <span className="font-black text-slate-700 uppercase">{s.conductor}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="font-black text-blue-600 uppercase tracking-widest">{s.vehiculoPlaca}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0", styles.badge)}>
                      {s.estado}
                    </Badge>
                    {s.notificacionEnviada && (
                      <div className="flex items-center gap-1 text-[7px] font-black text-green-600 uppercase">
                        <Send className="h-2 w-2" /> Notificado
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-slate-100">
                      <DropdownMenuItem onClick={() => { setSelectedResumen(s); setTimeout(() => setIsResumenOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5">
                        <Eye className="mr-2 h-4 w-4 text-slate-400" /> Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsFormOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5">
                        <Edit className="mr-2 h-4 w-4 text-slate-400" /> Editar Registro
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEnviarWhatsApp(s)} className="rounded-lg font-bold text-xs py-2.5 text-green-600">
                        <MessageSquare className="mr-2 h-4 w-4" /> Notificar WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      {s.estado === 'Programado' && (
                        <DropdownMenuItem onClick={() => handleUpdateEstado(s.id, 'En Servicio')} className="rounded-lg font-black text-xs py-2.5 text-blue-600 bg-blue-50/50">
                          <PlayCircle className="mr-2 h-4 w-4" /> INICIAR SERVICIO
                        </DropdownMenuItem>
                      )}
                      {(s.estado === 'Programado' || s.estado === 'En Servicio') && (
                        <DropdownMenuItem onClick={() => handleUpdateEstado(s.id, 'Finalizado')} className="rounded-lg font-black text-xs py-2.5 text-green-600 bg-green-50/50">
                          <CheckCircle className="mr-2 h-4 w-4" /> FINALIZAR SERVICIO
                        </DropdownMenuItem>
                      )}
                      {s.estado !== 'Cancelado' && (
                        <DropdownMenuItem onClick={() => handleUpdateEstado(s.id, 'Cancelado')} className="rounded-lg font-black text-xs py-2.5 text-red-600">
                          <XCircle className="mr-2 h-4 w-4" /> CANCELAR
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={isFormOpen} onOpenChange={o => { 
        setIsFormOpen(o); 
        if(!o) { 
          setSelected(null); 
          setIsSaving(false); 
        } 
      }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Formulario para la programación y edición de servicios de transporte especial.</DialogDescription>
          <div className="p-6 sm:p-8 border-b bg-slate-50/50">
            <DialogTitle className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500 text-white">
                <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              {selected ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <ServicioForm 
              servicio={selected} 
              onSave={handleSave} 
              onCancel={handleCancelForm} 
              conductores={conductores} 
              vehiculos={vehiculos} 
              isSaving={isSaving}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isResumenOpen} onOpenChange={o => { setIsResumenOpen(o); if(!o) setSelectedResumen(null); }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl mx-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Vista detallada de los datos del servicio, conductor, vehículo y estado financiero.</DialogDescription>
          <div className="p-6 border-b bg-slate-50/50">
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-500" /> Detalle del Servicio
            </DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {selectedResumen && <ResumenServicio servicio={selectedResumen} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
