
'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Map as MapIcon,
  User,
  ArrowRight,
  Info,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Envio } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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

// ── MOCK DATA ACTUALIZADO ────────────────────────────────────────────────
const MOCK_ENVIO: Partial<Envio> = {
  id: 'preview',
  consecutivo: '#ENV-9999',
  origen: "Calle 100 # 15-20, Bogotá",
  destino: "Cra 7 # 72-41, Bogotá",
  descripcion: "Laptop Dell XPS 15 y Documentos Confidenciales",
  nombre_remitente: "María Fernanda López",
  nombre_recibe: "Carlos Alberto Gómez",
  security_pin: "1234",
  estado: 'programado',
  fotoRecoleccionUrl: "https://picsum.photos/seed/envio1/600/400",
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

  // Estados de Flujo
  const [fase, setFase] = useState<'manifiesto' | 'navegacion'>('manifiesto');
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Mapa
  const [driverLocation, setDriverLocation] = useState<google.maps.LatLngLiteral | null>(
    isPreview ? MOCK_COORDS.origen : null
  );
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(isPreview ? '12 min' : null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES
  });

  // Referencia a Firestore
  const envioRef = useMemoFirebase(() => 
    (!isPreview && id) ? doc(db, 'envios', id) : null, 
  [db, id, isPreview]);

  const { data: firestoreEnvio, isLoading: loadingEnvio } = useDoc<Envio>(envioRef);
  const envio = isPreview ? MOCK_ENVIO as Envio : firestoreEnvio;

  // Wake Lock
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try { if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen'); } catch (err) {}
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release().catch(() => {}); };
  }, []);

  // Seguimiento GPS (Solo en fase navegación)
  useEffect(() => {
    if (isPreview || !id || !db || !envio || fase !== 'navegacion') return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverLocation(newPos);
        if (envioRef) {
          updateDoc(envioRef, {
            lastLat: newPos.lat,
            lastLng: newPos.lng,
            lastSpeed: pos.coords.speed || 0,
            lastUpdate: serverTimestamp(),
            estado: 'en_transito'
          }).catch(() => {});
        }
      },
      (err) => {
        if (err.code === 1) setError('Activa el GPS en la configuración.');
        else setError('Buscando señal GPS...');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, db, envio, envioRef, isPreview, fase]);

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
        toast({ title: "PIN Verificado", description: "Ruta iniciada correctamente." });
        setFase('navegacion');
      } else {
        toast({ variant: "destructive", title: "PIN Inválido", description: "Código incorrecto." });
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
        toast({ title: "Modo Simulador", description: "Envío entregado exitosamente." });
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
        toast({ title: "Servicio Finalizado", description: "Entrega registrada." });
        router.push('/dashboard/custodia/envios');
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cerrar el servicio." });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!isPreview && ((loadingEnvio && !isPreview) || !isLoaded)) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F3F4F6]">
      <Loader2 className="h-10 w-10 animate-spin text-[#1F3864] mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando Manifiesto Nova...</p>
    </div>
  );

  if (!envio && !isPreview) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-[#F3F4F6]">
      <AlertTriangle className="h-16 w-16 text-rose-500 mb-4" />
      <h1 className="text-xl font-black uppercase text-[#1F3864]">Envío no encontrado</h1>
    </div>
  );

  // ── RENDER FASE 1: MANIFIESTO ───────────────────────────────────────────
  if (fase === 'manifiesto') {
    return (
      <div className="min-h-screen w-full bg-[#F3F4F6] flex flex-col">
        <header className="p-6 bg-[#1F3864] text-white shrink-0">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Manifiesto de Custodia</p>
            <Badge className="bg-orange-500 text-white font-black text-[9px] uppercase border-none h-5">Programado</Badge>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">{envio.consecutivo}</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {/* Tarjeta de Ruta */}
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
             <div className="p-6 space-y-8">
                <div className="flex gap-4 relative">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-4 border-emerald-500 bg-white z-10" />
                    <div className="w-0.5 flex-1 bg-slate-100 border-dashed border-l-2" />
                    <div className="w-4 h-4 rounded-full border-4 border-rose-500 bg-white z-10" />
                  </div>
                  <div className="flex-1 space-y-8">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest leading-none">Punto de Recogida</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{envio.origen}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase italic">Entrega: {envio.nombre_remitente}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-rose-600 tracking-widest leading-none">Punto de Entrega</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{envio.destino}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase italic">Recibe: {envio.nombre_recibe}</p>
                    </div>
                  </div>
                </div>
             </div>
          </Card>

          {/* Tarjeta de Paquete */}
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#1F3864]">
                <Package className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Descripción de la Carga</p>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">{envio.descripcion}</p>
              
              {envio.fotoRecoleccionUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 mt-4">
                   <Image 
                    src={envio.fotoRecoleccionUrl} 
                    alt="Paquete" 
                    fill 
                    className="object-cover"
                    data-ai-hint="package photo"
                   />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Acciones Inferiores (PIN o Botón) */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t rounded-t-[2.5rem] shadow-2xl z-50">
           {!showPinInput ? (
             <Button 
               onClick={() => setShowPinInput(true)}
               className="w-full h-14 bg-[#1F3864] hover:bg-[#152a4a] text-white rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               Iniciar Ruta
               <ArrowRight className="h-5 w-5" />
             </Button>
           ) : (
             <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    <p className="text-[10px] font-black uppercase text-slate-800">PIN de Autorización</p>
                  </div>
                  <button onClick={() => setShowPinInput(false)} className="text-[10px] font-bold text-slate-400 uppercase">Cancelar</button>
                </div>
                <div className="flex justify-between gap-3 max-w-[240px] mx-auto">
                  {pin.map((digit, idx) => (
                    <Input
                      key={idx}
                      id={`pin-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      className="h-14 w-full text-center text-2xl font-black rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500"
                    />
                  ))}
                </div>
                {isPreview && <p className="text-[9px] text-orange-500 font-black text-center uppercase tracking-widest">Código Demo: 1234</p>}
             </div>
           )}
        </div>
      </div>
    );
  }

  // ── RENDER FASE 2: NAVEGACIÓN ───────────────────────────────────────────
  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden relative">
      
      {/* MAPA FULL SCREEN */}
      <div className="absolute inset-0 z-0">
        {isPreview ? (
          <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-500 gap-4">
             <div className="p-8 rounded-full bg-slate-300 animate-pulse">
                <MapIcon className="h-16 w-16 text-slate-400" />
             </div>
             <div className="text-center space-y-1">
                <p className="text-xl font-black uppercase tracking-tight">🗺️ Modo Navegación</p>
                <p className="text-[10px] font-bold uppercase opacity-60">Rumbo a: {envio.destino}</p>
             </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={driverLocation || MOCK_COORDS.origen}
            zoom={16}
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
            <Marker position={driverLocation || MOCK_COORDS.origen} />
          </GoogleMap>
        )}
      </div>

      {/* OVERLAY: ETA INFO */}
      {eta && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-xs">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tiempo Estimado</p>
                <p className="text-xl font-black text-slate-800 leading-none font-mono">{eta}</p>
              </div>
            </div>
            <div className="text-right">
                <Badge className="bg-orange-500 text-white font-black uppercase text-[8px] h-5">En Ruta</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE: FINALIZAR */}
      <div className="absolute bottom-8 left-6 right-8 z-20">
        <div className="relative group">
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
            className="w-full h-16 bg-[#1F3864] hover:bg-[#152a4a] text-white rounded-[2rem] font-black uppercase text-sm shadow-2xl active:scale-95 transition-all border-4 border-white/20"
          >
            <label htmlFor="evidence" className="flex items-center justify-center gap-3 cursor-pointer">
              {isFinalizing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              Finalizar Entrega
            </label>
          </Button>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-32 left-8 right-8 z-50 bg-rose-600 text-white p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest shadow-2xl animate-bounce">
          <AlertTriangle className="h-4 w-4 inline mr-2" /> {error}
        </div>
      )}
    </div>
  );
}
