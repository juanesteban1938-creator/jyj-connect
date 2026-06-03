
'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  ArrowRight,
  ShieldAlert,
  Info,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SeguridadPage() {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResetPassword = async () => {
    if (!user?.email) {
      console.error('Seguridad: No se encontró correo de usuario.');
      toast({
        variant: "destructive",
        title: "Error de sesión",
        description: "No se pudo identificar tu correo electrónico.",
      });
      return;
    }

    setIsSending(true);
    console.log(`[Seguridad] Iniciando proceso para: ${user.email}`);
    
    try {
      // Intentamos enviar el correo usando la configuración nativa
      await sendPasswordResetEmail(auth, user.email);
      
      console.log('[Seguridad] Firebase aceptó la solicitud correctamente.');
      toast({
        title: "Enlace Enviado",
        description: `Se ha enviado un enlace a ${user.email}. Por favor, revisa tu bandeja de entrada y la carpeta de SPAM.`,
      });
    } catch (error: any) {
      console.error('[Seguridad] Error detallado de Firebase Auth:', {
        code: error.code,
        message: error.message
      });

      let mensaje = "No se pudo enviar el correo. Intenta de nuevo más tarde.";
      
      if (error.code === 'auth/unauthorized-domain') {
        mensaje = "Dominio no autorizado en la consola de Firebase.";
      } else if (error.code === 'auth/too-many-requests') {
        mensaje = "Demasiadas solicitudes. Espera unos minutos.";
      }

      toast({
        variant: "destructive",
        title: "Fallo en el envío",
        description: mensaje,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-orange-500 rounded-full" />
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Seguridad de Acceso</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium mt-1">Gestione sus credenciales y la integridad de su cuenta de administrador.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info lateral y Guía de Ayuda */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-100/50 p-6 rounded-[2rem] border border-slate-200">
            <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm">
              <ShieldAlert className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-700 mb-2">Protocolo Nova</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Por su seguridad, J&J Connect utiliza el estándar de encriptación de Firebase. El cambio de contraseña requiere validación directa desde su bandeja de entrada.
            </p>
          </div>
          
          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 text-blue-700">
            <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-tight">¿No llega el correo?</span>
            </div>
            <ul className="text-[10px] space-y-2 font-medium leading-relaxed">
              <li className="flex gap-2">
                <span className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">1</span>
                Revisa la carpeta de <b>SPAM</b> o No deseado.
              </li>
              <li className="flex gap-2">
                <span className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">2</span>
                Verifica en la Consola de Firebase que el dominio <b>firebaseapp.com</b> esté autorizado.
              </li>
              <li className="flex gap-2">
                <span className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">3</span>
                Asegúrate de que las plantillas de correo estén activas en Firebase Auth.
              </li>
            </ul>
          </div>
        </div>

        {/* Tarjeta de Acción */}
        <Card className="md:col-span-2 rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Cambiar Contraseña</CardTitle>
                <CardDescription className="text-xs font-bold uppercase text-slate-400 tracking-wider">Acción de Alta Seguridad</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 pt-6 space-y-8">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border shadow-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Correo Vinculado</p>
                    <p className="text-sm font-black text-slate-700">{user?.email || 'Consultando sesión...'}</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-400">
                  Principal
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Al hacer clic en el botón inferior, el sistema le enviará un correo electrónico oficial de **Transportes Especiales J&J** con las instrucciones necesarias para establecer una nueva clave.
              </p>
              
              <Button 
                onClick={handleResetPassword}
                disabled={isSending}
                className={cn(
                  "w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                  "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200",
                  "flex items-center justify-center gap-3"
                )}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    PROCESANDO SOLICITUD...
                  </>
                ) : (
                  <>
                    Solicitar Cambio de Contraseña
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">J&J Security Engine — 2026</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
