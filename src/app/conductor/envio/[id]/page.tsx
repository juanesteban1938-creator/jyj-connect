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
  CheckCircle2,
  Lock,
  MapPin,
  ChevronRight
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
  valorDeclarado: 4500000,
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

  const [currentPos, setCurrentPos] = useState<google.maps.LatLngLiteral | null>(
    isPreview ? MOCK_COORDS.origen : null
  );
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [isPinValid, setIsPinValid] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  // 1. Referencia a Firestore (Solo si no es preview)
  const envioRef = useMemoFirebase(() => 
    (!isPreview && id) ? doc(db, 'envios', id) : null, 
  [db, id, isPreview]);

  const { data: firestoreEnvio, isLoading: loadingEnvio } = useDoc<Envio>(envioRef);

  // Unificamos el objeto de envío (Firestore o Mock)
  const envio = isPreview ? MOCK_ENVIO as Envio : firestoreEnvio;

  // 2. Wake Lock para evitar reposo
  useEffect(() => {
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

  // 3. Seguimiento de posición activa (Solo si NO es preview)
  useEffect(() => {
    if (isPreview || !id || !db || !envio) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(newPos);
        
        if (envioRef) {
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

  if ((loadingEnvio && !isPreview) || !isLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F3F4F6]">
      <Loader2 className="h-10 w-10 animate-spin text-[#1F3864] mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consola de Navegación Nova...</p>
    </div>
  );

  if (!envio && !isPreview) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-[#F3F4F6]">
      <AlertTriangle className="h-16 w-16 text-rose-500 mb-4" />
      <h1 className="text-xl font-black uppercase text-[#1F3864]">Envío no encontrado</h1>
      <p className="text-sm text-slate-500 mt-2 italic">El enlace puede haber expirado.</p>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* SECCIÓN SUPERIOR: GOOGLE MAPS */}
      <div className="h-[60vh] sm:h-[65vh] relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={currentPos || MOCK_COORDS.origen}
          zoom={15}
          options={{
            disableDefaultUI: true,
            styles: mapStyles
          }}
        >
          <TrafficLayer />
          <DirectionsService
            options={{
              origin: currentPos || MOCK_COORDS.origen,
              destination: envio.destino,
              travelMode: google.maps.TravelMode.DRIVING,
              provideRouteAlternatives: true,
              drivingOptions: {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS
              }
            }}
            callback={directionsCallback}
          />
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
          
          <Marker 
            position={currentPos || MOCK_COORDS.origen} 
            icon={{
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: "#1F3864",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#FFFFFF"
            }}
          />
        </GoogleMap>

        {/* ETA FLOATING CARD */}
        {eta && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-xs">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F3F4F6] text-[#1F3864] rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Llegada Estimada</p>
                  <p className="text-lg font-black text-slate-800 leading-none">{eta}</p>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white font-black uppercase text-[8px]">En Ruta</Badge>
            </div>
          </div>
        )}

        {isPreview && (
          <div className="absolute top-24 left-6 z-10">
            <Badge className="bg-orange-500 text-white font-black uppercase text-[10px] px-4 py-1 rounded-full shadow-lg">
              Modo Simulador
            </Badge>
          </div>
        )}
      </div>

      {/* SECCIÓN INFERIOR: PANEL OPERATIVO */}
      <div className="flex-1 bg-white border-t rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-20 px-8 pt-8 pb-10 flex flex-col">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6 shrink-0" />
        
        <ScrollArea className="flex-1">
          <div className="space-y-6 pb-6">
            <header className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicio de Custodia</p>
                <h2 className="text-xl font-black text-[#1F3864] uppercase">{envio.consecutivo}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Declarado</p>
                <p className="text-lg font-mono font-bold text-[#B8860B]">$ {(envio.valorDeclarado || 0).toLocaleString('es-CO')}</p>
              </div>
            </header>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
              <Package className="h-5 w-5 text-[#1F3864] mt-0.5" />
              <p className="text-sm font-medium text-slate-600 leading-relaxed">{envio.descripcion}</p>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* PROTOCOLO DE PIN Y CIERRE */}
            <div className="space-y-6">
              {!isPinValid ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    <p className="text-xs font-black uppercase text-slate-800">Ingrese PIN para Entregar</p>
                  </div>
                  <div className="flex justify-between gap-4 max-w-xs mx-auto">
                    {pin.map((digit, idx) => (
                      <Input
                        key={idx}
                        id={`pin-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        className="h-16 w-full text-center text-2xl font-black rounded-2xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#B8860B]"
                      />
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-tighter">Solicite el código de 4 dígitos al destinatario.</p>
                  {isPreview && <p className="text-[10px] text-orange-500 font-black text-center uppercase">PIN de Prueba: 1234</p>}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                    <ShieldCheck className="h-6 w-6" />
                    <div>
                      <p className="text-xs font-black uppercase">PIN Correcto</p>
                      <p className="text-[10px] font-medium opacity-80 uppercase">Capture evidencia de entrega para finalizar.</p>
                    </div>
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
                      className="w-full h-16 bg-[#1F3864] hover:bg-[#152a4a] text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                    >
                      <label htmlFor="evidence" className="flex items-center justify-center gap-3 cursor-pointer">
                        {isFinalizing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                        Finalizar Servicio
                      </label>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {error && (
        <div className="fixed bottom-32 left-8 right-8 z-50 bg-rose-600 text-white p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest shadow-2xl animate-bounce">
          <AlertTriangle className="h-4 w-4 inline mr-2" /> {error}
        </div>
      )}
    </div>
  );
}

const ScrollArea = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("overflow-y-auto", className)}>{children}</div>
);