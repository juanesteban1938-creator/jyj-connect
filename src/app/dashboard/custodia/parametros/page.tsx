'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings2, 
  Save, 
  Calculator, 
  Truck, 
  Bike, 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  Loader2,
  Package,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Currency formatter for COP
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function ParametrosTarifariosPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // State for Firestore Parameters
  const [params, setParams] = useState({
    porcentaje_custodia: 1.5,
    tarifa_moto_base: 15000,
    tarifa_moto_km: 1200,
    tarifa_van_base: 35000,
    tarifa_van_km: 2500,
    tarifa_blindado_base: 120000,
    tarifa_blindado_km: 5500,
  });

  // State for Simulator Inputs
  const [sim, setSim] = useState({
    categoria: 'moto',
    distancia: 10,
    valor_declarado: 1000000
  });

  const [isSaving, setIsSaving] = useState(false);

  // Firestore Reference
  const configRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'configuracion', 'tarifas_envio');
  }, [db, user]);

  const { data: remoteData, isLoading } = useDoc(configRef);

  // Load data on mount/change
  useEffect(() => {
    if (remoteData) {
      setParams({
        porcentaje_custodia: Number(remoteData.porcentaje_custodia) || 1.5,
        tarifa_moto_base: Number(remoteData.tarifa_moto_base) || 15000,
        tarifa_moto_km: Number(remoteData.tarifa_moto_km) || 1200,
        tarifa_van_base: Number(remoteData.tarifa_van_base) || 35000,
        tarifa_van_km: Number(remoteData.tarifa_van_km) || 2500,
        tarifa_blindado_base: Number(remoteData.tarifa_blindado_base) || 120000,
        tarifa_blindado_km: Number(remoteData.tarifa_blindado_km) || 5500,
      });
    }
  }, [remoteData]);

  // Live Simulation Calculation
  const simulationResults = useMemo(() => {
    const category = sim.categoria;
    let base = 0;
    let perKm = 0;

    if (category === 'moto') {
      base = params.tarifa_moto_base;
      perKm = params.tarifa_moto_km;
    } else if (category === 'van') {
      base = params.tarifa_van_base;
      perKm = params.tarifa_van_km;
    } else if (category === 'blindado') {
      base = params.tarifa_blindado_base;
      perKm = params.tarifa_blindado_km;
    }
    
    const costoArranque = base;
    const costoRecorrido = sim.distancia * perKm;
    const primaSeguro = sim.valor_declarado * (params.porcentaje_custodia / 100);
    const total = costoArranque + costoRecorrido + primaSeguro;

    return {
      costoArranque,
      costoRecorrido,
      primaSeguro,
      total
    };
  }, [params, sim]);

  const handleSave = async () => {
    if (!configRef) return;
    setIsSaving(true);
    try {
      await setDoc(configRef, {
        ...params,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      }, { merge: true });
      toast({ title: "Parámetros Actualizados", description: "Las tarifas de custodia han sido sincronizadas en Firestore." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-[#1F3864]" />
      <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Cargando Motor de Tarifas...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 bg-[#F3F4F6] min-h-screen p-4 sm:p-8">
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Ajuste Tarifario</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión estratégica de costos operativos y seguros de carga.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs h-12 px-8 rounded-2xl shadow-xl transition-all active:scale-95"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar en Firebase
        </Button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE PARÁMETROS */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-8 border-b bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Estructura Tarifaria</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-slate-400">Define los valores base para cada unidad de transporte.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              
              {/* CATEGORÍA: MOTO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Bike className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Unidad Ágil (Moto)</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa Base ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_moto_base} 
                        onChange={e => setParams({...params, tarifa_moto_base: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa por KM ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_moto_km} 
                        onChange={e => setParams({...params, tarifa_moto_km: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* CATEGORÍA: VAN */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Truck className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Unidad de Carga (Van)</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa Base ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_van_base} 
                        onChange={e => setParams({...params, tarifa_van_base: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa por KM ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_van_km} 
                        onChange={e => setParams({...params, tarifa_van_km: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* CATEGORÍA: BLINDADO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Package className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Unidad de Volumen (Blindado)</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa Base ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_blindado_base} 
                        onChange={e => setParams({...params, tarifa_blindado_base: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-500">Tarifa por KM ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number" 
                        value={params.tarifa_blindado_km} 
                        onChange={e => setParams({...params, tarifa_blindado_km: Number(e.target.value)})}
                        className="pl-9 rounded-xl h-11 font-mono font-bold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* SEGUROS: PRIMA CUSTODIA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Protección de Mercancía</span>
                </div>
                <div className="max-w-xs space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-500">Prima de Custodia (%)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.1"
                      value={params.porcentaje_custodia} 
                      onChange={e => setParams({...params, porcentaje_custodia: Number(e.target.value)})}
                      className="pr-9 rounded-xl h-11 font-mono font-bold border-orange-200 focus:ring-orange-500" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-tight">Se aplica sobre el valor declarado del artículo a transportar.</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: SIMULADOR FINANCIERO */}
        <div className="lg:col-span-5 sticky top-24">
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-slate-900 text-white">
            <CardHeader className="p-8 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500 text-slate-900">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Simulador de Rentabilidad</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-orange-500">Prueba el impacto contable en tiempo real.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Categoría del Servicio</Label>
                  <Select value={sim.categoria} onValueChange={val => setSim({...sim, categoria: val})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl font-bold uppercase text-xs focus:ring-orange-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="moto" className="font-bold text-xs uppercase">Unidad Ágil (Moto)</SelectItem>
                      <SelectItem value="van" className="font-bold text-xs uppercase">Unidad de Carga (Van)</SelectItem>
                      <SelectItem value="blindado" className="font-bold text-xs uppercase">Unidad Blindada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Distancia (KM)</Label>
                    <Input 
                      type="number" 
                      value={sim.distancia} 
                      onChange={e => setSim({...sim, distancia: Number(e.target.value)})}
                      className="bg-white/5 border-white/10 h-11 rounded-xl font-bold text-white focus:ring-orange-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Valor Declarado ($)</Label>
                    <Input 
                      type="number" 
                      value={sim.valor_declarado} 
                      onChange={e => setSim({...sim, valor_declarado: Number(e.target.value)})}
                      className="bg-white/5 border-white/10 h-11 rounded-xl font-bold text-white focus:ring-orange-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Costo de Arranque (Base)</span>
                  <span className="font-mono font-bold">{currencyFormatter.format(simulationResults.costoArranque)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Costo Recorrido ({sim.distancia} KM)</span>
                  <span className="font-mono font-bold">{currencyFormatter.format(simulationResults.costoRecorrido)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Prima de Seguro ({params.porcentaje_custodia}%)</span>
                  <span className="font-mono font-bold text-orange-500">{currencyFormatter.format(simulationResults.primaSeguro)}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">Tarifa Total Sugerida</p>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                      {currencyFormatter.format(simulationResults.total)}
                    </h2>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">COP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">
                <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
                Los cálculos mostrados son una proyección contable basada en los parámetros actuales de la columna izquierda.
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="text-center pt-12">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">J&J Carga Business Logic — v4.0 (2026)</p>
      </footer>
    </div>
  );
}
