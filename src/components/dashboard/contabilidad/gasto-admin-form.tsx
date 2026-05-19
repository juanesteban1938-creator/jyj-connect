
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar as CalendarIcon, User, Tag, Loader2 } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFirestore } from '@/firebase';
import { generarAsientoGastoAdministrativo } from '@/lib/accounting-engine';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  terceroId: z.string().min(1, 'La identificación es requerida'),
  terceroNombre: z.string().min(1, 'El nombre del tercero es requerido'),
  concepto: z.string().min(1, 'El concepto es requerido'),
  categoria: z.enum(['Servicios Públicos', 'Papelería', 'Arriendos', 'Mantenimiento Oficina', 'Seguros', 'Honorarios', 'Otros']),
  valor: z.coerce.number().min(1, 'El valor debe ser mayor a 0'),
});

type FormValues = z.infer<typeof formSchema>;

export function GastoAdminForm({ onDone }: { onDone: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date(),
      terceroId: '',
      terceroNombre: '',
      concepto: '',
      categoria: 'Servicios Públicos',
      valor: 0,
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await generarAsientoGastoAdministrativo(db, {
        ...data,
        fecha: data.fecha.toISOString(),
      });
      toast({ title: "Gasto Administrativo Registrado", description: "El asiento y el GMF han sido generados exitosamente." });
      onDone();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField name="fecha" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <div className="relative">
                        <DatePicker
                            selected={field.value}
                            onChange={(date) => field.onChange(date)}
                            dateFormat="dd/MM/yyyy"
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField name="categoria" control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="rounded-xl h-10"><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            {['Servicios Públicos', 'Papelería', 'Arriendos', 'Mantenimiento Oficina', 'Seguros', 'Honorarios', 'Otros'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage/>
                </FormItem>
            )}/>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField name="terceroId" control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Identificación (NIT/CC)</FormLabel>
                    <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="123..." className="pl-9 rounded-xl h-10" {...field} /></div></FormControl>
                    <FormMessage/>
                </FormItem>
            )} />
            <FormField name="terceroNombre" control={form.control} render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre/Razón Social</FormLabel>
                    <FormControl><Input placeholder="Ej. EPM" className="rounded-xl h-10" {...field} /></FormControl>
                    <FormMessage/>
                </FormItem>
            )} />
        </div>

        <FormField name="concepto" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Concepto / Descripción</FormLabel>
                <FormControl><Input placeholder="Ej. Pago energía mes abril" className="rounded-xl h-10" {...field} /></FormControl>
                <FormMessage/>
            </FormItem>
        )} />

        <FormField name="valor" control={form.control} render={({ field }) => (
            <FormItem>
                <FormLabel>Valor del Gasto</FormLabel>
                <FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input type="number" placeholder="0" className="pl-9 rounded-xl h-12 text-lg font-bold" {...field} /></div></FormControl>
                <FormMessage/>
            </FormItem>
        )} />

        <div className="pt-4">
            <Button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase h-12 rounded-xl shadow-lg shadow-orange-200">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2"/> : null}
                Contabilizar Gasto
            </Button>
        </div>
      </form>
    </Form>
  );
}
