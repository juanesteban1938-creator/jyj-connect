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
import { DollarSign, Wallet } from 'lucide-react';
import type { Servicio } from '@/app/dashboard/servicios/page';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Facturacion']),
  valorServicio: z.coerce.number().optional(),
  costoOperacion: z.coerce.number().optional(),
  estadoPago: z.enum(['Pendiente', 'Anticipo', 'Pagado', 'Anulado']),
  anticipo: z.coerce.number().optional(),
}).refine(data => data.estadoPago !== 'Anticipo' || (data.estadoPago === 'Anticipo' && data.anticipo !== undefined && data.anticipo > 0), {
  message: 'Debe especificar un valor de anticipo',
  path: ['anticipo']
});

export type FacturacionFormValues = z.infer<typeof formSchema>;

type Props = {
  servicio: Servicio;
  onSave: (data: FacturacionFormValues) => void;
  onCancel: () => void;
};

export function FacturacionForm({ servicio, onSave, onCancel }: Props) {
  
  const form = useForm<FacturacionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metodoPago: 'Facturacion',
      valorServicio: 0,
      costoOperacion: 0,
      estadoPago: 'Pendiente',
      anticipo: 0
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
      });
    }
  }, [servicio, form]);
  
  const onSubmit = (data: FacturacionFormValues) => {
    onSave(data);
  };
  
  const valorServicio = form.watch('valorServicio') || 0;
  const estadoPago = form.watch('estadoPago');
  const anticipo = estadoPago === 'Anticipo' ? (form.watch('anticipo') || 0) : 0;
  const saldo = valorServicio - anticipo;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] w-full">
         <div className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Datos Financieros</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <FormField name="metodoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Método de Pago</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Efectivo">Pago en Efectivo</SelectItem>
                                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                                    <SelectItem value="Facturacion">A Facturación</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField name="estadoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado del Pago</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    <SelectItem value="Anticipo">Anticipo</SelectItem>
                                    <SelectItem value="Pagado">Pagado</SelectItem>
                                    <SelectItem value="Anulado">Anulado</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Venta Servicio</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField name="costoOperacion" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Costo Operación</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    {estadoPago === 'Anticipo' && (
                        <FormField name="anticipo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Valor Anticipo</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''}/></div></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                     <FormItem>
                        <FormLabel>Saldo Pendiente</FormLabel>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="text" readOnly disabled className="pl-9 font-semibold" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldo)} />
                        </div>
                     </FormItem>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
        </Button>
        <Button type="submit">
          Guardar Cambios
        </Button>
      </div>
      </form>
    </Form>
  );
}
