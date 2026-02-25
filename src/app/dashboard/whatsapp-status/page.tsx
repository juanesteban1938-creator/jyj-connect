'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { obtenerEstadoWhatsApp, obtenerQR } from '@/lib/whatsapp';

export default function WhatsAppStatusPage() {
  const [status, setStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const data = await obtenerEstadoWhatsApp();
      setStatus(data);
      
      if (data && !data.connected) {
        const qrData = await obtenerQR();
        if (qrData && qrData.qr) {
          setQrCode(qrData.qr);
        } else {
          setQrCode(null);
        }
      } else {
        setQrCode(null);
      }
    } catch (err) {
      setStatus({ connected: false, error: 'No se pudo conectar con el servidor del bot' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Auto-check status every 20 seconds
    const interval = setInterval(checkStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Estado del Asistente Virtual (Nova)</h1>
        <p className="page-subtitle">Sincroniza WhatsApp para enviar notificaciones automáticas a tus clientes.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Estado de Conexión</CardTitle>
                <CardDescription>Monitoreo del bot de mensajería J&J.</CardDescription>
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
              {status?.connected ? (
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <Badge className="bg-green-100 text-green-800 border-green-200">NOVA CONECTADA</Badge>
                  <p className="mt-4 text-sm text-muted-foreground font-medium">El bot está operando correctamente y listo para notificar.</p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <Badge variant="destructive">DESCONECTADO</Badge>
                  <p className="mt-4 text-sm text-muted-foreground font-medium">La sesión de WhatsApp no está activa. Escanea el código QR para vincular.</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2 p-4 border rounded-md bg-primary/5">
              <h4 className="text-sm font-bold">Información de Nova:</h4>
              <p className="text-xs text-muted-foreground">Servidor: <span className="font-code">{process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'focused-harmony-production.up.railway.app'}</span></p>
              <p className="text-xs text-muted-foreground">Motor: <span className="font-code">whatsapp-web.js (v1.23.0)</span></p>
              <p className="text-xs text-muted-foreground">Estado: <span className="font-bold">{status?.connected ? 'Activo' : 'Pendiente de vinculación'}</span></p>
            </div>
          </CardContent>
        </Card>

        {!status?.connected && (
          <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none border-primary/20 bg-white">
            <CardHeader>
              <CardTitle>Vincular Dispositivo</CardTitle>
              <CardDescription>Escanea este código QR desde tu WhatsApp móvil para activar a Nova.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-6">
              {qrCode ? (
                <div className="p-4 bg-white border-4 border-primary rounded-xl shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    width={280} 
                    height={280}
                    className="rounded-lg"
                  />
                </div>
              ) : (
                <div className="h-[280px] w-[280px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Esperando nuevo código QR...</p>
                  </div>
                </div>
              )}
              <div className="text-center max-w-xs bg-muted/50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-700">
                  Instrucciones:
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Abre WhatsApp en tu teléfono {'>'} Dispositivos vinculados {'>'} Vincular un dispositivo.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
