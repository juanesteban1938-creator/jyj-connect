'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * J&J CONNECT - NOVA TRACKER (PÁGINA PÚBLICA)
 * Esta página permite al conductor transmitir su ubicación GPS en tiempo real.
 * Diseñada para máxima visibilidad y prevención de suspensión de pantalla.
 */
export default function GPSPage() {
  const params = useParams();
  const servicioId = params?.servicioId as string;
  const db = useFirestore();
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{ lat: number; lng: number } | null>(null);

  // Consulta los detalles básicos del servicio (Conductor y Destino)
  const servicioRef = useMemoFirebase(() => {
    if (!db || !servicioId) return null;
    return doc(db, 'services', servicioId);
  }, [db, servicioId]);

  const { data: servicio, isLoading: loadingServicio } = useDoc(servicioRef);

  // Wake Lock API: Mantiene la pantalla encendida mientras la pestaña esté activa
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('[WakeLock] No se pudo activar:', err);
      }
    };

    requestWakeLock();

    // Re-activar Wake Lock cuando el usuario vuelve a la pestaña
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Lógica de monitoreo GPS y envío a Firestore cada 10 segundos
  useEffect(() => {
    if (!servicio || !servicioId || !db) return;

    let intervalId: any;

    const updatePosition = () => {
      if (!navigator.geolocation) {
        setError('GPS no soportado en este dispositivo.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsActive(true);
          setError(null);
          setLocationInfo({ lat: position.coords.latitude, lng: position.coords.longitude });

          // Sincronización en tiempo real con la nube
          const gpsRef = doc(db, 'ubicaciones_gps', servicioId);
          setDoc(gpsRef, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            velocidad: position.coords.speed || 0,
            precision: position.coords.accuracy,
            conductorNombre: servicio.conductor,
            servicioId,
            activo: true,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch((err) => {
            console.error('[Tracker] Error al guardar ubicación:', err.message);
          });
        },
        (err) => {
          setIsActive(false);
          setError('Señal de GPS perdida. Revisa los permisos de ubicación.');
          console.error('[Geolocation] Error:', err);
        },
        { 
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        }
      );
    };

    // Inicio inmediato y recurrente
    updatePosition();
    intervalId = setInterval(updatePosition, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [servicio, servicioId, db]);

  // Pantalla de carga inicial
  if (loadingServicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Iniciando Enlace GPS...</p>
      </div>
    );
  }

  // Error si el servicio no existe
  if (!servicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-red-950 text-white p-8 text-center gap-4">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Acceso Denegado</h1>
          <p className="text-sm opacity-70 font-medium">El enlace de rastreo no es válido o ha expirado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-screen w-full flex flex-col items-center justify-center p-6 text-white transition-all duration-700 overflow-hidden",
      isActive ? "bg-[#064e3b]" : "bg-[#7f1d1d]"
    )}>
      {/* Animación de pulso radial para el radar */}
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
              {isActive ? "GPS ACTIVO" : "GPS INACTIVO"}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">J&J Connect Real-Time</p>
          </div>
        </div>

        {/* Panel de Datos del Conductor */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-[40px] p-8 space-y-6 border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Conductor</p>
            <p className="text-2xl font-black uppercase leading-tight truncate">{servicio.conductor}</p>
          </div>
          
          <div className="h-px bg-white/10 mx-auto w-1/2" />

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Destino</p>
            <p className="text-lg font-bold opacity-90 leading-tight">{servicio.destino}</p>
          </div>

          {locationInfo && (
            <div className="pt-2 text-[9px] opacity-30 font-mono tracking-tighter uppercase">
              Coord: {locationInfo.lat.toFixed(5)} / {locationInfo.lng.toFixed(5)}
            </div>
          )}
        </div>

        {/* Instrucciones de Seguridad */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 animate-pulse">
            <p className="text-3xl font-black text-orange-500 leading-none tracking-tighter">
              ⚠️ NO CIERRES
            </p>
            <p className="text-xl font-black text-white italic tracking-widest uppercase">ESTA PANTALLA</p>
          </div>
          <p className="text-[9px] opacity-50 uppercase font-black tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed">
            El monitoreo se detendrá automáticamente si sales de esta pestaña
          </p>
        </div>

        {error && (
          <div className="bg-red-600/40 border border-red-500/50 p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
