
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, ShieldCheck, Shield, Wrench, FileText, Users, Tag, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Vehiculo } from '@/lib/types';
import { useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  marca: z.string().min(1, 'La marca es requerida'),
  linea: z.string().min(1, 'La línea es requerida'),
  modelo: z.string().min(4, 'El año debe tener 4 dígitos').max(4, 'El año debe tener 4 dígitos'),
  placa: z.string().min(1, 'La placa es requerida'),
  tipoVehiculo: z.enum(['BUS', 'BUSETA', 'MICROBUS', 'CAMIONETA', 'OTRO']),
  capacidad: z.coerce.number().min(1, 'La capacidad debe ser mayor a 0'),
  numeroPolizaSoat: z.string().optional(),
  vencimientoSoat: z.date().optional(),
  numeroPolizaRcc: z.string().optional(),
  vencimientoRcc: z.date().optional(),
  numeroPolizaRce: z.string().optional(),
  vencimientoRce: z.date().optional(),
  vencimientoTecnomecanica: z.date().optional(),
  vencimientoTarjetaOperacion: z.date().optional(),
});

type VehiculoFormValues = z.infer<typeof formSchema>;

type Props = {
  vehiculo: Vehiculo | null;
  onSave: (vehiculo: Omit<Vehiculo, 'id'>) => void;
  onCancel: () => void;
};

const DatePickerField = ({ name, control, label }: { name: any, control: any, label: string }) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>{label}</FormLabel>
                    <div className="relative">
                        <DatePicker
                            selected={field.value}
                            onChange={(date) => field.onChange(date)}
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Seleccione fecha"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export function VehiculoForm({ vehiculo, onSave, onCancel }: Props) {
  const form = useForm<VehiculoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marca: '',
      linea: '',
      modelo: '',
      placa: '',
      capacidad: 0,
      tipoVehiculo: 'BUS',
      numeroPolizaSoat: '',
      numeroPolizaRcc: '',
      numeroPolizaRce: '',
    },
  });

  useEffect(() => {
    if (vehiculo) {
      form.reset({
        ...vehiculo,
        capacidad: Number(vehiculo.capacidad),
        vencimientoSoat: vehiculo.vencimientoSoat ? new Date(vehiculo.vencimientoSoat) : undefined,
        vencimientoRcc: vehiculo.vencimientoRcc ? new Date(vehiculo.vencimientoRcc) : undefined,
        vencimientoRce: vehiculo.vencimientoRce ? new Date(vehiculo.vencimientoRce) : undefined,
        vencimientoTecnomecanica: vehiculo.vencimientoTecnomecanica ? new Date(vehiculo.vencimientoTecnomecanica) : undefined,
        vencimientoTarjetaOperacion: vehiculo.vencimientoTarjetaOperacion ? new Date(vehiculo.vencimientoTarjetaOperacion) : undefined,
      });
    } else {
      form.reset({
        marca: '',
        linea: '',
        modelo: '',
        placa: '',
        capacidad: 0,
        tipoVehiculo: 'BUS',
        numeroPolizaSoat: '',
        vencimientoSoat: undefined,
        numeroPolizaRcc: '',
        vencimientoRcc: undefined,
        numeroPolizaRce: '',
        vencimientoRce: undefined,
        vencimientoTecnomecanica: undefined,
        vencimientoTarjetaOperacion: undefined,
      });
    }
  }, [vehiculo, form]);
  
  const onSubmit = async (data: VehiculoFormValues) => {
    try {
      const vehiculoData = {
          ...data,
          vencimientoSoat: data.vencimientoSoat?.toISOString(),
          vencimientoRcc: data.vencimientoRcc?.toISOString(),
          vencimientoRce: data.vencimientoRce?.toISOString(),
          vencimientoTecnomecanica: data.vencimientoTecnomecanica?.toISOString(),
          vencimientoTarjetaOperacion: data.vencimientoTarjetaOperacion?.toISOString(),
      };
      await onSave(vehiculoData);
    } catch (error) {
      console.error("Error al guardar vehículo:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full">
         <div className="space-y-8 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Información Técnica del Vehículo</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField name="marca" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej. Chevrolet" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="linea" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Línea / Referencia</FormLabel><FormControl><Input placeholder="Ej. NHR" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="modelo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Modelo (Año)</FormLabel><FormControl><Input placeholder="2024" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <FormField name="tipoVehiculo" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Vehículo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>{['BUS', 'BUSETA', 'MICROBUS', 'CAMIONETA', 'OTRO'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="capacidad" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Capacidad (Pasajeros)</FormLabel><FormControl><div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="placa" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Placa (Matrícula)</FormLabel><FormControl><div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="XXX-000" className="pl-9 font-bold uppercase" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Vencimientos y Seguros</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="shadow-sm border-muted">
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 bg-muted/5"><ShieldCheck className="h-4 w-4 text-green-600"/><CardTitle className="text-sm font-bold uppercase">SOAT</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4">
                            <FormField name="numeroPolizaSoat" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Número de Póliza</FormLabel><FormControl><Input placeholder="123456789" className="h-9" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoSoat" control={form.control} label="Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-muted">
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 bg-muted/5"><Shield className="h-4 w-4 text-blue-600"/><CardTitle className="text-sm font-bold uppercase">Póliza RCC</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4">
                            <FormField name="numeroPolizaRcc" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Número de Póliza</FormLabel><FormControl><Input placeholder="RCC-001" className="h-9" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoRcc" control={form.control} label="Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-muted">
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 bg-muted/5"><Shield className="h-4 w-4 text-blue-600"/><CardTitle className="text-sm font-bold uppercase">Póliza RCE</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4">
                            <FormField name="numeroPolizaRce" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Número de Póliza</FormLabel><FormControl><Input placeholder="RCE-001" className="h-9" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoRce" control={form.control} label="Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-muted">
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 bg-muted/5"><Wrench className="h-4 w-4 text-gray-600"/><CardTitle className="text-sm font-bold uppercase">Tecnomecánica</CardTitle></CardHeader>
                        <CardContent className="p-4"><DatePickerField name="vencimientoTecnomecanica" control={form.control} label="Vencimiento Certificado" /></CardContent>
                    </Card>
                    <Card className="shadow-sm border-muted">
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 bg-muted/5"><FileText className="h-4 w-4 text-purple-600"/><CardTitle className="text-sm font-bold uppercase">Tarjeta Operación</CardTitle></CardHeader>
                        <CardContent className="p-4"><DatePickerField name="vencimientoTarjetaOperacion" control={form.control} label="Vencimiento Tarjeta" /></CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="min-w-[150px] font-bold">Guardar Vehículo</Button>
      </div>
      </form>
    </Form>
  );
}
