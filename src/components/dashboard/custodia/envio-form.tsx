
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Calculator, ShieldAlert, Loader2, Info, MapPin, Clock, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import type { ConfigCustodia } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  hora: z.string().min(1, 'La hora es requerida'),
  origen: z.string().min(1, 'Punto de recogida requerido'),
  destino: z.string().min(1, 'Punto de entrega requerido'),
  vehiculo: z.enum(['Moto', 'Auto', 'Van']),
  descripcion: z.string().min(1, 'Descripción del paquete requerida'),
  valorDeclarado: z.coerce.number().min(10000, 'Mínimo $10.000 COP'),
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
      valorDeclarado: 500000,
      kmEstimados: 10,
    }
  });

  const valorDeclarado = form.watch('valorDeclarado');
  const kmEstimados = form.watch('kmEstimados');

  const calculation = useMemo(() => {
    if (!config || !valorDeclarado) return null;

    const requiereRevisionManual = valorDeclarado > config.tope_cobertura_estandar;
    
    if (requiereRevisionManual) {
      return { requiereRevisionManual: true };
    }

    const costoFijoUnidad = config.costo_fijo_mensual / config.envios_mes_estimados;
    const costoVariableKM = config.tarifa_por_km * kmEstimados;
    const costoBaseLogistico = costoFijoUnidad + costoVariableKM;
    
    const primaRiesgo = valorDeclarado * config.tasa_riesgo;
    const cargoCustodia = config.cargo_fijo_custodia;
    
    const subtotalAntesMargen = costoBaseLogistico + primaRiesgo + cargoCustodia;
    const margenUtilidadValor = subtotalAntesMargen * config.margen_utilidad;
    
    const tarifaFinalBruta = subtotalAntesMargen + margenUtilidadValor;
    
    // Redondear a múltiplo de 100
    const tarifaFinal = Math.ceil(tarifaFinalBruta / 100) * 100;

    // Porcentajes para la barra visual
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
      tarifaTotal: tarifaFinal,
      requiereRevisionManual: false,
      percentages: { pBase, pPrima, pCargo, pMargen }
    };
  }, [config, valorDeclarado, kmEstimados]);

  const onSubmit = (data: FormValues) => {
    onSave({
      ...data,
      ...calculation,
      subtotal: calculation?.costoBaseLogistico || 0
    });
  };

  if (loadingConfig) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500 h-12 w-12" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2">
        
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN */}
        <div className="p-8 space-y-8 bg-white border-r">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Package className="h-3 w-3 text-orange-500" /> Datos de Logística
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <FormField name="fecha" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Fecha</FormLabel><FormControl><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input type="date" {...field} className="rounded-xl pl-9 h-11" /></div></FormControl></FormItem>
              )} />
              <FormField name="hora" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Hora</FormLabel><FormControl><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input type="time" {...field} className="rounded-xl pl-9 h-11" /></div></FormControl></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <FormField name="origen" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Punto de Recogida</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" /><Input placeholder="Dirección origen" {...field} className="rounded-xl pl-9 h-11" /></div></FormControl></FormItem>
              )} />
              <FormField name="destino" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Punto de Entrega</FormLabel><FormControl><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-500" /><Input placeholder="Dirección destino" {...field} className="rounded-xl pl-9 h-11" /></div></FormControl></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField name="vehiculo" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Unidad Blindada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Moto">Moto Blindada</SelectItem>
                      <SelectItem value="Auto">Auto Escolta</SelectItem>
                      <SelectItem value="Van">Van Blindada</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField name="descripcion" control={form.control} render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Artículo</FormLabel><FormControl><div className="relative"><FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" /><Input placeholder="Ej. Valores" {...field} className="rounded-xl pl-9 h-11" /></div></FormControl></FormItem>
              )} />
            </div>
          </div>

          <Separator />

          <div className="space-y-8">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Parámetros de Cálculo</h4>
            
            {/* KM SLIDER */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black uppercase">Distancia Estimada</label>
                 <span className="text-sm font-black text-orange-600">{kmEstimados} KM</span>
              </div>
              <FormField name="kmEstimados" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Slider 
                      min={1} 
                      max={500} 
                      step={1} 
                      value={[field.value]} 
                      onValueChange={(v) => field.onChange(v[0])} 
                      className="py-4"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* VALOR DECLARADO SLIDER */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black uppercase">Valor Declarado</label>
                 <span className={cn("text-sm font-black", valorDeclarado > (config?.tope_cobertura_estandar || 0) ? "text-rose-600" : "text-orange-600")}>
                  {currencyFormatter.format(valorDeclarado)}
                 </span>
              </div>
              <FormField name="valorDeclarado" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider 
                        min={100000} 
                        max={20000000} 
                        step={100000} 
                        value={[field.value]} 
                        onValueChange={(v) => field.onChange(v[0])} 
                        className="py-4"
                      />
                      <Input 
                        type="number" 
                        {...field} 
                        className="rounded-xl h-11 font-bold text-center bg-slate-50 border-dashed"
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ANÁLISIS DE TARIFA */}
        <div className="p-8 bg-slate-50 flex flex-col justify-between">
          <div className="space-y-8">
            <header className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Calculator className="h-4 w-4 text-orange-500" /> Análisis Financiero Nova
              </h4>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase">
                Tarifa dinámica
              </div>
            </header>

            {calculation?.requiereRevisionManual ? (
              <div className="bg-rose-100 border-2 border-rose-200 p-8 rounded-[2rem] text-center space-y-4 animate-in zoom-in-95 duration-500">
                <ShieldAlert className="h-16 w-16 text-rose-600 mx-auto" />
                <h3 className="text-lg font-black uppercase text-rose-900 leading-tight">Alerta de Cobertura</h3>
                <p className="text-xs text-rose-700 font-medium leading-relaxed">
                  El valor declarado de <b>{currencyFormatter.format(valorDeclarado)}</b> excede el tope de cobertura automática de <b>{currencyFormatter.format(config?.tope_cobertura_estandar || 0)}</b>.
                </p>
                <div className="bg-white/50 p-4 rounded-xl text-[10px] font-bold text-rose-800 uppercase">
                  Requiere aprobación manual de gerencia
                </div>
              </div>
            ) : calculation ? (
              <div className="space-y-10 animate-in fade-in duration-700">
                {/* BARRA SEGMENTADA */}
                <div className="space-y-3">
                   <div className="flex h-4 w-full rounded-full overflow-hidden shadow-inner border border-white">
                      <div className="h-full bg-blue-500" style={{ width: `${calculation.percentages.pBase}%` }} title="Costo Base" />
                      <div className="h-full bg-indigo-500" style={{ width: `${calculation.percentages.pPrima}%` }} title="Prima Riesgo" />
                      <div className="h-full bg-orange-500" style={{ width: `${calculation.percentages.pCargo}%` }} title="Cargo Fijo" />
                      <div className="h-full bg-emerald-500" style={{ width: `${calculation.percentages.pMargen}%` }} title="Margen Utilidad" />
                   </div>
                   <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>Proporción de costos y utilidad</span>
                      <span>100% Analizado</span>
                   </div>
                </div>

                {/* LISTA DE DESGLOSE */}
                <div className="space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Costo Logístico Base</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{currencyFormatter.format(calculation.costoBaseLogistico)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Prima de Riesgo (Seguro)</span>
                    </div>
                    <span className="text-xs font-black text-indigo-600">{currencyFormatter.format(calculation.primaRiesgo)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Cargo Fijo de Custodia</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{currencyFormatter.format(calculation.cargoCustodia)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Margen de Utilidad ({(config?.margen_utilidad || 0) * 100}%)</span>
                    </div>
                    <span className="text-xs font-black text-emerald-600">{currencyFormatter.format(calculation.margenUtilidadValor)}</span>
                  </div>
                </div>

                {/* TARIFA FINAL */}
                <div className="text-center space-y-2 pt-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tarifa Sugerida al Cliente</p>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                    {currencyFormatter.format(calculation.tarifaTotal)}
                    <span className="text-xs font-bold text-slate-400 ml-2">COP</span>
                  </h2>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-12 space-y-4">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-800 font-bold uppercase leading-tight">
                  Al confirmar, se reservará el cupo logístico y se notificará al departamento de seguridad.
                </p>
             </div>
             <div className="flex gap-3">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-14">Cancelar</Button>
                <Button 
                  type="submit" 
                  disabled={isSaving || !!calculation?.requiereRevisionManual} 
                  className="flex-[2] bg-slate-900 hover:bg-black text-white font-black uppercase text-xs h-14 rounded-2xl shadow-2xl transition-all active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Confirmar y Programar
                </Button>
             </div>
          </div>
        </div>

      </form>
    </Form>
  );
}
