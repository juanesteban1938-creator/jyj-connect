
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
import { Calculator, ShieldAlert, Loader2, Info } from 'lucide-react';
import type { ConfigCustodia, Envio } from '@/lib/custodia-types';
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
    const subtotalBase = costoFijoUnidad + costoVariableKM + config.cargo_fijo_custodia;
    
    const primaRiesgo = valorDeclarado * config.tasa_riesgo;
    const subtotalConSeguro = subtotalBase + primaRiesgo;
    
    const tarifaFinalBruta = subtotalConSeguro * (1 + config.margen_utilidad);
    
    // Redondear a múltiplo de 100
    const tarifaFinal = Math.ceil(tarifaFinalBruta / 100) * 100;

    return {
      subtotal: subtotalBase,
      primaRiesgo,
      tarifaTotal: tarifaFinal,
      requiereRevisionManual: false
    };
  }, [config, valorDeclarado, kmEstimados]);

  const onSubmit = (data: FormValues) => {
    onSave({
      ...data,
      ...calculation,
    });
  };

  if (loadingConfig) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField name="fecha" control={form.control} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Fecha Recogida</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl></FormItem>
          )} />
          <FormField name="hora" control={form.control} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Hora Aproximada</FormLabel><FormControl><Input type="time" {...field} className="rounded-xl" /></FormControl></FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField name="origen" control={form.control} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Origen</FormLabel><FormControl><Input placeholder="Dirección completa" {...field} className="rounded-xl" /></FormControl></FormItem>
          )} />
          <FormField name="destino" control={form.control} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Destino</FormLabel><FormControl><Input placeholder="Dirección completa" {...field} className="rounded-xl" /></FormControl></FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField name="vehiculo" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase">Vehículo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Moto">Moto Blindada</SelectItem>
                  <SelectItem value="Auto">Auto Escolta</SelectItem>
                  <SelectItem value="Van">Van Blindada</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField name="kmEstimados" control={form.control} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Distancia (KM)</FormLabel><FormControl><Input type="number" {...field} className="rounded-xl" /></FormControl></FormItem>
          )} />
          <FormField name="valorDeclarado" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black uppercase text-orange-600">Valor Declarado</FormLabel>
              <FormControl><Input type="number" placeholder="$ 0" {...field} className="rounded-xl border-orange-200 font-bold" /></FormControl>
            </FormItem>
          )} />
        </div>

        <FormField name="descripcion" control={form.control} render={({ field }) => (
          <FormItem><FormLabel className="text-[10px] font-black uppercase">Descripción del Paquete</FormLabel><FormControl><Input placeholder="Ej. Documentación bancaria / Joyería" {...field} className="rounded-xl" /></FormControl></FormItem>
        )} />

        <Separator />

        {/* ÁREA DE CALCULADORA */}
        <div className="bg-slate-50 p-6 rounded-[2rem] border border-dashed border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-slate-400" />
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Cotización de Riesgo Nova</h4>
          </div>

          {calculation?.requiereRevisionManual ? (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-rose-900 uppercase">Monto Excede Cobertura Estándar</p>
                <p className="text-[10px] text-rose-700 font-medium leading-tight mt-1">
                  El valor declarado supera los ${(config?.tope_cobertura_estandar || 0).toLocaleString()}. El servicio requiere aprobación de la dirección técnica.
                </p>
              </div>
            </div>
          ) : calculation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Subtotal Operativo</p>
                  <p className="text-sm font-bold text-slate-700">${calculation.subtotal.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Prima de Seguro (1.5%)</p>
                  <p className="text-sm font-bold text-indigo-600">${calculation.primaRiesgo.toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Total a Cobrar</p>
                <p className="text-2xl font-black text-orange-600 tracking-tight">
                  ${calculation.tarifaTotal.toLocaleString()}
                  <span className="text-[10px] font-bold text-slate-400 ml-1">COP</span>
                </p>
              </div>
            </div>
          ) : (
             <div className="flex items-center gap-2 text-slate-400 py-4 italic">
                <Info className="h-4 w-4" />
                <p className="text-[10px] font-medium uppercase">Ingrese el valor declarado para calcular tarifa</p>
             </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={onCancel} className="font-bold uppercase text-[10px]">Cancelar</Button>
          <Button 
            type="submit" 
            disabled={isSaving || !!calculation?.requiereRevisionManual} 
            className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs h-12 px-10 rounded-2xl shadow-xl"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : "Confirmar y Programar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
