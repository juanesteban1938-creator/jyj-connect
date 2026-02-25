
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { obtenerEstadoWhatsApp, obtenerQR } from '@/lib/whatsapp';
import Image from 'next/image';

export default function WhatsAppStatusPage() {
  const [status, setStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
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
    setIsLoading(false);
  };

  useEffect(() => {
    checkStatus();
    // Auto-check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Estado de WhatsApp</h1>
        <p className="page-subtitle">Sincroniza y monitorea la conexión del bot de mensajería.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conexión del Servidor</CardTitle>
                <CardDescription>Estado actual de vinculación con WhatsApp.</CardDescription>
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
                  <Badge className="bg-green-100 text-green-800 border-green-200">CONECTADO</Badge>
                  <p className="mt-4 text-sm text-muted-foreground">El bot está operando correctamente y listo para enviar mensajes.</p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <Badge variant="destructive">DESCONECTADO</Badge>
                  <p className="mt-4 text-sm text-muted-foreground">La sesión de WhatsApp no está activa. Escanea el código QR para vincular.</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Información del Bot:</h4>
              <p className="text-xs text-muted-foreground">Servidor: {process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://focused-harmony-production.up.railway.app'}</p>
              <p className="text-xs text-muted-foreground">Protocolo: whatsapp-web.js (v1.23.0)</p>
            </div>
          </CardContent>
        </Card>

        {!status?.connected && (
          <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
            <CardHeader>
              <CardTitle>Vincular Dispositivo</CardTitle>
              <CardDescription>Escanea este código QR desde tu WhatsApp móvil.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              {qrCode ? (
                <div className="p-4 bg-white border-4 border-primary rounded-xl shadow-lg">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    width={300} 
                    height={300}
                    className="rounded-lg"
                  />
                </div>
              ) : (
                <div className="h-[300px] w-[300px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Esperando nuevo código QR...</p>
                  </div>
                </div>
              )}
              <div className="text-center max-w-xs">
                <p className="text-xs text-muted-foreground">
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
