'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  ShieldAlert, 
  Loader2, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import type { ConfigCustodia } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  hora: z.string().min(1, 'La hora es requerida'),
  origen: z.string().min(1, 'Punto de recogida requerido'),
  destino: z.string().min(1, 'Punto de entrega requerido'),
  vehiculo: z.enum(['Moto', 'Auto', 'Van']),
  descripcion: z.string().min(1, 'Descripción del paquete requerida'),
  valorDeclarado: z.coerce.number().min(0, 'Mínimo $0 COP'),
  kmEstimados: z.coerce.number().min(1, 'Mínimo 1 KM'),
});

type FormValues = z.infer<typeof formSchema>;

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export function EnvioForm({ onSave, isSaving, onCancel }: { onSave: (data: any) => void, isSaving: boolean, onCancel: () => void }) {
  const db = useFirestore();
  const configRef = useMemoFirebase(() => doc(db, 'configuracion_custodia', 'global'), [db]);
  const { data: config, isLoading: loadingConfig } = useDoc<ConfigCustodia>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      hora: '08:00',
      origen: '',
      destino: '',
      vehiculo: 'Auto',
      descripcion: '',
      valorDeclarado: 0,
      kmEstimados: 1,
    }
  });

  const valorDeclaradoInput = form.watch('valorDeclarado');
  const kmEstimados = form.watch('kmEstimados');

  const calculation = useMemo(() => {
    if (!config) return null;

    // Lógica de valor mínimo si es omitido o muy bajo
    const fueValorDeclaradoOmitido = valorDeclaradoInput <= 0;
    const valorDeclaradoReal = fueValorDeclaradoOmitido ? config.valor_declarado_minimo : valorDeclaradoInput;

    const superaTope = valorDeclaradoReal > config.tope_cobertura_estandar;
    const superaKm = kmEstimados > config.km_maximo_urbano;
    
    if (superaTope) {
      return { 
        requiereRevisionManual: true, 
        motivo: 'Excede tope de cobertura estándar',
        plan: 'Corporativo',
        fueValorDeclaradoOmitido,
        valorDeclaradoReal
      };
    }

    // CÁLCULO J&J CARGA
    const costoFijoUnidad = config.costo_fijo_mensual / config.envios_mes_estimados;
    const costoVariableKM = config.tarifa_por_km * kmEstimados;
    const costoBaseLogistico = costoFijoUnidad + costoVariableKM;
    
    const primaRiesgo = valorDeclaradoReal * config.tasa_riesgo;
    const cargoCustodia = config.cargo_fijo_custodia;
    
    const subtotal = costoBaseLogistico + primaRiesgo + cargoCustodia;
    const margenUtilidadValor = subtotal * config.margen_utilidad;
    
    const tarifaFinalBruta = subtotal + margenUtilidadValor;
    const tarifaTotal = Math.ceil(tarifaFinalBruta / 100) * 100;

    // CLASIFICACIÓN DE PLANES
    let plan: 'Esencial' | 'Seguro' | 'Corporativo' = 'Esencial';
    const porcentajeTope = (valorDeclaradoReal / config.tope_cobertura_estandar) * 100;
    
    if (porcentajeTope > 35) plan = 'Seguro';

    // Proporciones para barra visual
    const totalParts = costoBaseLogistico + primaRiesgo + cargoCustodia + margenUtilidadValor;
    const pBase = (costoBaseLogistico / totalParts) * 100;
    const pPrima = (primaRiesgo / totalParts) * 100;
    const pCargo = (cargoCustodia / totalParts) * 100;
    const pMargen = (margenUtilidadValor / totalParts) * 100;

    return {
      costoBaseLogistico,
      primaRiesgo,
      cargoCustodia,
      margenUtilidadValor,
      tarifaTotal,
      plan,
      superaKm,
      fueValorDeclaradoOmitido,
      valorDeclaradoReal,
      requiereRevisionManual: false,
      percentages: { pBase, pPrima, pCargo, pMargen }
    };
  }, [config, valorDeclaradoInput, kmEstimados]);

  const onSubmit = (data: FormValues) => {
    onSave({
      ...data,
      ...calculation,
      valorDeclaradoReal: calculation?.valorDeclaradoReal,
      fueValorDeclaradoOmitido: calculation?.fueValorDeclaradoOmitido,
      planClasificacion: calculation?.plan
    });
  };

  if (loadingConfig) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#B8860B] h-12 w-12" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* COLUMNA IZQUIERDA: ENTRADAS */}
        <div className="lg:col-span-7 p-8 space-y-8 bg-white border-r">
          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase text-[#1F3864] tracking-[0.2em] flex items-center gap-2 font-sans">
              <MapPin className="h-4 w-4 text-[#B8860B]" /> Información del Envío
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField name="fecha" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-400">Fecha de Recogida</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl h-11 border-slate-200" /></FormControl></FormItem>
              )} />
              <FormField name="hora" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-400">Hora de Recogida</FormLabel><FormControl><Input type="time" {...field} className="rounded-xl h-11 border-slate-200" /></FormControl></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField name="origen" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-400">Dirección Origen</FormLabel><FormControl><Input placeholder="Ej. Calle 100 #15-30" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
              )} />
              <FormField name="destino" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-400">Dirección Destino</FormLabel><FormControl><Input placeholder="Ej. Cra 7 #72-10" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
              )} />
            </div>

            <FormField name="descripcion" control={form.control} render={({ field }) => (
              <FormItem><FormLabel className="text-[10px] font-black uppercase text-slate-400">Descripción de la Mercancía</FormLabel><FormControl><Input placeholder="Ej. Computador Portátil" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
            )} />
          </div>

          <Separator className="bg-slate-100" />

          <div className="space-y-10">
            <h4 className="text-[11px] font-black uppercase text-[#1F3864] tracking-[0.2em] font-sans">Ajuste de Variables</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <label className="text-[10px] font-black uppercase text-slate-500">Distancia Estimada</label>
                 <span className="text-lg font-mono font-bold text-[#1F3864]">{kmEstimados} <span className="text-[10px] text-slate-400">KM</span></span>
              </div>
              <FormField name="kmEstimados" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Slider 
                      min={1} 
                      max={60} 
                      step={1} 
                      value={[field.value]} 
                      onValueChange={(v) => field.onChange(v[0])} 
                      className="py-4 cursor-pointer"
                    />
                  </FormControl>
                </FormItem>
              )} />
              {calculation?.superaKm && (
                <p className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Fuera del perímetro urbano estándar
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <label className="text-[10px] font-black uppercase text-slate-500">Valor Comercial Declarado</label>
                 <span className={cn("text-lg font-mono font-bold", valorDeclaradoInput > (config?.tope_cobertura_estandar || 0) ? "text-rose-600" : "text-[#B8860B]")}>
                  {currencyFormatter.format(valorDeclaradoInput)}
                 </span>
              </div>
              <FormField name="valorDeclarado" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-6">
                      <Slider 
                        min={0} 
                        max={10000000} 
                        step={100000} 
                        value={[field.value]} 
                        onValueChange={(v) => field.onChange(v[0])} 
                        className="py-2 cursor-pointer"
                      />
                      <div className="relative max-w-[200px] mx-auto">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <Input 
                          type="number" 
                          {...field} 
                          className="rounded-xl h-11 font-mono font-bold text-center bg-slate-50 border-slate-200"
                        />
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESULTADO */}
        <div className="lg:col-span-5 bg-[#F8FAFC] flex flex-col justify-between overflow-hidden relative">
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-[#1F3864] tracking-[0.2em] flex items-center gap-2 font-sans">
                <Calculator className="h-4 w-4 text-[#B8860B]" /> Análisis de Tarifa J&J
              </h4>
              {calculation && (
                <Badge className={cn(
                  "font-black uppercase text-[9px] px-3 py-1 rounded-lg border-none",
                  calculation.plan === 'Esencial' ? "bg-blue-100 text-blue-700" :
                  calculation.plan === 'Seguro' ? "bg-amber-100 text-[#B8860B]" :
                  "bg-rose-100 text-rose-700"
                )}>
                  Plan {calculation.plan}
                </Badge>
              )}
            </div>

            {calculation?.requiereRevisionManual ? (
              <div className="bg-white border-2 border-rose-200 p-10 rounded-[2.5rem] text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-500">
                <ShieldAlert className="h-20 w-20 text-rose-600 mx-auto" />
                <h3 className="text-xl font-serif font-black text-[#1F3864] uppercase leading-tight">Valor Fuera de Rango</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  El valor excede el tope de cobertura de <b>{currencyFormatter.format(config?.tope_cobertura_estandar || 0)}</b>.
                </p>
                <div className="bg-rose-50 p-5 rounded-2xl text-[11px] font-black text-rose-800 uppercase tracking-widest border border-rose-100">
                  Requiere Cotización Manual
                </div>
              </div>
            ) : calculation ? (
              <div className="space-y-10 animate-in fade-in duration-700">
                <div className="space-y-4">
                   <div className="flex h-6 w-full rounded-full overflow-hidden shadow-md border-4 border-white bg-slate-200">
                      <div className="h-full bg-[#1F3864] transition-all duration-500" style={{ width: `${calculation.percentages.pBase}%` }} />
                      <div className="h-full bg-[#4F46E5] transition-all duration-500" style={{ width: `${calculation.percentages.pPrima}%` }} />
                      <div className="h-full bg-[#F97316] transition-all duration-500" style={{ width: `${calculation.percentages.pCargo}%` }} />
                      <div className="h-full bg-[#B8860B] transition-all duration-500" style={{ width: `${calculation.percentages.pMargen}%` }} />
                   </div>
                   <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>Proporción de costos operativos</span>
                      <span>Análisis 100% Preciso</span>
                   </div>
                </div>

                <div className="space-y-5 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#1F3864]" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Costo Base Logístico</span>
                    </div>
                    <span className="text-sm font-mono font-black text-[#1F3864]">{currencyFormatter.format(calculation.costoBaseLogistico)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Prima de Riesgo</span>
                    </div>
                    <span className="text-sm font-mono font-black text-indigo-600">{currencyFormatter.format(calculation.primaRiesgo)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Cargo de Custodia J&J</span>
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900">{currencyFormatter.format(calculation.cargoCustodia)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-dashed">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#B8860B]" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Margen de Utilidad</span>
                    </div>
                    <span className="text-sm font-mono font-black text-[#B8860B]">{currencyFormatter.format(calculation.margenUtilidadValor)}</span>
                  </div>
                </div>

                <div className="text-center space-y-3 pt-6">
                  <p className="text-[10px] font-black text-[#1F3864] uppercase tracking-[0.4em] opacity-60">Tarifa Sugerida al Cliente</p>
                  <h2 className="text-6xl font-mono font-black text-[#1F3864] tracking-tighter drop-shadow-sm">
                    {currencyFormatter.format(calculation.tarifaTotal)}
                    <span className="text-xs font-bold text-slate-400 ml-2">COP</span>
                  </h2>
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-8 bg-white border-t border-slate-100 space-y-6">
             <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3 border border-slate-100">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                  Este cálculo incluye seguimiento satelital y evidencia fotográfica del trayecto.
                </p>
             </div>
             <div className="flex gap-4">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-2xl font-black uppercase text-[11px] h-14 tracking-widest text-slate-400">Cancelar</Button>
                <Button 
                  type="submit" 
                  disabled={isSaving || !!calculation?.requiereRevisionManual} 
                  className="flex-[2] bg-[#1F3864] hover:bg-[#152a4a] text-white font-black uppercase text-xs h-14 rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Confirmar Programación
                </Button>
             </div>
          </div>
        </div>
      </form>
    </Form>
  );
}