'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where, deleteDoc } from 'firebase/firestore';
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
  MoreHorizontal
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

interface Cotizacion {
  id: string;
  nombreCliente: string;
  telefono: string;
  jid: string;
  tipoVehiculo: string;
  lugarRecogida: string;
  horaRecogida: string;
  fechaServicio: string;
  destino: string;
  estado: 'pendiente' | 'contactado' | 'programado' | 'descartado';
  fecha: any;
}

export default function CotizacionesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

  useEffect(() => {
    if (!db || !user) return;

    const colRef = collection(db, 'cotizaciones');
    const q = query(colRef, orderBy('fecha', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Cotizacion[];
        setCotizaciones(data);
        setIsLoading(false);
      },
      (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cotizaciones',
          operation: 'list'
        }));
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  useEffect(() => {
    if (!db || cotizaciones.length === 0) return;

    const pendientes = cotizaciones.filter(c => c.estado === 'pendiente');
    
    if (pendientes.length > 0) {
      const timer = setTimeout(() => {
        pendientes.forEach(c => {
          const docRef = doc(db, 'cotizaciones', c.id);
          updateDoc(docRef, { estado: 'contactado' }).catch(() => {
          });
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [cotizaciones, db]);

  const pendingCount = useMemo(() => 
    cotizaciones.filter(c => c.estado === 'pendiente').length, 
  [cotizaciones]);

  const cotizacionesVisibles = useMemo(() => 
    cotizaciones.filter(c => c.estado !== 'descartado'),
  [cotizaciones]);

  const handleUpdateStatus = async (id: string, jid: string, newStatus: Cotizacion['estado']) => {
    const docRef = doc(db, 'cotizaciones', id);
    try {
      await updateDoc(docRef, { estado: newStatus });
      
      if (newStatus === 'descartado') {
        await deleteDoc(doc(db, 'sesiones_nova', jid)).catch(() => {
          console.warn('No se encontró sesión activa para eliminar.');
        });
        
        const convSnap = await getDocs(
          query(collection(db, 'conversaciones'), where('jid', '==', jid))
        );
        const deletePromises = convSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      toast({ title: "Estado Actualizado", description: `La cotización ahora está en estado ${newStatus}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado correctamente." });
    }
  };

  const getStatusBadge = (estado: Cotizacion['estado']) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 text-[10px] px-1.5 py-0">PEND</Badge>;
      case 'contactado':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] px-1.5 py-0">CONT</Badge>;
      case 'programado':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] px-1.5 py-0">PROG</Badge>;
      case 'descartado':
        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-slate-200 text-[10px] px-1.5 py-0">DESC</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{estado}</Badge>;
    }
  };

  return (
    <div className="page-container px-4 py-4 sm:px-8 sm:py-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Cotizaciones Recibidas
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white font-black px-2 py-0.5 text-xs sm:text-sm rounded-lg">
                {pendingCount} PENDIENTES
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Gestione las solicitudes de presupuesto enviadas por los clientes.</p>
        </div>
      </header>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 sm:p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-xs sm:text-sm font-black uppercase text-muted-foreground tracking-widest">Sincronizando solicitudes...</p>
          </div>
        ) : cotizacionesVisibles.length === 0 ? (
          <div className="p-16 sm:p-20 text-center text-muted-foreground opacity-40">
            <ClipboardList className="h-12 w-12 mx-auto mb-3" />
            <p className="font-black uppercase text-xs">No hay cotizaciones activas</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[25%]">Cliente</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[35%]">Servicio</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 w-[15%]">Vehículo</TableHead>
                  <TableHead className="px-3 py-2 font-black text-[10px] uppercase text-slate-400 text-center w-[15%]">Estado</TableHead>
                  <TableHead className="px-3 py-2 w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotizacionesVisibles.map((c, index) => {
                  const displayName = c.nombreCliente && c.nombreCliente !== 'Cliente' 
                    ? c.nombreCliente 
                    : `Cotización #${cotizaciones.length - index}`;
                  
                  const cleanPhone = c.telefono ? c.telefono.split('@')[0] : 'N/A';
                  const trayectoFull = `${c.lugarRecogida} ➔ ${c.destino}`;
                  const trayectoShort = trayectoFull.length > 30 ? trayectoFull.substring(0, 27) + '...' : trayectoFull;

                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="flex flex-col min-w-0">
                          <p className="font-black text-slate-800 text-xs uppercase leading-tight truncate">{displayName}</p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Phone className="h-2.5 w-2.5" /> {cleanPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate" title={trayectoFull}>
                            <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                            <span className="truncate">{trayectoShort}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase">
                            <span className="flex items-center gap-1"><CalendarDays className="h-2.5 w-2.5" /> {c.fechaServicio}</span>
                            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {c.horaRecogida}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-middle">
                        <Badge variant="outline" className="font-black text-[9px] uppercase border-blue-100 text-blue-600 bg-blue-50/30 truncate block text-center max-w-[80px]">
                          {c.tipoVehiculo.split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center align-middle">
                        {getStatusBadge(c.estado)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 w-7 lg:w-auto lg:h-8 rounded-lg font-bold text-[10px] uppercase p-0 lg:px-3"
                            onClick={() => router.push(`/dashboard/whatsapp-bandeja?jid=${c.jid}`)}
                            title="Responder"
                          >
                            <MessageSquare className="h-3 w-3 lg:mr-1.5" />
                            <span className="hidden lg:inline">Responder</span>
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                              <DropdownMenuItem 
                                className="rounded-lg font-bold text-xs py-2.5 text-green-600 bg-green-50/50 mb-1"
                                onClick={() => router.push(`/dashboard/servicios?nombre=${encodeURIComponent(displayName)}&telefono=${cleanPhone}&origen=${encodeURIComponent(c.lugarRecogida)}&destino=${encodeURIComponent(c.destino)}&fecha=${c.fechaServicio}&hora=${c.horaRecogida}`)}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" /> Crear Servicio
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(c.id, c.jid, 'contactado')} className="rounded-lg font-bold text-xs py-2.5">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" /> Marcar Contactado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(c.id, c.jid, 'descartado')} className="rounded-lg font-bold text-xs py-2.5 text-red-600">
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
    </div>
  );
}
