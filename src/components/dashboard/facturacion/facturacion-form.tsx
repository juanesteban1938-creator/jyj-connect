
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DollarSign, Wallet, Landmark, Hash, AlertCircle } from 'lucide-react';
import type { Servicio } from '@/lib/types';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  estadoPago: z.enum(['Pendiente', 'Anticipo', 'Pagado', 'Anulado']),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Facturacion']),
  valorServicio: z.coerce.number().optional(),
  costoOperacion: z.coerce.number().optional(),
  anticipo: z.coerce.number().optional(),
  numeroComprobante: z.string().optional(),
  banco: z.string().optional(),
}).refine(data => data.estadoPago !== 'Anticipo' || (data.estadoPago === 'Anticipo' && data.anticipo !== undefined && data.anticipo > 0), {
  message: 'Debe especificar un valor de anticipo',
  path: ['anticipo']
}).refine(data => data.metodoPago !== 'Transferencia' || (data.metodoPago === 'Transferencia' && data.numeroComprobante && data.banco), {
    message: 'Comprobante y banco son requeridos para transferencia',
    path: ['numeroComprobante']
});


export type FacturacionFormValues = z.infer<typeof formSchema>;

type Props = {
  servicio: Servicio;
  onSave: (data: FacturacionFormValues) => void;
  onCancel: () => void;
};

const bancosColombia = [
  "Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente", "Banco Popular", "Banco AV Villas",
  "Itaú Corpbanca Colombia", "Scotiabank Colpatria", "GNB Sudameris", "Banco Caja Social", "Citibank Colombia",
  "Banco Agrario de Colombia", "Bancamía", "Banco W", "Bancoomeva", "Banco Falabella", "Banco Pichincha",
  "Banco Serfinanza", "RappiPay", "Lulo Bank", "Nequi",
];

export function FacturacionForm({ servicio, onSave, onCancel }: Props) {
  
  const form = useForm<FacturacionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      estadoPago: 'Pendiente',
      metodoPago: 'Facturacion',
      valorServicio: 0,
      costoOperacion: 0,
      anticipo: 0,
      numeroComprobante: '',
      banco: '',
    },
  });

  useEffect(() => {
    if (servicio) {
      form.reset({
        metodoPago: servicio.metodoPago,
        valorServicio: servicio.valorServicio,
        costoOperacion: servicio.costoOperacion,
        estadoPago: servicio.estadoPago,
        anticipo: servicio.anticipo,
        numeroComprobante: servicio.numeroComprobante,
        banco: servicio.banco,
      });
    }
  }, [servicio, form]);
  
  const onSubmit = (data: FacturacionFormValues) => {
    onSave(data);
  };
  
  const valorServicio = form.watch('valorServicio') || 0;
  const estadoPago = form.watch('estadoPago');
  const metodoPago = form.watch('metodoPago');

  useEffect(() => {
    if (estadoPago === 'Pagado') {
      form.setValue('anticipo', valorServicio);
    } else if (estadoPago === 'Pendiente' || estadoPago === 'Anulado') {
        form.setValue('anticipo', 0);
    }
  }, [estadoPago, valorServicio, form]);
  
  const anticipo = form.watch('anticipo') || 0;
  const saldo = valorServicio - anticipo;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] w-full pr-4">
         <div className="space-y-8 p-1">
            {/* Estados de Facturación */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Estado de Cuentas</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="estadoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado del Pago</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="Anticipo">Anticipo / Parcial</SelectItem>
                                    <SelectItem value="Pagado">Totalmente Pagado</SelectItem>
                                    <SelectItem value="Anulado">Anulado / Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField name="metodoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Canal de Recaudo</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Efectivo">Efectivo (Directo)</SelectItem>
                                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                                    <SelectItem value="Facturacion">A Facturación Central</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                {metodoPago === 'Transferencia' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/5 p-4 rounded-lg border border-dashed">
                        <FormField name="numeroComprobante" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Número de Operación</FormLabel>
                                <FormControl><div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/><Input placeholder="Ref. Bancaria" className="pl-9" {...field} value={field.value ?? ''} /></div></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="banco" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Entidad Bancaria</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Banco" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {bancosColombia.map(banco => (
                                            <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                )}
            </div>

            {/* Valores Financieros */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Cifras del Servicio</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Venta Bruta</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField name="costoOperacion" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Costo de Operación</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="md:col-span-1"></div>

                    {estadoPago === 'Anticipo' && (
                        <FormField name="anticipo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Monto Anticipado</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" /><Input type="number" className="pl-9 border-primary" {...field} value={field.value ?? ''}/></div></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                     <FormItem className="md:col-span-2">
                        <FormLabel>Saldo en Cartera</FormLabel>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
                            <Input type="text" readOnly disabled className="pl-9 font-bold text-red-600 bg-muted" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldo)} />
                        </div>
                     </FormItem>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="min-w-[150px] font-bold">Actualizar Facturación</Button>
      </div>
      </form>
    </Form>
  );
}
