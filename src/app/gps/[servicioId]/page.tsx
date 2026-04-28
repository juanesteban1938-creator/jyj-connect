'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Navigation, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * J&J CONNECT - NOVA TRACKER (PÁGINA PÚBLICA)
 * Versión de Seguridad Crítica: Protegida contra fallos de hidratación y crashes en In-App Browsers.
 */
export default function GPSPage() {
  const params = useParams();
  const servicioId = params?.servicioId as string;
  const db = useFirestore();
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{ lat: number; lng: number } | null>(null);

  // Sincronización segura de datos (Referencia memoizada)
  const servicioRef = useMemoFirebase(() => {
    if (!db || !servicioId) return null;
    try {
      return doc(db, 'services', servicioId);
    } catch (e) {
      return null;
    }
  }, [db, servicioId]);

  const { data: servicio, isLoading: loadingServicio } = useDoc(servicioRef);

  // Escudo 1: Wake Lock protegido (Exclusivo en useEffect)
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

  // Escudo 2: Geolocation robusta (Exclusivo en useEffect)
  useEffect(() => {
    if (typeof window === 'undefined' || !db || !servicioId || !servicio) return;

    let intervalId: any;

    const updatePosition = () => {
      if (!navigator || !('geolocation' in navigator)) {
        setError('Navegador no compatible. Abre este link en Google Chrome.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsActive(true);
          setError(null);
          setLocationInfo({ lat: position.coords.latitude, lng: position.coords.longitude });

          // Sincronización silenciosa con Firestore
          const gpsRef = doc(db, 'ubicaciones_gps', servicioId);
          setDoc(gpsRef, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            velocidad: position.coords.speed || 0,
            precision: position.coords.accuracy,
            conductorNombre: servicio.conductor || 'No asignado',
            servicioId,
            activo: true,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch((err) => {
            console.error('[Tracker] Firestore error:', err.message);
          });
        },
        (err) => {
          setIsActive(false);
          if (err.code === 1) {
            setError('PERMISO DENEGADO. Por favor activa el GPS en tu celular.');
          } else {
            setError('Error buscando señal GPS. Sal a un lugar abierto.');
          }
        },
        { 
          enableHighAccuracy: true,
          timeout: 15000,
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

  // Pantallas de Estado Seguro
  if (loadingServicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Sincronizando Sistema...</p>
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-red-950 text-white p-8 text-center gap-4">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none italic">Enlace Inválido</h1>
          <p className="text-sm opacity-70 font-medium">El servicio ha expirado o no existe.</p>
        </div>
      </div>
    );
  }

  // Escudo 3: Renderizado forzado de primitivos
  const conductorName = String(servicio.conductor || 'Personal Externo');
  const destinationName = String(servicio.destino || 'Destino en curso');

  return (
    <div className={cn(
      "h-screen w-full flex flex-col items-center justify-center p-6 text-white transition-all duration-1000 overflow-hidden",
      isActive ? "bg-[#064e3b]" : "bg-[#450a0a]"
    )}>
      {/* Radar de Fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-[40px] animate-ping",
          isActive ? "border-green-400" : "border-red-400"
        )} />
      </div>

      <div className="relative z-10 max-w-sm w-full flex flex-col gap-10 text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className={cn(
              "p-8 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl transition-transform duration-700",
              isActive ? "scale-110" : "scale-90"
            )}>
              <Navigation className={cn("h-16 w-16 transition-colors", isActive ? "text-green-400" : "text-white/20")} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter leading-none italic uppercase">
              {isActive ? "Rastreo On-Air" : "Esperando GPS"}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Nova Connection Protocol</p>
          </div>
        </div>

        {/* Datos del Trayecto */}
        <div className="bg-black/50 backdrop-blur-3xl rounded-[40px] p-8 space-y-6 border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Conductor</p>
            <p className="text-xl font-black uppercase leading-tight truncate">{conductorName}</p>
          </div>
          
          <div className="h-px bg-white/10 mx-auto w-1/2" />

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Hacia</p>
            <p className="text-lg font-bold opacity-90 leading-tight line-clamp-2">{destinationName}</p>
          </div>

          {locationInfo && (
            <div className="pt-2 text-[9px] opacity-20 font-mono tracking-tighter">
              LAT: {locationInfo.lat.toFixed(6)} | LNG: {locationInfo.lng.toFixed(6)}
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
          <p className="text-[9px] opacity-50 uppercase font-black tracking-[0.2em] leading-relaxed px-4">
            Mantén esta ventana abierta y el celular encendido para emitir tu ubicación.
          </p>
        </div>

        {error && (
          <div className="bg-orange-600/90 border border-orange-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xl animate-bounce">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
