'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  GoogleMap, 
  useJsApiLoader, 
  DirectionsService, 
  DirectionsRenderer, 
  TrafficLayer,
  Marker 
} from '@react-google-maps/api';
import { 
  Navigation, 
  Package, 
  ShieldCheck, 
  Camera, 
  Loader2, 
  AlertTriangle,
  Clock,
  Lock,
  ShieldAlert,
  Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Envio } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["geometry"];

const mapStyles = [
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
  { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }] },
  { "featureType": "road.highway", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
  { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#cad2d3" }, { "visibility": "on" }] }
];

// ── MOCK DATA PARA PRUEBAS ────────────────────────────────────────────────
const MOCK_ENVIO: Partial<Envio> = {
  id: 'preview',
  consecutivo: '#PRV-9999',
  origen: "Calle 100 # 15-20, Bogotá",
  destino: "Cra 7 # 72-41, Bogotá",
  descripcion: "Laptop Dell XPS 15 y Documentos Confidenciales",
  security_pin: "1234",
  estado: 'en_transito',
  clienteNombre: 'Cliente de Prueba Nova',
};

const MOCK_COORDS = {
  origen: { lat: 4.6853, lng: -74.0531 },
  destino: { lat: 4.6565, lng: -74.0573 }
};

export default function ConductorEnvioCustodiaPage() {
  const params = useParams();
  const id = params?.id as string;
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const isPreview = id === 'preview';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Estado para la ubicación en vivo del conductor (Auto-centrado estilo Waze)
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral | null>(
    isPreview ? MOCK_COORDS.origen : null
  );
  
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(isPreview ? '12 min' : null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [isPinValid, setIsPinValid] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES
  });

  // 1. Referencia a Firestore (Solo si no es preview)
  const envioRef = useMemoFirebase(() => 
    (!isPreview && id) ? doc(db, 'envios', id) : null, 
  [db, id, isPreview]);

  const { data: firestoreEnvio, isLoading: loadingEnvio } = useDoc<Envio>(envioRef);

  // Unificamos el objeto de envío (Firestore o Mock)
  const envio = isPreview ? MOCK_ENVIO as Envio : firestoreEnvio;

  // 2. Wake Lock para evitar reposo (Protocolo de Conducción)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release().catch(() => {}); };
  }, []);

  // 3. Seguimiento de posición activa con AUTO-CENTRADO
  useEffect(() => {
    if (isPreview || !id || !db || !envio) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(newPos); // Actualiza estado local para el mapa
        
        if (envioRef) {
          // Sincroniza ubicación con la central
          updateDoc(envioRef, {
            lastLat: newPos.lat,
            lastLng: newPos.lng,
            lastSpeed: pos.coords.speed || 0,
            lastUpdate: serverTimestamp()
          }).catch(() => {});
        }
      },
      (err) => {
        if (err.code === 1) setError('Activa el GPS en la configuración de tu celular.');
        else setError('Buscando señal GPS...');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, db, envio, envioRef, isPreview]);

  // 4. Callback para cálculo de ruta
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirections(result);
      const route = result.routes[0];
      if (route && route.legs[0]) {
        setEta(route.legs[0].duration_in_traffic?.text || route.legs[0].duration?.text || 'Calculando...');
      }
    }
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/[0-9]/.test(value) && value !== '') return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    const fullPin = newPin.join('');
    if (fullPin.length === 4) {
      const correctPin = envio?.security_pin || '1234';
      if (fullPin === correctPin) {
        setIsPinValid(true);
        toast({ title: "PIN Verificado", description: "Protocolo de seguridad superado." });
      } else {
        toast({ variant: "destructive", title: "PIN Inválido", description: "Código de entrega incorrecto." });
        setPin(['', '', '', '']);
        const firstInput = document.getElementById('pin-0');
        if (firstInput) firstInput.focus();
      }
    }
  };

  const handleFinalize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsFinalizing(true);
    
    if (isPreview) {
      setTimeout(() => {
        toast({ title: "Modo Simulador", description: "Envío finalizado exitosamente (Simulado)." });
        setIsFinalizing(false);
        router.push('/dashboard/custodia/envios');
      }, 1500);
      return;
    }

    try {
      if (envioRef) {
        await updateDoc(envioRef, {
          estado: 'entregado',
          fechaEntrega: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast({ title: "Servicio Finalizado", description: "Envío entregado con éxito." });
        router.push('/dashboard/custodia/envios');
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cerrar el servicio." });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Validaciones de Carga
  if (!isPreview && (!apiKey || apiKey === 'tu_clave_aqui' || loadError)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h3 className="text-lg font-black uppercase text-slate-800 mb-2">Error de Configuración</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">Error en Google Maps API Key.</p>
      </div>
    );
  }

  if (!isPreview && ((loadingEnvio && !isPreview) || !isLoaded)) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F3F4F6]">
      <Loader2 className="h-10 w-10 animate-spin text-[#1F3864] mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consola de Navegación Nova...</p>
    </div>
  );

  if (!envio && !isPreview) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-[#F3F4F6]">
      <AlertTriangle className="h-16 w-16 text-rose-500 mb-4" />
      <h1 className="text-xl font-black uppercase text-[#1F3864]">Envío no encontrado</h1>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      
      {/* SECCIÓN SUPERIOR: GOOGLE MAPS (75% ALTURA) */}
      <div className="h-[75vh] relative">
        {isPreview ? (
          <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-500 gap-4">
             <div className="p-6 rounded-full bg-slate-300 animate-pulse">
                <MapIcon className="h-12 w-12 text-slate-400" />
             </div>
             <p className="text-xl font-black uppercase tracking-tight">🗺️ Mapa Simulado (Preview)</p>
             <p className="text-[10px] font-bold uppercase opacity-60">Rumbo a: {envio.destino}</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={driverLocation || MOCK_COORDS.origen} // Auto-centrado vinculado a la ubicación en vivo
            zoom={15}
            options={{
              disableDefaultUI: true,
              styles: mapStyles
            }}
          >
            <TrafficLayer />
            <DirectionsService
              options={{
                origin: driverLocation || MOCK_COORDS.origen,
                destination: envio.destino,
                travelMode: 'DRIVING' as any,
                provideRouteAlternatives: true,
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: 'bestguess' as any
                }
              }}
              callback={directionsCallback}
            />
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
            
            {/* Marcador del Conductor */}
            <Marker 
              position={driverLocation || MOCK_COORDS.origen} 
              icon={{
                path: 0, // SymbolPath.FORWARD_CLOSED_ARROW
                scale: 6,
                fillColor: "#1F3864",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF"
              }}
            />
          </GoogleMap>
        )}

        {/* ETA FLOATING CARD */}
        {eta && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[85%] max-w-xs">
            <div className="bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#F3F4F6] text-[#1F3864] rounded-lg">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400">Llegada</p>
                  <p className="text-base font-black text-slate-800 leading-none font-mono">{eta}</p>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white font-black uppercase text-[7px] h-4">En Ruta</Badge>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN INFERIOR: PANEL OPERATIVO COMPACTO (25% ALTURA) */}
      <div className="flex-1 bg-white border-t rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] z-20 px-6 pt-4 pb-6 flex flex-col overflow-hidden">
        <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-4 shrink-0" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <header className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none">Custodia J&J</p>
                <h2 className="text-base font-black text-[#1F3864] uppercase">{envio.consecutivo}</h2>
              </div>
              <Badge variant="outline" className="border-slate-100 text-[8px] font-black uppercase">Activo</Badge>
            </header>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2">
              <Package className="h-4 w-4 text-[#1F3864] shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-slate-600 leading-tight line-clamp-2">{envio.descripcion}</p>
            </div>

            {/* PROTOCOLO DE PIN Y CIERRE */}
            <div className="space-y-4">
              {!isPinValid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-orange-500" />
                    <p className="text-[10px] font-black uppercase text-slate-800">PIN de Entrega</p>
                  </div>
                  <div className="flex justify-between gap-2 max-w-[200px] mx-auto">
                    {pin.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`pin-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        className="h-10 w-full text-center text-lg font-black rounded-lg bg-slate-50 border-slate-200 focus:ring-1 focus:ring-[#B8860B]"
                      />
                    ))}
                  </div>
                  {isPreview && <p className="text-[8px] text-orange-500 font-black text-center uppercase">PIN Mock: 1234</p>}
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100 mb-3">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-[9px] font-black uppercase">PIN Correcto. Capture evidencia.</p>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      id="evidence" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={handleFinalize}
                      disabled={isFinalizing}
                    />
                    <Button 
                      asChild 
                      className="w-full h-12 bg-[#1F3864] hover:bg-[#152a4a] text-white rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
                    >
                      <label htmlFor="evidence" className="flex items-center justify-center gap-2 cursor-pointer">
                        {isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        Finalizar Entrega
                      </label>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-32 left-8 right-8 z-50 bg-rose-600 text-white p-3 rounded-xl text-center text-[9px] font-black uppercase tracking-widest shadow-2xl animate-bounce">
          <AlertTriangle className="h-3 w-3 inline mr-2" /> {error}
        </div>
      )}
    </div>
  );
}
