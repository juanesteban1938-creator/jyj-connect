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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/jj-ui/calendar';
import { CalendarIcon, Car, ShieldCheck, Shield, Wrench, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Vehiculo } from '@/app/dashboard/vehiculos/page';
import { useState, useEffect } from 'react';
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
    const [isOpen, setIsOpen] = useState(false);
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>{label}</FormLabel>
                    <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={'outline'}
                                    type="button"
                                    className={cn(
                                        'w-full pl-3 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                >
                                    {field.value ? (
                                        format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                        <span>Seleccione fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-0"
                            align="start"
                            onInteractOutside={(e) => e.preventDefault()}
                            onPointerDownOutside={(e) => e.preventDefault()}
                        >
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                    field.onChange(date);
                                    setIsOpen(false);
                                }}
                                disabled={(date) => date < new Date('1900-01-01')}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
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
  
  const onSubmit = (data: VehiculoFormValues) => {
    const vehiculoData = {
        ...data,
        vencimientoSoat: data.vencimientoSoat?.toISOString(),
        vencimientoRcc: data.vencimientoRcc?.toISOString(),
        vencimientoRce: data.vencimientoRce?.toISOString(),
        vencimientoTecnomecanica: data.vencimientoTecnomecanica?.toISOString(),
        vencimientoTarjetaOperacion: data.vencimientoTarjetaOperacion?.toISOString(),
    };
    onSave(vehiculoData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full">
         <div className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Datos Generales</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField name="marca" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ej: Chevrolet" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="linea" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Línea</FormLabel><FormControl><Input placeholder="Ej: NHR" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="modelo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Modelo (Año)</FormLabel><FormControl><Input placeholder="Ej: 2024" type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField name="tipoVehiculo" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Vehículo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {['BUS', 'BUSETA', 'MICROBUS', 'CAMIONETA', 'OTRO'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="capacidad" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Capacidad (Pasajeros)</FormLabel><FormControl><div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="placa" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="XXX-000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Documentación y Vencimientos</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4"><ShieldCheck className="h-5 w-5 text-green-600"/><CardTitle className="text-base">SOAT</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4 pt-0">
                            <FormField name="numeroPolizaSoat" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Número de Póliza</FormLabel><FormControl><Input placeholder="Ej: 123456789" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoSoat" control={form.control} label="Fecha Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4"><Shield className="h-5 w-5 text-blue-600"/><CardTitle className="text-base">Póliza RCC</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4 pt-0">
                            <FormField name="numeroPolizaRcc" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Número de Póliza</FormLabel><FormControl><Input placeholder="Ej: RCC-001" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoRcc" control={form.control} label="Fecha Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4"><Shield className="h-5 w-5 text-blue-600"/><CardTitle className="text-base">Póliza RCE</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4 pt-0">
                            <FormField name="numeroPolizaRce" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Número de Póliza</FormLabel><FormControl><Input placeholder="Ej: RCE-001" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DatePickerField name="vencimientoRce" control={form.control} label="Fecha Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4"><Wrench className="h-5 w-5 text-gray-600"/><CardTitle className="text-base">Tecnomecánica</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4 pt-0">
                             <DatePickerField name="vencimientoTecnomecanica" control={form.control} label="Fecha Vencimiento" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex-row items-center gap-2 space-y-0 p-4"><FileText className="h-5 w-5 text-purple-600"/><CardTitle className="text-base">Tarjeta de Operación</CardTitle></CardHeader>
                        <CardContent className="space-y-4 p-4 pt-0">
                            <DatePickerField name="vencimientoTarjetaOperacion" control={form.control} label="Fecha Vencimiento" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
        </Button>
        <Button type="submit">
          Guardar Vehículo
        </Button>
      </div>
      </form>
    </Form>
  );
}
