'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, AlertCircle, PhoneIncoming, XCircle, Power, Loader2 } from 'lucide-react';
import { obtenerEstadoNova, obtenerQRNova } from '@/lib/whatsapp';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function WhatsAppStatusPage() {
  const [status, setStatus] = useState<{ connected: boolean; status?: string; error?: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'notificaciones_whatsapp'), 
      orderBy('fecha', 'desc'), 
      limit(10)
    );
  }, [firestore, user]);

  const { data: logs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  const checkStatus = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await obtenerEstadoNova();
      setStatus(data);
      
      if (data && data.connected === false) {
        // Intentar obtener el QR si no está conectado
        const qrRes = await obtenerQRNova();
        if (qrRes && qrRes.qr) {
          setQrCode(qrRes.qr);
        } else {
          setQrCode(null);
        }
      } else {
        setQrCode(null);
      }
    } catch (err: any) {
      console.error('[Nova Status Page] Error:', err);
      setStatus({ connected: false, error: 'Sin respuesta del servidor de Nova' });
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  const handleRestart = async () => {
    if (!confirm('¿Seguro que deseas reiniciar el motor de Nova? Esto forzará la generación de un nuevo código QR si la sesión actual falló.')) return;
    setIsLoading(true);
    setQrCode(null);
    try {
      const response = await fetch('https://focused-harmony-production.up.railway.app/restart', {
        method: 'POST',
        headers: { 'x-api-key': 'jj-connect-2026' }
      });
      if (response.ok) {
        toast({ title: "Reiniciando Nova", description: "El motor se está limpiando. El QR aparecerá en unos segundos." });
        // Polling rápido después del reinicio
        setTimeout(() => checkStatus(), 3000);
        setTimeout(() => checkStatus(), 7000);
      } else {
        throw new Error('No se pudo contactar con Railway');
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error al reiniciar", description: "Verifica que Railway esté activo." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Polling inteligente: 5s si no hay conexión, 20s si está conectada
    const tick = () => {
      checkStatus();
      const delay = (status?.connected) ? 20000 : 5000;
      intervalRef.current = setTimeout(tick, delay);
    };

    const timer = setTimeout(tick, 5000);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      clearTimeout(timer);
    };
  }, [checkStatus, status?.connected]);

  return (
    <div className="page-container">
      <header>
        <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Estado de Nova</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-8">Gestión de enlace WhatsApp y bitácora de notificaciones automáticas.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Conexión en Vivo</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                    {status?.status || 'Sincronizando...'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRestart} 
                    disabled={isLoading}
                    title="Reiniciar Sesión"
                    className="h-10 w-10 rounded-xl text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
                </Button>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => checkStatus(true)} 
                    disabled={isRefreshing}
                    className={cn("h-10 w-10 rounded-xl border-slate-200", isRefreshing && "animate-spin")}
                >
                    <RefreshCw className="h-5 w-5 text-slate-400" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-center p-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              {status?.connected === true ? (
                <div className="text-center animate-in fade-in zoom-in duration-500">
                  <div className="relative inline-block mb-6">
                    <CheckCircle2 className="h-20 w-20 text-emerald-500" />
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Sistema Operativo</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-[250px] mx-auto">Nova está vinculada correctamente y procesando mensajes en tiempo real.</p>
                </div>
              ) : (
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AlertCircle className="h-20 w-20 text-orange-500 mx-auto mb-6 opacity-40" />
                  <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 font-black uppercase text-[10px] px-4 py-1 rounded-full mb-4">
                    Desconectada
                  </Badge>
                  <p className="text-xs text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
                    La comunicación con WhatsApp se ha interrumpido. Es necesario vincular el dispositivo nuevamente.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {status?.connected === false && (
          <Card className="rounded-3xl shadow-xl border-none overflow-hidden bg-white border-2 border-orange-500/20">
            <CardHeader className="bg-orange-500 text-white p-6">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Vincular Nova</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase text-orange-100 mt-1">Escanea desde WhatsApp &gt; Dispositivos vinculados</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10 h-full min-h-[350px]">
              {qrCode ? (
                <div className="relative p-6 bg-white border-4 border-slate-100 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-500">
                  <Image 
                    src={qrCode} 
                    alt="QR Code" 
                    width={280} 
                    height={280} 
                    className="rounded-xl"
                    unoptimized
                  />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-full whitespace-nowrap shadow-xl">
                    Código de un solo uso
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center animate-pulse">
                    <PhoneIncoming className="h-10 w-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Generando Llave Segura</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Espera un momento por favor...</p>
                  </div>
                  <Loader2 className="h-6 w-6 text-orange-500 animate-spin mt-4" />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Historial de Notificaciones</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Últimos 10 registros de envíos procesados por Nova</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Fecha y Hora</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Cliente</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Servicio / Ruta</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsError ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                        <AlertCircle className="h-12 w-12 text-rose-500" />
                        <p className="text-xs font-black uppercase text-slate-500">Error al sincronizar bitácora</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs?.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                  <TableCell className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{log.fecha ? format(log.fecha.toDate(), 'dd MMM yy') : '...'}</span>
                        <span className="text-[10px] font-bold text-slate-400">{log.fecha ? format(log.fecha.toDate(), 'HH:mm') : ''}</span>
                      </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 uppercase truncate max-w-[180px]">{log.clienteNombre}</span>
                        <span className="text-[10px] font-bold text-slate-400">{log.clienteTelefono}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className="text-emerald-600">{log.origen?.split(',')[0]}</span> 
                      <span className="text-slate-300">➔</span> 
                      <span className="text-rose-600">{log.destino?.split(',')[0]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5 text-center">
                    {log.estado === 'enviado' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-black text-[9px] uppercase px-3 py-0.5 rounded-md">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> ENVIADO
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-100 font-black text-[9px] uppercase px-3 py-0.5 rounded-md" title={log.error}>
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> ERROR
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(logsLoading && !logs) && (
                <TableRow>
                  <TableCell colSpan={4} className="p-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {(!logs || logs.length === 0) && !logsLoading && !logsError && (
                <TableRow>
                  <TableCell colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase text-[10px]">No se han registrado envíos recientes.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <footer className="mt-12 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Nova Connection Layer v2.3.1 — J&J Connect</p>
      </footer>
    </div>
  );
}
