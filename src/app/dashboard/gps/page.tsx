'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Car, 
  AlertTriangle, 
  Loader2,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    gm_authFailure?: () => void;
  }
}

export default function GPSMonitoringPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<any>(null);
  const markers = useRef<Record<string, any>>({});
  
  const db = useFirestore();
  const { user } = useUser();

  // Suscripción en tiempo real a ubicaciones activas
  useEffect(() => {
    if (!db || !user) return;

    const q = query(collection(db, 'ubicaciones_gps'), where('activo', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      setLocations(data);
    });

    return () => unsubscribe();
  }, [db, user]);

  // Carga segura de Google Maps Script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'tu_clave_aqui') {
      setMapError('La clave de API de Google Maps no está configurada en las variables de entorno.');
      return;
    }

    if (window.google) {
      setMapLoaded(true);
      return;
    }

    // Capturar errores de autenticación de Google Maps
    window.gm_authFailure = () => {
      setMapError('Error de autenticación: La clave de API de Google Maps es inválida o no tiene permisos.');
    };

    const scriptId = 'google-maps-api-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setMapError('No se pudo cargar el script de Google Maps. Revisa tu conexión.');
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      existingScript.addEventListener('error', () => setMapError('Error al cargar el mapa.'));
    }
  }, []);

  // Inicialización del Mapa
  useEffect(() => {
    if (mapLoaded && mapRef.current && !googleMap.current && !mapError) {
      try {
        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 4.711, lng: -74.0721 }, // Bogotá
          zoom: 12,
          styles: [
            { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
            { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f2f2f2" }] },
            { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] }
          ],
          disableDefaultUI: false,
          zoomControl: true,
        });
      } catch (err) {
        console.error('Error al inicializar el mapa:', err);
        setMapError('Error al inicializar los componentes del mapa.');
      }
    }
  }, [mapLoaded, mapError]);

  // Centrar mapa cuando lleguen los primeros datos (Corrección solicitada)
  useEffect(() => {
    if (!googleMap.current || locations.length === 0 || selectedService) return;
    const u = locations[0];
    googleMap.current.setCenter({ lat: u.lat, lng: u.lng });
    googleMap.current.setZoom(15);
  }, [locations, selectedService, mapLoaded]);

  // Actualización de Marcadores
  useEffect(() => {
    if (!googleMap.current || !mapLoaded || mapError) return;

    // Eliminar marcadores que ya no están activos
    const currentIds = locations.map(l => l.id);
    Object.keys(markers.current).forEach(id => {
      if (!currentIds.includes(id)) {
        markers.current[id].setMap(null);
        delete markers.current[id];
      }
    });

    locations.forEach(loc => {
      const isDelayed = (new Date().getTime() - loc.updatedAt.getTime()) > 120000; // > 2 min
      const position = { lat: loc.lat, lng: loc.lng };
      
      if (!markers.current[loc.id]) {
        const marker = new window.google.maps.Marker({
          position,
          map: googleMap.current,
          title: loc.conductorNombre,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: isDelayed ? "#EF4444" : "#F59E0B",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
            scale: 2,
            anchor: new window.google.maps.Point(12, 22)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: sans-serif;">
              <p style="margin: 0; font-weight: 900; font-size: 12px; color: #1e293b; text-transform: uppercase;">${loc.conductorNombre}</p>
              <p style="margin: 4px 0; font-size: 10px; color: #64748b; font-weight: bold;">📍 Destino: ${loc.destino || 'En ruta'}</p>
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isDelayed ? '#ef4444' : '#10b981'};"></span>
                <span style="font-size: 9px; font-weight: 900; color: ${isDelayed ? '#ef4444' : '#10b981'}; text-transform: uppercase;">
                  ${isDelayed ? 'Señal Débil' : 'En Línea'}
                </span>
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMap.current, marker);
          setSelectedService(loc.id);
        });

        markers.current[loc.id] = marker;
      } else {
        markers.current[loc.id].setPosition(position);
        markers.current[loc.id].setIcon({
          ...markers.current[loc.id].getIcon(),
          fillColor: isDelayed ? "#EF4444" : "#F59E0B"
        });
      }
    });
  }, [locations, mapLoaded, mapError]);

  const handleFocusService = (loc: any) => {
    setSelectedService(loc.id);
    if (googleMap.current) {
      googleMap.current.setCenter({ lat: loc.lat, lng: loc.lng });
      googleMap.current.setZoom(16);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] rounded-2xl overflow-hidden border bg-white shadow-xl">
      {/* Header Monitoreo */}
      <header className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-lg">
            <Navigation className="h-5 w-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight leading-none">Radar Nova</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronización GPS en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-tighter">{locations.length} Unidades Activas</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Lista Lateral */}
        <aside className="w-full md:w-[350px] lg:w-[400px] border-r flex flex-col bg-slate-50 shrink-0">
          <div className="p-4 border-b bg-white">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Servicios en Seguimiento</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-40 text-center p-8">
                <MapPin className="h-12 w-12 mb-2" />
                <p className="text-xs font-black uppercase">Sin unidades transmitiendo</p>
              </div>
            ) : (
              locations.map(loc => {
                const isDelayed = (new Date().getTime() - loc.updatedAt.getTime()) > 120000;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleFocusService(loc)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-all border group relative overflow-hidden",
                      selectedService === loc.id 
                        ? "bg-white border-orange-500 shadow-md ring-1 ring-orange-500" 
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm",
                          isDelayed ? "bg-rose-500" : "bg-orange-500"
                        )}>
                          {loc.conductorNombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase leading-tight">{loc.conductorNombre}</p>
                          <Badge variant="outline" className="text-[9px] h-4 mt-1 font-black tracking-widest border-slate-200 uppercase">
                            GPS ID: {loc.id.substring(0, 6)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase",
                          isDelayed ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          <Clock className="h-2 w-2" />
                          {formatDistanceToNow(loc.updatedAt, { addSuffix: true, locale: es })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{loc.destino || 'Ruta activa'}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Car className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{loc.velocidad.toFixed(0)} KM/H</span>
                      </div>
                    </div>

                    {isDelayed && (
                      <div className="mt-2 flex items-center gap-1.5 bg-rose-50 text-rose-600 p-2 rounded-lg text-[9px] font-black uppercase">
                        <AlertTriangle className="h-3 w-3" />
                        Pérdida de señal detectada
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Contenedor del Mapa */}
        <main className="flex-1 relative">
          {mapError ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
              <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
              <h3 className="text-lg font-black uppercase text-slate-800 mb-2">Error del Sistema de Mapas</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">{mapError}</p>
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600">
                Verifica: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </div>
            </div>
          ) : !mapLoaded ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Iniciando Cartografía Satelital</p>
            </div>
          ) : null}
          
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Capas sobre el mapa */}
          {selectedService && !mapError && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <Button 
                onClick={() => { setSelectedService(null); if(googleMap.current) googleMap.current.setZoom(12); }}
                className="bg-slate-900 text-white rounded-full px-6 font-black text-[10px] uppercase shadow-2xl hover:bg-slate-800"
              >
                <Maximize2 className="h-3 w-3 mr-2 text-orange-500" /> Restablecer Vista Global
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
