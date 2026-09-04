
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Envio } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["geometry"];

export default function ConductorEnvioPage() {
  const params = useParams();
  const id = params?.id as string;
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentPos, setCurrentPos] = useState<google.maps.LatLngLiteral | null>(null);
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

  const envioRef = useMemoFirebase(() => id ? doc(db, 'envios', id) : null, [db, id]);
  const { data: envio, isLoading: loadingEnvio } = useDoc<Envio>(envioRef);

  // 1. Wake Lock para mantener pantalla encendida
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
    return () => { if (wakeLock) wakeLock.release(); };
  }, []);

  // 2. Seguimiento de posición y actualización en Firestore
  useEffect(() => {
    if (!id || !db) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPos(newPos);
        
        // Actualizar ubicación para monitoreo radar
        const gpsRef = doc(db, 'ubicaciones_gps', id);
        updateDoc(gpsRef, {
          lat: newPos.lat,
          lng: newPos.lng,
          velocidad: pos.coords.speed || 0,
          activo: true,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      },
      (err) => setError('Activa el GPS para navegar.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [id, db]);

  // 3. Lógica de cálculo de ruta y ETA
  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    if (status === 'OK' && result) {
      setDirections(result);
      const route = result.routes[0];
      if (route && route.legs[0]) {
        setEta(route.legs[0].duration_in_traffic?.text || route.legs[0].duration?.text || 'Calculando...');
      }
    }
  }, []);

  // 4. Validación de PIN
  const handlePinChange = (index: number, value: string) => {
    if (!/[0-9]/.test(value) && value !== '') return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus al siguiente
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    // Validar cuando esté lleno
    const fullPin = newPin.join('');
    if (fullPin.length === 4) {
      if (fullPin === (envio?.security_pin || '1234')) {
        setIsPinValid(true);
        toast({ title: "PIN Correcto", description: "Proceda con la entrega." });
      } else {
        toast({ variant: "destructive", title: "PIN Incorrecto", description: "Verifique con el cliente." });
        setPin(['', '', '', '']);
        document.getElementById('pin-0')?.focus();
      }
    }
  };

  const handleFinalize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !envioRef) return;
    setIsFinalizing(true);
    try {
      // Simulación de subida de foto y finalización
      await updateDoc(envioRef, {
        estado: 'entregado',
        updatedAt: serverTimestamp()
      });
      toast({ title: "Entrega Finalizada", description: "El servicio ha sido cerrado con éxito." });
      router.push('/dashboard/custodia/envios');
    } catch (err) {
      toast({ variant: "destructive", title: "Error al cerrar", description: "No se pudo actualizar el estado." });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loadingEnvio || !isLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F3F4F6]">
      <Loader2 className="h-10 w-10 animate-spin text-[#1F3864] mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando Navegación Nova...</p>
    </div>
  );

  if (!envio) return (
    <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-[#F3F4F6]">
      <AlertTriangle className="h-16 w-16 text-rose-500 mb-4" />
      <h1 className="text-xl font-black uppercase text-[#1F3864]">Envío no encontrado</h1>
      <p className="text-sm text-slate-500 mt-2">El enlace ha expirado o el servicio fue cancelado.</p>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* MAPA PRINCIPAL */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={currentPos || { lat: 4.6097, lng: -74.0817 }}
          zoom={15}
          options={{
            disableDefaultUI: true,
            styles: mapStyles
          }}
        >
          <TrafficLayer />
          {currentPos && envio && (
            <DirectionsService
              options={{
                origin: currentPos,
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
          )}
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
          
          {/* Marcadores */}
          {currentPos && (
            <Marker 
              position={currentPos} 
              icon={{
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 5,
                fillColor: "#1F3864",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#FFFFFF",
                rotation: 0 // Debería basarse en el heading si está disponible
              }}
            />
          )}
        </GoogleMap>

        {/* ETA FLOATING CARD */}
        {eta && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1">Llegada Estimada</p>
                  <p className="text-xl font-black text-slate-800 leading-none">{eta}</p>
                </div>
              </div>
              <Badge className="bg-orange-500 text-white font-black uppercase text-[9px] px-2 py-1">Tráfico best-guess</Badge>
            </div>
          </div>
        )}
      </div>

      {/* OPERATIONAL BOTTOM SHEET */}
      <div className="h-[35vh] sm:h-[40vh] bg-white border-t rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-20 px-8 pt-8 pb-10 flex flex-col">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
        
        <div className="flex-1 space-y-6 overflow-y-auto">
          <header className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicio en Curso</p>
              <h2 className="text-xl font-black text-[#1F3864] uppercase">{envio.consecutivo}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Declarado</p>
              <p className="text-lg font-mono font-bold text-[#B8860B]">$ {envio.valorDeclarado.toLocaleString('es-CO')}</p>
            </div>
          </header>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
            <Package className="h-5 w-5 text-slate-400 mt-0.5" />
            <p className="text-sm font-medium text-slate-600 leading-relaxed">{envio.descripcion}</p>
          </div>

          <Separator className="bg-slate-100" />

          {/* CONTROL DE PIN / FINALIZACIÓN */}
          <div className="space-y-6">
            {!isPinValid ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-black uppercase text-slate-800">Ingrese PIN de Entrega</p>
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
                      className="h-16 w-full text-center text-2xl font-black rounded-2xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="h-6 w-6" />
                  <div>
                    <p className="text-xs font-black uppercase">Entrega Autorizada</p>
                    <p className="text-[10px] font-medium opacity-80 uppercase">Capture evidencia fotográfica para cerrar.</p>
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
      </div>

      {error && (
        <div className="fixed bottom-32 left-8 right-8 z-50 bg-rose-600 text-white p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest shadow-2xl animate-bounce">
          <AlertTriangle className="h-4 w-4 inline mr-2" /> {error}
        </div>
      )}
    </div>
  );
}

const mapStyles = [
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
  { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }] },
  { "featureType": "road.highway", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
  { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#cad2d3" }, { "visibility": "on" }] }
];

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full", className)} />;
