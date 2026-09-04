
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ShieldAlert, 
  Loader2, 
  MapPin, 
  Clock, 
  Calendar, 
  CheckCircle2,
  DollarSign,
  User,
  Lock,
  Mail,
  Briefcase
} from 'lucide-react';
import type { ConfigCustodia, Envio } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const países = [
  { code: '+57', label: '🇨🇴 +57', name: 'Colombia' },
  { code: '+1', label: '🇺🇸 +1', name: 'EE.UU. / Canadá' },
  { code: '+507', label: '🇵🇦 +507', name: 'Panamá' },
  { code: '+52', label: '🇲🇽 +52', name: 'México' },
  { code: '+58', label: '🇻🇪 +58', name: 'Venezuela' },
  { code: '+34', label: '🇪🇸 +34', name: 'España' },
];

const formSchema = z.object({
  clienteNombre: z.string().min(1, 'El nombre es requerido'),
  nitCliente: z.string().min(1, 'El NIT es requerido'),
  prefijoTelefono: z.string().default('+57'),
  telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
  emailCliente: z.string().email('El correo no es válido').optional().or(z.literal('')),
  fecha: z.string().min(1, 'La fecha es requerida'),
  hora: z.string().min(1, 'La hora es requerida'),
  origen: z.string().min(1, 'Punto de recogida requerido'),
  destino: z.string().min(1, 'Punto de entrega requerido'),
  vehiculo: z.enum(['Moto', 'Auto', 'Van']),
  descripcion: z.string().min(1, 'Descripción del paquete requerida'),
  valorDeclarado: z.coerce.number().min(0, 'Mínimo $0 COP'),
  kmEstimados: z.coerce.number().min(1, 'Mínimo 1 KM'),
  security_pin: z.string().length(4, 'El PIN debe ser de 4 dígitos'),
});

type FormValues = z.infer<typeof formSchema>;

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

interface EnvioFormProps {
  envio?: Envio | null;
  onSave: (data: any) => void;
  isSaving: boolean;
  onCancel: () => void;
}

export function EnvioForm({ envio, onSave, isSaving, onCancel }: EnvioFormProps) {
  const db = useFirestore();
  const configRef = useMemoFirebase(() => doc(db, 'configuracion_custodia', 'global'), [db]);
  const { data: config, isLoading: loadingConfig } = useDoc<ConfigCustodia>(configRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteNombre: '',
      nitCliente: '',
      prefijoTelefono: '+57',
      telefonoCliente: '',
      emailCliente: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: '08:00',
      origen: '',
      destino: '',
      vehiculo: 'Auto',
      descripcion: '',
      valorDeclarado: 0,
      kmEstimados: 1,
      security_pin: '1234',
    }
  });

  useEffect(() => {
    if (envio) {
      let prefijoEncontrado = '+57';
      let numeroLimpio = envio.telefonoCliente || '';
      
      for (const p of países) {
          if (numeroLimpio.startsWith(p.code)) {
              prefijoEncontrado = p.code;
              numeroLimpio = numeroLimpio.replace(p.code, '');
              break;
          }
      }

      form.reset({
        clienteNombre: envio.clienteNombre || '',
        nitCliente: envio.nitCliente || '',
        prefijoTelefono: prefijoEncontrado,
        telefonoCliente: numeroLimpio,
        emailCliente: envio.emailCliente || '',
        fecha: envio.fecha || new Date().toISOString().split('T')[0],
        hora: envio.hora || '08:00',
        origen: envio.origen || '',
        destino: envio.destino || '',
        vehiculo: envio.vehiculo || 'Auto',
        descripcion: envio.descripcion || '',
        valorDeclarado: envio.valorDeclarado || 0,
        kmEstimados: envio.kmEstimados || 1,
        security_pin: envio.security_pin || '1234',
      });
    }
  }, [envio, form]);

  const valorDeclaradoInput = form.watch('valorDeclarado');
  const kmEstimados = form.watch('kmEstimados');

  const calculation = useMemo(() => {
    if (!config) return null;

    const valorReal = valorDeclaradoInput > 0 ? valorDeclaradoInput : config.valor_declarado_minimo;
    const superaTope = valorReal > config.tope_cobertura_estandar;
    
    if (superaTope) {
      return { requiereRevisionManual: true, plan: 'Corporativo', valorReal };
    }

    const costoBaseLogistico = (config.costo_fijo_mensual / config.envios_mes_estimados) + (config.tarifa_por_km * kmEstimados);
    const primaRiesgo = valorReal * config.tasa_riesgo;
    const cargoCustodia = config.cargo_fijo_custodia;
    
    const subtotal = costoBaseLogistico + primaRiesgo + cargoCustodia;
    const margenUtilidadValor = subtotal * config.margen_utilidad;
    
    const tarifaTotal = Math.ceil((subtotal + margenUtilidadValor) / 10) * 10;

    let plan: 'Esencial' | 'Seguro' | 'Corporativo' = 'Esencial';
    if ((valorReal / config.tope_cobertura_estandar) > 0.35) plan = 'Seguro';

    const totalParts = costoBaseLogistico + primaRiesgo + cargoCustodia + margenUtilidadValor;
    const pBase = (costoBaseLogistico / totalParts) * 100;
    const pRiesgo = (primaRiesgo / totalParts) * 100;
    const pCargo = (cargoCustodia / totalParts) * 100;
    const pMargen = (margenUtilidadValor / totalParts) * 100;

    return {
      costoBaseLogistico,
      primaRiesgo,
      cargoCustodia,
      margenUtilidadValor,
      tarifaTotal,
      plan,
      valorReal,
      requiereRevisionManual: false,
      percentages: { pBase, pRiesgo, pCargo, pMargen }
    };
  }, [config, valorDeclaradoInput, kmEstimados]);

  const onSubmit = (data: FormValues) => {
    const telefonoFinal = `${data.prefijoTelefono}${data.telefonoCliente.replace(/\D/g, '')}`;
    onSave({
      ...data,
      telefonoCliente: telefonoFinal,
      ...calculation,
    });
  };

  if (loadingConfig) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500 h-10 w-10" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">
        
        {/* BLOQUE IZQUIERDO: DATOS DE COTIZACIÓN */}
        <div className="lg:col-span-7 p-8 sm:p-10 space-y-8 bg-white">
          <header className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {envio ? 'Editar Envío Blindado' : 'Cotizador de Envío'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingrese los parámetros logísticos</p>
          </header>

          <ScrollArea className="h-[550px] pr-4">
            <div className="space-y-8">
              {/* Sección Cliente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <Briefcase className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Información del Cliente</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="clienteNombre" control={form.control} render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[9px] font-black uppercase text-slate-400">Nombre / Razón Social</FormLabel><FormControl><Input placeholder="Ej. Tech Solutions" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <FormField name="nitCliente" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-slate-400">NIT / Cédula</FormLabel><FormControl><Input placeholder="1234567-8" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <div className="space-y-2">
                    <FormLabel className="text-[9px] font-black uppercase text-slate-400">Teléfono</FormLabel>
                    <div className="flex gap-2">
                      <FormField name="prefijoTelefono" control={form.control} render={({ field }) => (
                        <FormItem className="w-[100px] shrink-0">
                          <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-11 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{países.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField name="telefonoCliente" control={form.control} render={({ field }) => (
                        <FormItem className="flex-1"><FormControl><Input placeholder="3001234567" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Sección Logística */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Detalles del Traslado</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="fecha" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-slate-400">Fecha Recogida</FormLabel><FormControl><Input type="date" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <FormField name="hora" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-slate-400">Hora Recogida</FormLabel><FormControl><Input type="time" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <FormField name="origen" control={form.control} render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[9px] font-black uppercase text-slate-400">Punto de Origen</FormLabel><FormControl><Input placeholder="Dirección completa..." {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <FormField name="destino" control={form.control} render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[9px] font-black uppercase text-slate-400">Punto de Destino</FormLabel><FormControl><Input placeholder="Dirección completa..." {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                  <FormField name="descripcion" control={form.control} render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel className="text-[9px] font-black uppercase text-slate-400">Descripción del Paquete</FormLabel><FormControl><Input placeholder="Ej. Laptop MacBook Pro 2024" {...field} className="rounded-xl h-11" /></FormControl></FormItem>
                  )} />
                </div>
              </div>

              <Separator className="bg-slate-100" />

              {/* Sliders Financieros */}
              <div className="space-y-10 pb-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Distancia Estimada</label>
                    <span className="text-2xl font-mono font-black text-orange-500">{kmEstimados} <span className="text-xs text-slate-400">KM</span></span>
                  </div>
                  <FormField name="kmEstimados" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Slider 
                          min={1} max={60} step={1} 
                          value={[field.value]} 
                          onValueChange={(v) => field.onChange(v[0])} 
                          className="py-4 accent-orange-500"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor Comercial Declarado</label>
                    <span className="text-2xl font-mono font-black text-orange-500">{currencyFormatter.format(valorDeclaradoInput)}</span>
                  </div>
                  <FormField name="valorDeclarado" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider 
                            min={0} max={6000000} step={50000} 
                            value={[field.value]} 
                            onValueChange={(v) => field.onChange(v[0])} 
                            className="py-2 accent-orange-500"
                          />
                          <div className="relative max-w-[240px]">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            <Input 
                              type="number" 
                              {...field} 
                              className="pl-9 rounded-xl h-11 font-mono font-bold bg-slate-50 border-slate-200"
                            />
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {/* PIN DE SEGURIDAD */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Lock className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">PIN de Seguridad para Entrega</span>
                  </div>
                  <FormField name="security_pin" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          maxLength={4} 
                          placeholder="1234" 
                          {...field} 
                          className="w-32 h-12 text-center text-2xl font-mono font-black tracking-widest rounded-xl border-slate-200"
                        />
                      </FormControl>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 italic">* Proporciona este PIN al destinatario.</p>
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* BLOQUE DERECHO: DESGLOSE NAVY/BLANCO */}
        <div className="lg:col-span-5 flex flex-col shadow-2xl">
          <div className="bg-[#1F3864] p-8 sm:p-10 text-white flex flex-col justify-center min-h-[220px] relative">
            <div className="absolute top-8 right-8">
              {calculation && (
                <Badge className={cn(
                  "font-black uppercase text-[8px] tracking-[0.15em] px-3 py-1 rounded-full border-none",
                  calculation.plan === 'Esencial' ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                )}>
                  Plan {calculation.plan}
                </Badge>
              )}
            </div>
            
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] mb-4">Tarifa sugerida al cliente</p>
            {calculation?.requiereRevisionManual ? (
              <div className="flex items-center gap-3 text-rose-400">
                <ShieldAlert className="h-8 w-8" />
                <h2 className="text-xl font-black uppercase leading-tight">Revisión Manual Requerida</h2>
              </div>
            ) : calculation ? (
              <h2 className="text-5xl sm:text-6xl font-mono font-black tracking-tighter">
                {currencyFormatter.format(calculation.tarifaTotal)}
              </h2>
            ) : null}
          </div>

          <div className="flex-1 bg-white p-8 sm:p-10 space-y-8">
            <div className="space-y-4">
               {calculation && !calculation.requiereRevisionManual && (
                 <>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 border border-slate-50 shadow-inner">
                    <div className="h-full bg-[#1F3864] transition-all" style={{ width: `${calculation.percentages.pBase}%` }} />
                    <div className="h-full bg-[#4F46E5] transition-all" style={{ width: `${calculation.percentages.pRiesgo}%` }} />
                    <div className="h-full bg-[#F97316] transition-all" style={{ width: `${calculation.percentages.pCargo}%` }} />
                    <div className="h-full bg-[#B8860B] transition-all" style={{ width: `${calculation.percentages.pMargen}%` }} />
                  </div>

                  <div className="space-y-4 pt-4">
                    {[
                      { label: 'Costo Operativo Base', val: calculation.costoBaseLogistico, color: 'bg-[#1F3864]' },
                      { label: 'Prima de Riesgo', val: calculation.primaRiesgo, color: 'bg-[#4F46E5]' },
                      { label: 'Cargo de Custodia J&J', val: calculation.cargoCustodia, color: 'bg-[#F97316]' },
                      { label: 'Margen de Utilidad', val: calculation.margenUtilidadValor, color: 'bg-[#B8860B]' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-2.5 w-2.5 rounded-full", row.color)} />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                        </div>
                        <span className="text-sm font-mono font-bold text-slate-800">{currencyFormatter.format(row.val)}</span>
                      </div>
                    ))}
                  </div>
                 </>
               )}
            </div>

            <div className="pt-8 flex flex-col gap-3">
               <Button 
                type="submit" 
                disabled={isSaving || !!calculation?.requiereRevisionManual} 
                className="w-full h-14 bg-[#1F3864] hover:bg-[#152a4a] text-white font-black uppercase text-xs rounded-2xl shadow-2xl transition-all"
               >
                 {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                 {envio ? 'Guardar Cambios' : 'Confirmar y Programar Envío'}
               </Button>
               <Button type="button" variant="ghost" onClick={onCancel} className="text-[10px] font-black uppercase text-slate-400">Cancelar</Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
