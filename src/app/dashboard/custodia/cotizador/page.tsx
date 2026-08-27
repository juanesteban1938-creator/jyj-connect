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
  AlertTriangle, 
  Loader2,
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
      <header className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-[#B8860B] rounded-full" />
          <h1 className="text-3xl font-serif font-black text-[#1F3864] tracking-tight uppercase">Cotizador de Envío</h1>
        </div>
        <p className="text-[#5B5F68] text-sm font-medium mt-1">Herramienta de precisión financiera para servicios J&J Carga.</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA: ENTRADAS */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border-[#E2E4E9] shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 border-b border-[#E2E4E9]">
              <CardTitle className="text-xs font-black text-[#1C1E22] uppercase tracking-[0.1em]">
                Datos de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              {/* DISTANCIA */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase text-[#5B5F68] tracking-widest">Distancia Estimada (KM)</label>
                  <span className="text-2xl font-mono font-black text-[#1F3864]">{distancia} <span className="text-xs text-[#8A8D96]">KM</span></span>
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
                  <div className="flex items-center gap-2 bg-[#FEF3C7] text-[#B8860B] p-3 rounded-xl border border-[#FDE68A] text-[10px] font-bold uppercase tracking-tight">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Cobertura Extendida: Supera el radio urbano ({config.km_maximo_urbano}KM)
                  </div>
                )}
              </div>

              {/* VALOR DECLARADO */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black uppercase text-[#5B5F68] tracking-widest">Valor Comercial del Artículo ($)</label>
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8D96] font-bold">$</span>
                  <Input 
                    type="number" 
                    value={valorDeclaradoInput}
                    onChange={(e) => setValorDeclaradoInput(Number(e.target.value))}
                    className="pl-8 rounded-xl h-12 font-mono font-black text-[#1F3864] border-[#E2E4E9] focus:ring-2 focus:ring-[#B8860B]" 
                    placeholder="Ingrese valor..."
                  />
                </div>
                
                {/* BADGE DEL PLAN AQUÍ */}
                <div className="pt-2">
                  {results && (
                    <div className={cn(
                      "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                      results.plan === 'Esencial' ? "bg-blue-50 text-blue-700" :
                      results.plan === 'Seguro' ? "bg-[#FFFBEB] text-[#B8860B]" :
                      "bg-rose-50 text-rose-700"
                    )}>
                      {results.plan === 'Fuera de Rango' ? 'Revisión Corporativa Requerida' : `Clasificación: ${results.plan}`}
                    </div>
                  )}
                </div>

                {valorDeclaradoInput === 0 && (
                  <p className="text-[9px] text-[#8A8D96] italic font-bold uppercase tracking-tighter">
                    * Sin declaración: Se aplica valor mínimo asegurable de {currencyFormatter.format(config.valor_declarado_minimo)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA: RESULTADO (LIMPIA Y BLANCA) */}
        <div className="lg:col-span-5 sticky top-24">
          <Card className="rounded-2xl border-[#E2E4E9] shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 pb-2">
              <p className="text-[10px] font-black uppercase text-[#5B5F68] tracking-widest">Desglose de la tarifa</p>
              <p className="text-[11px] text-[#8A8D96] font-medium">Así se construye el precio, capa por capa.</p>
            </CardHeader>
            
            <CardContent className="p-6 pt-6 space-y-10">
              {results?.superaTope ? (
                <div className="py-8 text-center space-y-6">
                  <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto opacity-50" />
                  <div className="space-y-2 px-4">
                    <h3 className="text-lg font-serif font-black text-[#1F3864] uppercase">Riesgo Excedido</h3>
                    <p className="text-xs text-[#5B5F68] font-medium leading-relaxed">
                      El valor declarado supera el tope estándar de <b>{currencyFormatter.format(config.tope_cobertura_estandar)}</b>. Se requiere evaluación manual.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* BARRA SEGMENTADA (COLORES PASTEL) */}
                  <div className="space-y-3">
                    <div className="flex h-[34px] w-full rounded-lg overflow-hidden border border-[#E2E4E9] bg-slate-50">
                      <div className="h-full bg-[#DBEAFE] transition-all duration-700" style={{ width: `${results?.percentages.pBase}%` }} title="Base" />
                      <div className="h-full bg-[#FEF3C7] transition-all duration-700" style={{ width: `${results?.percentages.pRiesgo}%` }} title="Riesgo" />
                      <div className="h-full bg-[#D1FAE5] transition-all duration-700" style={{ width: `${results?.percentages.pCustodia}%` }} title="Custodia" />
                      <div className="h-full bg-[#FEE2E2] transition-all duration-700" style={{ width: `${results?.percentages.pMargen}%` }} title="Margen" />
                    </div>
                  </div>

                  {/* DESGLOSE LISTA */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                        <span className="text-[13px] font-medium text-[#1C1E22]">Costo operativo base</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-black text-[#1C1E22]">{currencyFormatter.format(results?.costoBase || 0)}</span>
                        <span className="text-[10px] text-[#8A8D96] ml-2 font-medium">({results?.percentages.pBase.toFixed(1)}%)</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-[#B8860B]" />
                        <span className="text-[13px] font-medium text-[#1C1E22]">Prima de riesgo</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-black text-[#1C1E22]">{currencyFormatter.format(results?.primaRiesgo || 0)}</span>
                        <span className="text-[10px] text-[#8A8D96] ml-2 font-medium">({results?.percentages.pRiesgo.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-[#10B981]" />
                        <span className="text-[13px] font-medium text-[#1C1E22]">Cargo de custodia</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-black text-[#1C1E22]">{currencyFormatter.format(results?.cargoCustodia || 0)}</span>
                        <span className="text-[10px] text-[#8A8D96] ml-2 font-medium">({results?.percentages.pCustodia.toFixed(1)}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-[#F87171]" />
                        <span className="text-[13px] font-medium text-[#1C1E22]">Margen de utilidad</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-black text-[#1C1E22]">{currencyFormatter.format(results?.margenVal || 0)}</span>
                        <span className="text-[10px] text-[#8A8D96] ml-2 font-medium">({results?.percentages.pMargen.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* RESULTADO FINAL */}
                  <div className="pt-6 border-t border-[#E2E4E9]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-black uppercase text-[#8A8D96] tracking-widest">Tarifa sugerida al cliente</span>
                      <div className="flex items-baseline gap-1.5">
                        <h2 className="text-3xl font-mono font-black text-[#1F3864] tracking-tighter">
                          {currencyFormatter.format(results?.total || 0).replace('$', '').trim()}
                        </h2>
                        <span className="text-xs font-bold text-[#8A8D96]">COP</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-[#8A8D96] uppercase leading-relaxed italic px-8">
              Esta calculadora utiliza los parámetros de negocio vigentes para el mes de {new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())}.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="text-center pt-12">
        <p className="text-[9px] font-black text-[#8A8D96] uppercase tracking-[0.4em]">J&J Carga Business Intelligence — Engine v3.2</p>
      </footer>
    </div>
  );
}
