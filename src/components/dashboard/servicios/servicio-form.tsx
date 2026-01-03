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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/jj-ui/calendar';
import { Calendar as CalendarIcon, User, Briefcase, MapPin, DollarSign, GripVertical, MinusCircle, Search, Truck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
    nombreCliente: z.string().min(1, 'El nombre es requerido'),
    nitCliente: z.string().min(1, 'El NIT es requerido'),
    telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
    conductor: z.string().optional(),
    vehiculo: z.string().optional(),
    fechaRecogida: z.date({ required_error: 'La fecha es requerida' }),
    horaRecogida: z.string({ required_error: 'La hora es requerida' }),
    direccionRecogida: z.string().min(1, 'La dirección es requerida'),
    paradaAdicional: z.string().optional(),
    direccionDestino: z.string().min(1, 'El destino es requerido'),
    valorServicio: z.coerce.number().optional(),
    anticipo: z.coerce.number().optional(),
});

export type ServicioFormValues = z.infer<typeof formSchema>;

type Props = {
  onSave: (data: ServicioFormValues) => void;
  onCancel: () => void;
};

export function ServicioForm({ onSave, onCancel }: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const form = useForm<ServicioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreCliente: '',
      nitCliente: '',
      telefonoCliente: '',
      conductor: '',
      vehiculo: '',
      horaRecogida: '',
      direccionRecogida: '',
      paradaAdicional: '',
      direccionDestino: '',
      valorServicio: 0,
      anticipo: 0
    },
  });

  const valorServicio = form.watch('valorServicio') || 0;
  const anticipo = form.watch('anticipo') || 0;
  const saldo = valorServicio - anticipo;
  
  const onSubmit = (data: ServicioFormValues) => {
    onSave(data);
  };

  const OrigenIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7.5" fill="white" stroke="#22C55E"/>
        <circle cx="8" cy="8" r="4" fill="#22C55E"/>
    </svg>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full">
         <div className="space-y-6 p-1">
            
            {/* Información del Cliente */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Información del Cliente</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField name="nombreCliente" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel>Nombre del Cliente / Razón Social</FormLabel><FormControl><Input placeholder="Ej. Tech Solutions SAS" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="nitCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>NIT / Cédula</FormLabel><FormControl><Input placeholder="Ej. 900.123.456-1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="telefonoCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input placeholder="Ej. +57 300 123 4567" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>
            
            <Separator />
            
            {/* Recursos Asignados */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Recursos Asignados</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField name="conductor" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Conductor</FormLabel><FormControl><div className="relative"><Input className="pr-10" placeholder="Buscar o escribir nombre..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField name="vehiculo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Vehículo</FormLabel><FormControl><div className="relative"><Input className="pr-10" placeholder="Placa o tipo..." {...field} value={field.value ?? ''} /><Truck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>

            <Separator />

            {/* Detalles de Ruta */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Detalles de Ruta</h3>
                </div>
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="fechaRecogida"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Recogida</FormLabel>
                            <Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                                        <span>Seleccione una fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent 
                                    className="w-auto p-0" 
                                    align="start"
                                    onPointerDownOutside={(e) => e.preventDefault()}
                                >
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                            field.onChange(date);
                                            setIsCalendarOpen(false);
                                        }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="horaRecogida"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Hora de Recogida</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <div className="space-y-2">
                    <FormLabel>Dirección de Recogida</FormLabel>
                    <FormField name="direccionRecogida" control={form.control} render={({ field }) => (
                        <FormItem><FormControl><div className="relative"><Input className="pl-9" placeholder="Dirección principal..." {...field} /><div className="absolute left-3 top-1/2 -translate-y-1/2"><OrigenIcon /></div></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="paradaAdicional" control={form.control} render={({ field }) => (
                        <FormItem><FormControl><div className="relative"><Input className="pl-9" placeholder="Segunda parada (opcional)..." {...field} value={field.value ?? ''} /><GripVertical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><MinusCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 cursor-pointer" /></div></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField name="direccionDestino" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Dirección de Destino</FormLabel><FormControl><div className="relative"><Input className="pl-9" placeholder="Destino final..." {...field} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /></div></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <Separator />

             {/* Datos Financieros */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Datos Financieros</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Valor Servicio</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField name="anticipo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Anticipo</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''}/></div></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormItem>
                        <FormLabel>Saldo Pendiente</FormLabel>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="text" readOnly disabled className="pl-9 font-semibold" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(saldo)} />
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
          Guardar Servicio
        </Button>
      </div>
      </form>
    </Form>
  );
}
