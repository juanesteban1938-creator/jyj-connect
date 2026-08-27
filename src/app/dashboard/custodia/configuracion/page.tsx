
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calculator, Save, ShieldCheck, TrendingUp, Truck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConfigCustodia } from '@/lib/custodia-types';

export default function ConfigCustodiaPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<Partial<ConfigCustodia>>({
    costo_fijo_mensual: 0,
    envios_mes_estimados: 0,
    tarifa_por_km: 0,
    cargo_fijo_custodia: 0,
    tasa_riesgo: 0,
    margen_utilidad: 0,
    tope_cobertura_estandar: 0,
    valor_declarado_minimo: 0,
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
      toast({ title: "Configuración Guardada", description: "Los parámetros han sido actualizados globalmente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Parámetros J&J Custodia</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Configuración financiera para el cálculo dinámico de fletes blindados.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs h-11 px-8 rounded-xl shadow-lg">
          {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Cambios
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Costos Operativos */}
        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-500"><Truck className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black uppercase">Costos Operativos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Costo Fijo Mensual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input type="number" value={config.costo_fijo_mensual} onChange={e => setConfig({...config, costo_fijo_mensual: Number(e.target.value)})} className="pl-8 rounded-xl h-11 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Envíos Estimados / Mes</label>
                <Input type="number" value={config.envios_mes_estimados} onChange={e => setConfig({...config, envios_mes_estimados: Number(e.target.value)})} className="rounded-xl h-11 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Tarifa por KM</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input type="number" value={config.tarifa_por_km} onChange={e => setConfig({...config, tarifa_por_km: Number(e.target.value)})} className="pl-8 rounded-xl h-11 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Cargo Fijo de Custodia</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input type="number" value={config.cargo_fijo_custodia} onChange={e => setConfig({...config, cargo_fijo_custodia: Number(e.target.value)})} className="pl-8 rounded-xl h-11 font-bold" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Riesgo y Utilidad */}
        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500"><ShieldCheck className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-black uppercase">Riesgo y Utilidad</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Tasa de Riesgo (%)</label>
                <div className="relative">
                  <Input type="number" step="0.01" value={config.tasa_riesgo} onChange={e => setConfig({...config, tasa_riesgo: Number(e.target.value)})} className="rounded-xl h-11 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Margen de Utilidad (%)</label>
                <div className="relative">
                  <Input type="number" step="0.1" value={config.margen_utilidad} onChange={e => setConfig({...config, margen_utilidad: Number(e.target.value)})} className="rounded-xl h-11 font-bold" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Tope Cobertura Estándar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input type="number" value={config.tope_cobertura_estandar} onChange={e => setConfig({...config, tope_cobertura_estandar: Number(e.target.value)})} className="pl-8 rounded-xl h-11 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Valor Declarado Mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input type="number" value={config.valor_declarado_minimo} onChange={e => setConfig({...config, valor_declarado_minimo: Number(e.target.value)})} className="pl-8 rounded-xl h-11 font-bold" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Costo Base Proyectado por Envío</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            ${((config.costo_fijo_mensual || 0) / (config.envios_mes_estimados || 1)).toLocaleString('es-CO')}
            <span className="text-[10px] font-bold text-slate-400 ml-2">COP / UNIDAD</span>
          </p>
      </Card>
    </div>
  );
}
