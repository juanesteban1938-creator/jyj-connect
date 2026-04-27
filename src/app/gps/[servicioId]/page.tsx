'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * J&J CONNECT - NOVA TRACKER (PÁGINA PÚBLICA)
 * Versión corregida: Escudo contra client-side exceptions en In-App Browsers.
 */
export default function GPSPage() {
  const params = useParams();
  const servicioId = params?.servicioId as string;
  const db = useFirestore();
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{ lat: number; lng: number } | null>(null);

  // Escudo 1: Sincronización segura de datos
  const servicioRef = useMemoFirebase(() => {
    if (!db || !servicioId) return null;
    try {
      return doc(db, 'services', servicioId);
    } catch (e) {
      console.error('Error creando referencia:', e);
      return null;
    }
  }, [db, servicioId]);

  const { data: servicio, isLoading: loadingServicio } = useDoc(servicioRef);

  // Escudo 2: Wake Lock con validación estricta de hidratación
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Error no crítico: el dispositivo simplemente entrará en reposo si falla
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Escudo 3: Geolocation robusta para navegadores de WhatsApp/Facebook
  useEffect(() => {
    // Validar que estemos en el cliente y tengamos los datos mínimos
    if (typeof window === 'undefined' || !db || !servicioId || !servicio) return;

    let intervalId: any;

    const updatePosition = () => {
      // Validación estricta de API en navegadores antiguos o In-App
      if (!navigator || !('geolocation' in navigator)) {
        setError('Tu navegador no soporta GPS. Abre este link en Chrome o Safari.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsActive(true);
          setError(null);
          setLocationInfo({ lat: position.coords.latitude, lng: position.coords.longitude });

          // Sincronización silenciosa con la nube
          const gpsRef = doc(db, 'ubicaciones_gps', servicioId);
          setDoc(gpsRef, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            velocidad: position.coords.speed || 0,
            precision: position.coords.accuracy,
            conductorNombre: servicio.conductor || 'Externo',
            servicioId,
            activo: true,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch((err) => {
            console.error('[Tracker] Sync error:', err.message);
          });
        },
        (err) => {
          setIsActive(false);
          if (err.code === 1) {
            setError('PERMISO DENEGADO. Activa el GPS en la configuración de tu celular.');
          } else {
            setError('Error buscando señal GPS. Asegúrate de estar en un lugar abierto.');
          }
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    updatePosition();
    intervalId = setInterval(updatePosition, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [servicio, servicioId, db]);

  // Pantallas de Estado
  if (loadingServicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Sincronizando Enlace...</p>
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-red-950 text-white p-8 text-center gap-4">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Acceso No Válido</h1>
          <p className="text-sm opacity-70 font-medium">El servicio no existe o el enlace ha caducado.</p>
        </div>
      </div>
    );
  }

  // Escudo 4: Prevención de renderizado de objetos
  const conductorSafe = String(servicio.conductor || 'No asignado');
  const destinoSafe = String(servicio.destino || 'Sin definir');

  return (
    <div className={cn(
      "h-screen w-full flex flex-col items-center justify-center p-6 text-white transition-all duration-700 overflow-hidden",
      isActive ? "bg-[#064e3b]" : "bg-[#7f1d1d]"
    )}>
      {/* Radar de Fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[60px] animate-ping",
          isActive ? "border-green-400" : "border-red-400"
        )} />
      </div>

      <div className="relative z-10 max-w-sm w-full flex flex-col gap-12 text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className={cn(
              "p-8 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl transition-transform duration-500",
              isActive ? "scale-110" : "scale-100"
            )}>
              <Navigation className={cn("h-20 w-20 transition-colors", isActive ? "text-green-400" : "text-white opacity-30")} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter leading-none italic uppercase">
              {isActive ? "Rastreo Activo" : "Rastreo Pausado"}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">J&J Connect Nova System</p>
          </div>
        </div>

        {/* Datos del Trayecto */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-[40px] p-8 space-y-6 border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Operador</p>
            <p className="text-2xl font-black uppercase leading-tight truncate">{conductorSafe}</p>
          </div>
          
          <div className="h-px bg-white/10 mx-auto w-1/2" />

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Ruta a Destino</p>
            <p className="text-lg font-bold opacity-90 leading-tight">{destinoSafe}</p>
          </div>

          {locationInfo && (
            <div className="pt-2 text-[9px] opacity-30 font-mono tracking-tighter uppercase">
              LAT: {locationInfo.lat.toFixed(5)} | LNG: {locationInfo.lng.toFixed(5)}
            </div>
          )}
        </div>

        {/* Instrucción Crítica */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 animate-pulse">
            <p className="text-3xl font-black text-orange-500 leading-none tracking-tighter">
              ⚠️ NO CIERRES
            </p>
            <p className="text-xl font-black text-white italic tracking-widest uppercase">ESTA PANTALLA</p>
          </div>
          <p className="text-[9px] opacity-50 uppercase font-black tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed">
            La transmisión se detendrá si sales del navegador o bloqueas el celular.
          </p>
        </div>

        {error && (
          <div className="bg-red-600/50 border border-red-500/50 p-4 rounded-2xl text-[11px] font-black uppercase tracking-wider backdrop-blur-md animate-bounce">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}