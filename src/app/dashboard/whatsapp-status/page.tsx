'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, AlertCircle, PhoneIncoming, XCircle, QrCode } from 'lucide-react';
import { obtenerEstadoNova, obtenerQRNova } from '@/lib/whatsapp';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';

export default function WhatsAppStatusPage() {
  const [status, setStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'notificaciones_whatsapp'), 
      orderBy('fecha', 'desc'), 
      limit(10)
    );
  }, [firestore]);

  const { data: logs, isLoading: logsLoading, error: logsError } = useCollection(logsQuery);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await obtenerEstadoNova();
      setStatus(data);
      
      if (data && data.connected === false) {
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
      setStatus({ connected: false, error: 'No se pudo conectar con el servidor' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000); 
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Estado de Nova (Asistente Virtual)</h1>
        <p className="page-subtitle">Sincroniza WhatsApp y monitorea el historial de notificaciones de Transportes Especiales J&J.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Estado de Conexión</CardTitle>
                <CardDescription>Monitoreo en tiempo real de J&J Connect.</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={checkStatus} 
                disabled={isLoading}
                className={isLoading ? "animate-spin" : ""}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg">
              {status?.connected === true ? (
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <Badge className="bg-green-100 text-green-800 border-green-200 font-bold uppercase">CONECTADA</Badge>
                  <p className="mt-4 text-sm text-muted-foreground font-medium">El bot está operando correctamente y listo para notificar.</p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <Badge variant="destructive" className="font-bold uppercase">DESCONECTADO</Badge>
                  <p className="mt-4 text-sm text-muted-foreground font-medium">La sesión de WhatsApp no está activa. Escanea el código QR para vincular.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {status?.connected === false && (
          <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none border-primary/20">
            <CardHeader>
              <CardTitle>Vincular Dispositivo</CardTitle>
              <CardDescription>Escanea este código desde WhatsApp {'>'} Dispositivos vinculados.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-full pb-10">
              {qrCode ? (
                <div className="relative p-4 bg-white border-2 border-primary/20 rounded-xl shadow-inner">
                  <Image 
                    src={qrCode} 
                    alt="QR Code" 
                    width={250} 
                    height={250} 
                    className="rounded-lg"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                    <QrCode className="h-32 w-32" />
                  </div>
                </div>
              ) : (
                <div className="h-[250px] w-[250px] flex flex-col items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <PhoneIncoming className="h-12 w-12 opacity-20 mb-2" />
                  <p className="text-xs text-muted-foreground font-bold">Generando código QR...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
        <CardHeader>
            <CardTitle className="text-lg">Historial de Notificaciones</CardTitle>
            <CardDescription>Últimos intentos de envío realizados por Nova.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="p-4">FECHA Y HORA</TableHead>
              <TableHead className="p-4">CLIENTE</TableHead>
              <TableHead className="p-4">SERVICIO (RUTA)</TableHead>
              <TableHead className="p-4 text-center">ESTADO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsError ? (
              <TableRow>
                <TableCell colSpan={4} className="p-8 text-center text-red-500">
                  <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                  Error al cargar el historial.
                </TableCell>
              </TableRow>
            ) : logs?.map((log: any) => (
              <TableRow key={log.id} className="hover:bg-muted/30">
                <TableCell className="p-4 text-xs font-medium">
                    {log.fecha ? format(log.fecha.toDate(), 'dd/MM/yy HH:mm') : 'Pendiente'}
                </TableCell>
                <TableCell className="p-4">
                  <div className="font-bold text-sm">{log.clienteNombre}</div>
                  <div className="text-[10px] text-muted-foreground">{log.clienteTelefono}</div>
                </TableCell>
                <TableCell className="p-4 text-xs">
                  <span className="text-green-600 font-bold">{log.origen}</span> ➔ <span className="text-red-600 font-bold">{log.destino}</span>
                </TableCell>
                <TableCell className="p-4 text-center">
                  {log.estado === 'enviado' ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> ENVIADO
                    </Badge>
                  ) : (
                    <Badge variant="destructive" title={log.error}>
                      <XCircle className="mr-1 h-3 w-3" /> ERROR
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!logs || logs.length === 0) && !logsLoading && !logsError && (
              <TableRow>
                <TableCell colSpan={4} className="p-8 text-center text-muted-foreground">No hay registros de notificaciones.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
