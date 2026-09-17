'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, AlertCircle, PhoneIncoming, XCircle, Power, Loader2, Info, Zap } from 'lucide-react';
import { obtenerEstadoNova, obtenerQRNova, WHATSAPP_BOT_URL } from '@/lib/whatsapp';
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
  const [retryCount, setRetryCount] = useState(0);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'notificaciones_whatsapp'), 
      orderBy('fecha', 'desc'), 
      limit(10)
    );
  }, [firestore, user]);

  const { data: logs, isLoading: logsLoading } = useCollection(logsQuery);

  const checkStatus = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await obtenerEstadoNova();
      setStatus(data);
      
      if (data && data.connected === false) {
        const qrRes = await obtenerQRNova();
        if (qrRes && qrRes.qr) {
          setQrCode(qrRes.qr);
          setRetryCount(0);
        }
      } else {
        setQrCode(null);
      }
    } catch (err: any) {
      setStatus({ connected: false, error: 'Nova Engine desconectada.' });
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  const handleRestart = async () => {
    if (!confirm('¿Deseas reiniciar el motor de Nova? Se cerrará la sesión actual y se purgarán los datos de conexión.')) return;
    setIsLoading(true);
    setQrCode(null);
    try {
      const response = await fetch(`${WHATSAPP_BOT_URL}/restart`, {
        method: 'POST',
        headers: { 'x-api-key': 'jj-connect-2026' }
      });
      if (response.ok) {
        toast({ title: "Nova Reiniciada", description: "Espera unos segundos para obtener un nuevo QR." });
        setTimeout(() => checkStatus(), 8000);
      } else {
        throw new Error('No se pudo contactar con el motor.');
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Verifica la conexión con Railway." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => checkStatus(), status?.connected ? 30000 : 8000);
    return () => clearInterval(interval);
  }, [checkStatus, status?.connected]);

  return (
    <div className="page-container">
      <header>
        <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Estado de Nova</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium mb-8">Centro de control y diagnóstico para el enlace de WhatsApp.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Conexión Global</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                    {status?.connected ? 'Sincronizado' : 'Buscando enlace...'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRestart} 
                    disabled={isLoading}
                    className="h-10 w-10 rounded-xl text-red-600 border-red-100 hover:bg-red-50 shadow-sm"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
                </Button>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => checkStatus(true)} 
                    disabled={isRefreshing}
                    className={cn("h-10 w-10 rounded-xl border-slate-200 shadow-sm", isRefreshing && "animate-spin")}
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
                  <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto mb-6" />
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Sistema Online</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-[250px] mx-auto leading-relaxed">Nova está procesando notificaciones y mensajes en tiempo real.</p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="h-20 w-20 text-orange-500 mx-auto mb-6 opacity-40" />
                  <Badge variant="destructive" className="bg-orange-100 text-orange-700 font-black uppercase text-[10px] px-4 py-1 rounded-full mb-4">
                    Desconectada
                  </Badge>
                  <p className="text-xs text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
                    {status?.error || 'Sin respuesta del motor central. Intenta refrescar o reiniciar el enlace.'}
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
              <CardDescription className="text-[10px] font-bold uppercase text-orange-100 mt-1">Sincroniza tu dispositivo móvil</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10 h-full min-h-[350px]">
              {qrCode ? (
                <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="relative p-4 bg-white border-4 border-slate-50 rounded-[2rem] shadow-2xl">
                    <Image src={qrCode} alt="QR Code" width={240} height={240} className="rounded-lg" unoptimized />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abre WhatsApp &gt; Dispositivos vinculados</p>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center animate-pulse mx-auto">
                    <Zap className="h-10 w-10 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase">Generando enlace...</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Este proceso puede tardar unos segundos</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[9px] font-black uppercase">Pooling Nova v3.6</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Bitácora de Salida</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Notificaciones automáticas recientes</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Fecha/Hora</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Destinatario</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Tipo</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 border-b last:border-0">
                  <TableCell className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{log.fecha ? format(log.fecha.toDate(), 'dd MMM yy') : '...'}</span>
                        <span className="text-[10px] font-bold text-slate-400">{log.fecha ? format(log.fecha.toDate(), 'HH:mm') : ''}</span>
                      </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 uppercase">{log.clienteNombre || 'Cliente'}</span>
                        <span className="text-[10px] font-bold text-slate-400">+{log.clienteTelefono}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-400 bg-slate-50">
                      {log.tipo || 'Servicio'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-5 text-center">
                    <Badge className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-md", log.estado === 'enviado' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>
                      {log.estado === 'enviado' ? 'EXITOSO' : 'FALLIDO'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {logsLoading && (
                <TableRow><TableCell colSpan={4} className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
