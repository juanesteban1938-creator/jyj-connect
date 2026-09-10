'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings2, Save, ShieldCheck, Truck, Loader2, Target, Map, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConfigCustodia } from '@/lib/custodia-types';

export default function RentabilidadFinanzasPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<Partial<ConfigCustodia>>({
    costo_fijo_mensual: 4500000,
    envios_mes_estimados: 200,
    tarifa_por_km: 800,
    cargo_fijo_custodia: 8000,
    tasa_riesgo: 0.005,
    margen_utilidad: 0.25,
    tope_cobertura_estandar: 5000000,
    valor_declarado_minimo: 200000,
    km_maximo_urbano: 40,
  });

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const configRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'configuracion_custodia', 'global');
  }, [db, user]);

  const { data: remoteConfig, isLoading } = useDoc<ConfigCustodia>(configRef);

  useEffect(() => {
    if (remoteConfig) {
      setConfig(remoteConfig);
    }
  }, [remoteConfig]);

  const handleSave = async () => {
    if (!configRef) return;
    setIsSaving(true);
    try {
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Configuración Financiera Guardada", description: "Parámetros actualizados para el análisis de rentabilidad." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-8 pb-12 bg-[#F8FAFC] min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-emerald-500 rounded-full" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Análisis de Rentabilidad</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Configuración de costos fijos, tasas de riesgo y proyecciones de utilidad neta.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs h-11 px-8 rounded-xl shadow-lg transition-all active:scale-95">
          {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Parámetros
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Costos Operativos */}
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Truck className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Estructura de Costos Fijos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Costo Fijo Mensual</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" value={config.costo_fijo_mensual} onChange={e => setConfig({...config, costo_fijo_mensual: Number(e.target.value)})} className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Envíos Estimados / Mes</label>
                <Input type="number" value={config.envios_mes_estimados} onChange={e => setConfig({...config, envios_mes_estimados: Number(e.target.value)})} className="rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tarifa Variable por KM</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" value={config.tarifa_por_km} onChange={e => setConfig({...config, tarifa_por_km: Number(e.target.value)})} className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargo Fijo Custodia</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" value={config.cargo_fijo_custodia} onChange={e => setConfig({...config, cargo_fijo_custodia: Number(e.target.value)})} className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Riesgo y Utilidad */}
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Margen y Cobertura</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tasa de Riesgo (%)</label>
                <div className="relative">
                  <Input type="number" step="0.001" value={(config.tasa_riesgo || 0) * 100} onChange={e => setConfig({...config, tasa_riesgo: Number(e.target.value) / 100})} className="rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px]">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Margen de Utilidad (%)</label>
                <div className="relative">
                  <Input type="number" step="1" value={(config.margen_utilidad || 0) * 100} onChange={e => setConfig({...config, margen_utilidad: Number(e.target.value) / 100})} className="rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px]">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tope Cobertura Estándar</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" value={config.tope_cobertura_estandar} onChange={e => setConfig({...config, tope_cobertura_estandar: Number(e.target.value)})} className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200 text-orange-600" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Mínimo Asegurable</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" value={config.valor_declarado_minimo} onChange={e => setConfig({...config, valor_declarado_minimo: Number(e.target.value)})} className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radio Urbano */}
        <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white lg:col-span-2">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Map className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Geolocalización y Rangos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="max-w-xs space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Límite Bogotá Urbano (KM)</label>
              <div className="relative">
                <Input type="number" value={config.km_maximo_urbano} onChange={e => setConfig({...config, km_maximo_urbano: Number(e.target.value)})} className="rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px] uppercase">KM</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-2">Superar este rango disparará alertas de cobertura extendida en cotizaciones.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <footer className="text-center pt-8">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">J&J Financial Engine — Asset Management v3.0</p>
      </footer>
    </div>
  );
}
