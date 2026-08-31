'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, getDocs, where, deleteDoc } from 'firebase/firestore';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  MessageSquare, 
  PlusCircle, 
  Loader2, 
  CalendarDays, 
  Clock, 
  MapPin, 
  Phone,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ShieldCheck,
  Car
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SolicitudUniversal {
  id: string;
  nombreCliente: string;
  telefono: string;
  jid?: string;
  tipoVehiculo: string;
  lugarRecogida: string;
  horaRecogida: string;
  fechaServicio: string;
  destino: string;
  estado: string;
  fecha: any;
  consecutivo?: string;
  tarifaTotal?: number;
  _tipo: 'pasajeros' | 'asesor' | 'custodia';
}

export default function CotizacionesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // 1. Consultas Multicolección
  const cotizacionesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'cotizaciones'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const solicitudesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'solicitudes_asesor'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const enviosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Solo mostramos envíos que requieren atención manual en esta bandeja
    return query(collection(db, 'envios'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: cotizacionesRaw, isLoading: loadingCots } = useCollection(cotizacionesQuery);
  const { data: solicitudesRaw, isLoading: loadingSols } = useCollection(solicitudesQuery);
  const { data: enviosRaw, isLoading: loadingEnvios } = useCollection(enviosQuery);

  const isLoading = loadingCots || loadingSols || loadingEnvios;

  // 2. Fusión y Normalización de Datos
  const todasLasSolicitudes = useMemo(() => {
    const cots = (cotizacionesRaw || []).map(c => ({ 
      ...c, 
      _tipo: 'pasajeros' as const,
      lugarRecogida: c.lugarRecogida || 'N/A'
    }));

    const sols = (solicitudesRaw || [])
      .filter(s => s.estado !== 'descartado')
      .map(s => ({
        ...s,
        tipoVehiculo: 'Atención personalizada',
        lugarRecogida: 'Por definir',
        horaRecogida: 'Por definir',
        fechaServicio: 'Por definir',
        destino: 'Por definir',
        _tipo: 'asesor' as const
      }));

    const envs = (enviosRaw || [])
      .filter(e => e.estado === 'requiere_revision_manual' || e.estado === 'programado')
      .map(e => ({
        ...e,
        nombreCliente: 'Cliente J&J Carga', // En envios aún no tenemos el campo nombreCliente directo en el root
        lugarRecogida: e.origen,
        fechaServicio: e.fecha,
        horaRecogida: e.hora,
        tipoVehiculo: e.vehiculo,
        _tipo: 'custodia' as const
      }));

    return [...cots, ...sols, ...envs].sort((a, b) => {
      const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || a.createdAt);
      const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || b.createdAt);
      return fb.getTime() - fa.getTime();
    });
  }, [cotizacionesRaw, solicitudesRaw, enviosRaw]);

  const pendingCount = useMemo(() => 
    todasLasSolicitudes.filter(c => c.estado === 'pendiente' || c.estado === 'requiere_revision_manual').length, 
  [todasLasSolicitudes]);

  const handleUpdateStatus = async (item: SolicitudUniversal, newStatus: string) => {
    let collectionName = '';
    if (item._tipo === 'pasajeros') collectionName = 'cotizaciones';
    else if (item._tipo === 'asesor') collectionName = 'solicitudes_asesor';
    else if (item._tipo === 'custodia') collectionName = 'envios';

    const docRef = doc(db, collectionName, item.id);
    try {
      await updateDoc(docRef, { estado: newStatus });
      
      if (newStatus === 'descartado' && item.jid) {
        // Lógica de limpieza de bot si aplica
        await deleteDoc(doc(db, 'sesiones_nova', item.jid)).catch(() => {});
      }

      toast({ title: "Estado Actualizado", description: `La solicitud de ${item._tipo} ha cambiado a ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado." });
    }
  };

  return (
    <div className="page-container px-4 py-4 sm:px-8 sm:py-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Bandeja Nova
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white font-black px-2 py-0.5 text-xs sm:text-sm rounded-lg shadow-lg shadow-orange-100">
                {pendingCount} PENDIENTES
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest">Centro de Control Universal J&J Connect</p>
        </div>
      </header>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 sm:p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-xs sm:text-sm font-black uppercase text-muted-foreground tracking-widest">Sincronizando flujos...</p>
          </div>
        ) : todasLasSolicitudes.length === 0 ? (
          <div className="p-16 sm:p-20 text-center text-muted-foreground opacity-40">
            <ClipboardList className="h-12 w-12 mx-auto mb-3" />
            <p className="font-black uppercase text-xs">No hay solicitudes activas</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[20%]">Cliente</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[15%]">Categoría</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[30%]">Servicio / Ruta</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[15%]">Vehículo</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 text-center w-[10%]">Estado</TableHead>
                  <TableHead className="px-3 py-2 w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todasLasSolicitudes.map((c, index) => {
                  const displayName = c.nombreCliente && c.nombreCliente !== 'Cliente' 
                    ? c.nombreCliente 
                    : `Solicitud #${todasLasSolicitudes.length - index}`;
                  
                  const cleanPhone = c.telefono ? c.telefono.split('@')[0] : 'N/A';
                  const trayectoFull = c._tipo === 'asesor' ? 'Solicitud de asesoría humana' : `${c.lugarRecogida} ➔ ${c.destino}`;
                  const trayectoShort = trayectoFull.length > 30 ? trayectoFull.substring(0, 27) + '...' : trayectoFull;

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <TableCell className="px-3 py-4 align-middle">
                        <div className="flex flex-col min-w-0">
                          <p className="font-black text-slate-800 text-xs uppercase leading-tight truncate">{displayName}</p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Phone className="h-2.5 w-2.5" /> {cleanPhone}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-4 align-middle">
                        {c._tipo === 'custodia' ? (
                          <Badge className="bg-orange-500 text-white border-none font-black text-[8px] uppercase tracking-tighter shadow-sm px-2">
                            📦 Envío Blindado
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-600 text-white border-none font-black text-[8px] uppercase tracking-tighter shadow-sm px-2">
                            🚗 Pasajeros
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-4 align-middle">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate" title={trayectoFull}>
                            <MapPin className={cn("h-3 w-3 shrink-0", c._tipo === 'custodia' ? "text-orange-500" : "text-blue-500")} />
                            <span className="truncate">{trayectoShort}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                            <span className="flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5" /> {c.fechaServicio}</span>
                            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {c.horaRecogida}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-4 align-middle">
                        {c._tipo === 'asesor' ? (
                          <Badge className="bg-rose-500 text-white border-none font-black text-[8px] uppercase tracking-tighter truncate block text-center py-0.5">
                            🙋 ASESOR
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-black text-[8px] uppercase border-slate-200 text-slate-600 bg-slate-50 truncate block text-center max-w-[90px]">
                            {c.tipoVehiculo?.split(' ')[0] || 'Auto'}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-3 py-4 text-center align-middle">
                        <Badge className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5",
                          c.estado === 'requiere_revision_manual' ? "bg-rose-100 text-rose-700 animate-pulse" : 
                          c.estado === 'pendiente' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {c.estado === 'requiere_revision_manual' ? 'RIESGO' : c.estado}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-3 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 lg:w-auto rounded-xl font-black text-[10px] uppercase p-0 lg:px-4 border-slate-200"
                            onClick={() => router.push(`/dashboard/whatsapp-bandeja?jid=${c.jid}`)}
                          >
                            <MessageSquare className="h-3 w-3 lg:mr-1.5" />
                            <span className="hidden lg:inline">Responder</span>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                              {c._tipo === 'pasajeros' && (
                                <DropdownMenuItem 
                                  className="rounded-lg font-bold text-xs py-2.5 text-green-600 bg-green-50/50 mb-1"
                                  onClick={() => router.push(`/dashboard/servicios?nombre=${encodeURIComponent(displayName)}&telefono=${cleanPhone}&origen=${encodeURIComponent(c.lugarRecogida)}&destino=${encodeURIComponent(c.destino)}&fecha=${c.fechaServicio}&hora=${c.horaRecogida}`)}
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Servicio
                                </DropdownMenuItem>
                              )}
                              {c._tipo === 'custodia' && (
                                <DropdownMenuItem 
                                  className="rounded-lg font-black text-xs py-2.5 text-orange-600 bg-orange-50/50 mb-1"
                                  onClick={() => router.push(`/dashboard/custodia/envios`)}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" /> Revisar Riesgo
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(c, 'atendido')} className="rounded-lg font-bold text-xs py-2.5">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" /> Marcar Atendido
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(c, 'descartado')} className="rounded-lg font-bold text-xs py-2.5 text-red-600">
                                <XCircle className="mr-2 h-4 w-4" /> Descartar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      
      <footer className="mt-8 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Bandeja de Control Nova v5.0 — Multicore Architecture</p>
      </footer>
    </div>
  );
}
