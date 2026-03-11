
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
import { DollarSign, Wallet, Landmark, Hash } from 'lucide-react';
import type { Servicio } from '@/lib/types';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  valorAbono: z.coerce.number().positive('El valor del abono debe ser mayor a cero'),
  nuevoEstadoPago: z.enum(['Anticipo', 'Pagado']),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Facturacion']),
  numeroComprobante: z.string().optional(),
  banco: z.string().optional(),
}).refine(data => data.metodoPago !== 'Transferencia' || (data.metodoPago === 'Transferencia' && data.numeroComprobante && data.banco), {
    message: 'Comprobante y banco son requeridos para transferencia',
    path: ['numeroComprobante']
});

export type AbonoFormValues = z.infer<typeof formSchema>;

type Props = {
  servicio: Servicio;
  onSave: (data: AbonoFormValues) => void;
  onCancel: () => void;
  isProcessing?: boolean;
};

const bancosColombia = [
  "Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente", "Banco Popular", "Banco AV Villas",
  "Itaú Corpbanca Colombia", "Scotiabank Colpatria", "GNB Sudameris", "Banco Caja Social", "Citibank Colombia",
  "Banco Agrario de Colombia", "Bancamía", "Banco W", "Bancoomeva", "Banco Falabella", "Banco Pichincha",
  "Banco Serfinanza", "RappiPay", "Lulo Bank", "Nequi",
];

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export function AbonoForm({ servicio, onSave, onCancel, isProcessing }: Props) {
  
  const form = useForm<AbonoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valorAbono: 0,
      nuevoEstadoPago: 'Anticipo',
      metodoPago: 'Efectivo',
      numeroComprobante: '',
      banco: '',
    },
  });

  const onSubmit = (data: AbonoFormValues) => {
    onSave(data);
  };
  
  const valorAbono = form.watch('valorAbono') || 0;
  const saldoAnterior = servicio.saldo || 0;
  const nuevoSaldo = saldoAnterior - valorAbono;
  const metodoPago = form.watch('metodoPago');

  useEffect(() => {
    if (nuevoSaldo <= 0) {
      form.setValue('nuevoEstadoPago', 'Pagado');
    } else {
      form.setValue('nuevoEstadoPago', 'Anticipo');
    }
  }, [nuevoSaldo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6 p-1">
            <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Registro de Pago</h3>
            </div>
            <Separator className="bg-primary/20" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormItem>
                    <FormLabel>Saldo Actual Pendiente</FormLabel>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="text" readOnly disabled className="pl-9 font-bold text-red-600 bg-muted" value={currencyFormatter.format(saldoAnterior)} />
                    </div>
                </FormItem>
                <FormField name="valorAbono" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valor del Nuevo Abono</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                <Input type="number" className="pl-9 font-bold border-primary" placeholder="0.00" {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="metodoPago" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Método de Pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Efectivo">Pago en Efectivo</SelectItem>
                                <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormItem>
                    <FormLabel>Saldo Restante</FormLabel>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="text" readOnly disabled className="pl-9 font-bold bg-muted" value={currencyFormatter.format(Math.max(0, nuevoSaldo))} />
                    </div>
                 </FormItem>
            </div>
            
            {metodoPago === 'Transferencia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-lg border border-dashed">
                    <FormField name="numeroComprobante" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Número de Comprobante / Ref</FormLabel>
                            <FormControl><div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/><Input placeholder="Ej. 123456" className="pl-9" {...field} value={field.value ?? ''} /></div></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="banco" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Banco de Destino</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder="Seleccione banco" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <ScrollArea className="h-48">
                                    {bancosColombia.map(banco => (
                                        <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                                    ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            )}
        </div>
        <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="min-w-[150px] font-bold" disabled={isProcessing}>Registrar Abono</Button>
        </div>
      </form>
    </Form>
  );
}
