'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2,
  Info,
  ChevronRight,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import type { ConfigCustodia } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function CotizadorEnvioPage() {
  const [distancia, setDistancia] = useState(1);
  const [valorDeclaradoInput, setValorDeclaradoInput] = useState(0);

  const db = useFirestore();
  const { user } = useUser();

  const configRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'configuracion_custodia', 'global');
  }, [db, user]);

  const { data: config, isLoading } = useDoc<ConfigCustodia>(configRef);

  const results = useMemo(() => {
    if (!config) return null;

    const valReal = valorDeclaradoInput > 0 ? valorDeclaradoInput : config.valor_declarado_minimo;
    const superaTope = valReal > config.tope_cobertura_estandar;
    const superaKm = distancia > config.km_maximo_urbano;

    // 1. Costo operativo base
    const costoBase = (config.costo_fijo_mensual / config.envios_mes_estimados) + (config.tarifa_por_km * distancia);
    
    // 2. Prima de riesgo
    const primaRiesgo = valReal * config.tasa_riesgo;
    
    // 3. Cargo de custodia
    const cargoCustodia = config.cargo_fijo_custodia;
    
    // 4. Subtotal
    const subtotal = costoBase + primaRiesgo + cargoCustodia;
    
    // 5. Margen de utilidad
    const margenVal = subtotal * config.margen_utilidad;
    
    // Precio Final
    const total = subtotal + margenVal;

    // Clasificación de Plan
    let plan: 'Esencial' | 'Seguro' | 'Fuera de Rango' = 'Esencial';
    const pctTope = (valReal / config.tope_cobertura_estandar) * 100;
    if (valReal > config.tope_cobertura_estandar) plan = 'Fuera de Rango';
    else if (pctTope > 35) plan = 'Seguro';

    // Porcentajes para barra visual
    const totalParts = costoBase + primaRiesgo + cargoCustodia + margenVal;
    const pBase = (costoBase / totalParts) * 100;
    const pRiesgo = (primaRiesgo / totalParts) * 100;
    const pCustodia = (cargoCustodia / totalParts) * 100;
    const pMargen = (margenVal / totalParts) * 100;

    return {
      costoBase,
      primaRiesgo,
      cargoCustodia,
      margenVal,
      total,
      plan,
      superaTope,
      superaKm,
      valReal,
      percentages: { pBase, pRiesgo, pCustodia, pMargen }
    };
  }, [config, distancia, valorDeclaradoInput]);

  if (isLoading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin text-[#B8860B] h-12 w-12" /></div>;

  if (!config) return (
    <div className="p-8 text-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
      <h2 className="text-xl font-black uppercase text-slate-800">Parámetros no configurados</h2>
      <p className="text-slate-500">Por favor, define los costos base en la sección de Parámetros Tarifarios antes de cotizar.</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 bg-[#F3F4F6] min-h-screen p-4 sm:p-8">
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[#B8860B] rounded-full" />
            <h1 className="text-3xl font-serif font-black text-[#1F3864] tracking-tight uppercase">Cotizador de Envío</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Calculadora de precisión financiera para servicios de custodia J&J Carga.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA ENTRADAS */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-black text-[#1F3864] uppercase tracking-[0.1em] flex items-center gap-2">
                <Info className="h-4 w-4 text-[#B8860B]" /> Datos de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              {/* DISTANCIA */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Distancia Estimada (KM)</label>
                  <span className="text-2xl font-mono font-black text-[#1F3864]">{distancia} <span className="text-xs text-slate-400">KM</span></span>
                </div>
                <Slider 
                  min={1} 
                  max={100} 
                  step={1} 
                  value={[distancia]} 
                  onValueChange={(v) => setDistancia(v[0])} 
                  className="py-4 cursor-pointer"
                />
                {results?.superaKm && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-100 text-[10px] font-bold uppercase tracking-tight">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Cobertura Extendida: Supera el radio urbano ({config.km_maximo_urbano}KM)
                  </div>
                )}
              </div>

              {/* VALOR DECLARADO */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Comercial del Artículo ($)</label>
                  <span className={cn(
                    "text-2xl font-mono font-black",
                    results?.superaTope ? "text-rose-600" : "text-[#B8860B]"
                  )}>
                    {currencyFormatter.format(valorDeclaradoInput || config.valor_declarado_minimo)}
                  </span>
                </div>
                <Slider 
                  min={0} 
                  max={config.tope_cobertura_estandar * 1.5} 
                  step={50000} 
                  value={[valorDeclaradoInput]} 
                  onValueChange={(v) => setValorDeclaradoInput(v[0])} 
                  className="py-4 cursor-pointer"
                />
                <div className="relative max-w-[240px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <Input 
                    type="number" 
                    value={valorDeclaradoInput}
                    onChange={(e) => setValorDeclaradoInput(Number(e.target.value))}
                    className="pl-8 rounded-xl h-12 font-mono font-black text-[#1F3864] border-slate-200 focus:ring-2 focus:ring-[#B8860B]" 
                    placeholder="Ingrese valor..."
                  />
                </div>
                {valorDeclaradoInput === 0 && (
                  <p className="text-[9px] text-slate-400 italic font-bold uppercase tracking-tighter">
                    * Sin declaración: Se aplica valor mínimo asegurable de {currencyFormatter.format(config.valor_declarado_minimo)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-[#1F3864]/5 p-6 rounded-2xl border border-[#1F3864]/10">
            <p className="text-[10px] font-bold text-[#1F3864]/60 uppercase leading-relaxed text-center italic">
              Esta calculadora utiliza los parámetros de negocio vigentes para el mes de {new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())}.
            </p>
          </div>
        </div>

        {/* COLUMNA RESULTADOS */}
        <div className="lg:col-span-5 sticky top-24">
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
            <div className="p-8 bg-[#1F3864] text-white">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                  <Calculator className="h-6 w-6 text-[#B8860B]" />
                </div>
                {results && (
                  <Badge className={cn(
                    "font-black uppercase text-[10px] px-4 py-1 rounded-full border-none shadow-lg",
                    results.plan === 'Esencial' ? "bg-emerald-500 text-white" :
                    results.plan === 'Seguro' ? "bg-[#B8860B] text-white" :
                    "bg-rose-600 text-white animate-pulse"
                  )}>
                    {results.plan === 'Fuera de Rango' ? 'REVISIÓN CORPORATIVA' : `PLAN ${results.plan}`}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em] mb-2">Tarifa Sugerida al Cliente</p>
              <h2 className="text-5xl font-mono font-black tracking-tighter">
                {results?.superaTope ? '----' : currencyFormatter.format(results?.total || 0)}
              </h2>
            </div>

            <CardContent className="p-8 space-y-8">
              {results?.superaTope ? (
                <div className="py-10 text-center space-y-6">
                  <ShieldAlert className="h-20 w-20 text-rose-500 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-serif font-black text-[#1F3864] uppercase">Riesgo Excedido</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                      El valor declarado supera el tope estándar de <b>{currencyFormatter.format(config.tope_cobertura_estandar)}</b>. Se requiere evaluación manual por parte de gerencia.
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-[10px] font-black text-rose-700 uppercase tracking-widest">
                    Consultar Plan Corporativo
                  </div>
                </div>
              ) : (
                <>
                  {/* BARRA SEGMENTADA */}
                  <div className="space-y-3">
                    <div className="flex h-6 w-full rounded-full overflow-hidden shadow-inner bg-slate-100 border-4 border-white">
                      <div className="h-full bg-[#1F3864] transition-all duration-700" style={{ width: `${results?.percentages.pBase}%` }} />
                      <div className="h-full bg-[#4F46E5] transition-all duration-700" style={{ width: `${results?.percentages.pRiesgo}%` }} />
                      <div className="h-full bg-[#F97316] transition-all duration-700" style={{ width: `${results?.percentages.pCustodia}%` }} />
                      <div className="h-full bg-[#B8860B] transition-all duration-700" style={{ width: `${results?.percentages.pMargen}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>Estructura de Costos</span>
                      <span>Análisis 100% Preciso</span>
                    </div>
                  </div>

                  {/* DESGLOSE LISTA */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#1F3864]" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Costo Operativo Base</span>
                      </div>
                      <span className="text-sm font-mono font-black text-[#1F3864]">{currencyFormatter.format(results?.costoBase || 0)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Prima de Riesgo</span>
                      </div>
                      <span className="text-sm font-mono font-black text-indigo-600">{currencyFormatter.format(results?.primaRiesgo || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Cargo de Custodia J&J</span>
                      </div>
                      <span className="text-sm font-mono font-black text-slate-900">{currencyFormatter.format(results?.cargoCustodia || 0)}</span>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#B8860B]" />
                        <span className="text-xs font-bold text-[#B8860B] uppercase tracking-tight">Margen de Utilidad</span>
                      </div>
                      <span className="text-sm font-mono font-black text-[#B8860B]">{currencyFormatter.format(results?.margenVal || 0)}</span>
                    </div>
                  </div>

                  <div className="pt-8 text-center space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase italic leading-relaxed">
                      El precio final incluye monitoreo GPS y seguros.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-[#B8860B]">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Cálculo Auditado Nova</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <footer className="text-center pt-12">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">J&J Carga Business Intelligence — Engine v3.1</p>
      </footer>
    </div>
  );
}
