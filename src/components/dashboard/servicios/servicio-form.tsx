
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/jj-ui/calendar';
import { Calendar as CalendarIcon, User, Briefcase, MapPin, Clock, Loader2, DollarSign, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Servicio, Conductor, Vehiculo } from '@/lib/types';

const formSchema = z.object({
    nombreCliente: z.string().min(1, 'El nombre es requerido'),
    nitCliente: z.string().min(1, 'El NIT es requerido'),
    telefonoCliente: z.string().min(1, 'El teléfono es requerido'),
    emailCliente: z.string().email('El correo no es válido').optional().or(z.literal('')),
    
    esConductorNoRegistrado: z.boolean().default(false),
    conductorId: z.string().optional(),
    conductorOtro: z.string().optional(),
    conductorTelefonoOtro: z.string().optional(),

    esVehiculoNoRegistrado: z.boolean().default(false),
    vehiculoId: z.string().optional(),
    vehiculoOtro: z.string().optional(),

    fechaRecogida: z.date({ required_error: 'La fecha es requerida' }),
    horaRecogida: z.string({ required_error: 'La hora es requerida' }),
    direccionRecogida: z.string().min(1, 'La dirección es requerida'),
    direccionDestino: z.string().min(1, 'El destino es requerido'),

    metodoPago: z.enum(['Efectivo', 'Transferencia', 'Facturacion']),
    valorServicio: z.coerce.number().optional(),
    costoOperacion: z.coerce.number().optional(),
    estadoPago: z.enum(['Pendiente', 'Anticipo', 'Pagado', 'Anulado']),
    anticipo: z.coerce.number().optional(),
});

export type ServicioFormValues = z.infer<typeof formSchema>;

type Props = {
  servicio: Servicio | null;
  onSave: (data: ServicioFormValues) => void;
  onCancel: () => void;
  conductores: Conductor[];
  vehiculos: Vehiculo[];
  isSaving?: boolean;
};

export function ServicioForm({ servicio, onSave, onCancel, conductores, vehiculos, isSaving }: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const form = useForm<ServicioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreCliente: '',
      nitCliente: '',
      telefonoCliente: '',
      emailCliente: '',
      esConductorNoRegistrado: false,
      conductorId: '',
      conductorOtro: '',
      conductorTelefonoOtro: '',
      esVehiculoNoRegistrado: false,
      vehiculoId: '',
      vehiculoOtro: '',
      horaRecogida: '00:00',
      direccionRecogida: '',
      direccionDestino: '',
      metodoPago: 'Facturacion',
      valorServicio: 0,
      costoOperacion: 0,
      estadoPago: 'Pendiente',
      anticipo: 0,
    },
  });

  useEffect(() => {
    if (servicio) {
        const conductorMatched = conductores.find(c => `${c.nombres} ${c.apellidos}` === servicio.conductor);
        const vehiculoMatched = vehiculos.find(v => v.placa === servicio.vehiculoPlaca);

        form.reset({
            nombreCliente: servicio.clienteNombre || servicio.cliente,
            nitCliente: servicio.nitCliente || '',
            telefonoCliente: servicio.telefonoCliente || '',
            emailCliente: servicio.emailCliente || '',
            fechaRecogida: servicio.fecha ? parseISO(servicio.fecha) : new Date(),
            horaRecogida: servicio.hora || '',
            direccionRecogida: servicio.origen,
            direccionDestino: servicio.destino,
            metodoPago: servicio.metodoPago || 'Facturacion',
            valorServicio: servicio.valorServicio || 0,
            costoOperacion: servicio.costoOperacion || 0,
            estadoPago: servicio.estadoPago || 'Pendiente',
            anticipo: servicio.anticipo || 0,
            esConductorNoRegistrado: !conductorMatched,
            conductorId: conductorMatched?.id || '',
            conductorOtro: conductorMatched ? '' : servicio.conductor,
            conductorTelefonoOtro: conductorMatched ? '' : (servicio.conductorTelefono || ''),
            esVehiculoNoRegistrado: !vehiculoMatched,
            vehiculoId: vehiculoMatched?.id || '',
            vehiculoOtro: servicio.vehiculoPlaca || ''
        });
    }
  }, [servicio, form, conductores, vehiculos]);

  const valorServicio = form.watch('valorServicio') || 0;
  const estadoPago = form.watch('estadoPago');

  useEffect(() => {
    if (estadoPago === 'Pagado') {
      form.setValue('anticipo', valorServicio);
    } else if (estadoPago === 'Pendiente' || estadoPago === 'Anulado') {
        form.setValue('anticipo', 0);
    }
  }, [estadoPago, valorServicio, form]);

  const anticipo = form.watch('anticipo') || 0;
  const saldo = Math.max(0, valorServicio - anticipo);
  
  const handleFormSubmit = (data: ServicioFormValues) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full">
         <div className="space-y-6 p-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Información del Cliente</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField name="nombreCliente" control={form.control} render={({ field }) => (
                        <FormItem className="lg:col-span-2"><FormLabel>Nombre del Cliente</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="nitCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>NIT / Cédula</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="telefonoCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="emailCliente" control={form.control} render={({ field }) => (
                        <FormItem className="lg:col-span-2"><FormLabel>Correo Electrónico</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="correo@ejemplo.com" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Recursos</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                         <FormField
                            control={form.control}
                            name="esConductorNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-bold text-primary">Conductor No Registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {form.watch('esConductorNoRegistrado') ? (
                            <div className="space-y-3">
                                <FormField name="conductorOtro" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Conductor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="conductorTelefonoOtro" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono Conductor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        ) : (
                             <FormField name="conductorId" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Conductor</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl><SelectContent>{conductores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                             )} />
                        )}
                    </div>
                     <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                        <FormField
                            control={form.control}
                            name="esVehiculoNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-bold text-primary">Vehículo No Registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {form.watch('esVehiculoNoRegistrado') ? (
                            <FormField name="vehiculoOtro" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Placa Vehículo</FormLabel><FormControl><Input placeholder="XXX-000" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        ) : (
                           <FormField name="vehiculoId" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Vehículo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                           )} />
                        )}
                    </div>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Detalles Ruta</h3>
                </div>
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="fechaRecogida" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha</FormLabel>
                            <Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'dd/MM/yyyy') : <span>Seleccione...</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => { if(date) { field.onChange(date); setIsCalendarOpen(false); } }} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Hora de Recogida</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <input type="time" {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10" />
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                 </div>
                 <FormField name="direccionRecogida" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Origen</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField name="direccionDestino" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Finanzas</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Venta Servicio</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField name="anticipo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Anticipo</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField name="costoOperacion" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Costo Operación</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormItem><FormLabel>Saldo Pendiente</FormLabel><FormControl><Input readOnly disabled className="font-bold text-red-600" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(saldo)} /></FormControl></FormItem>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                </>
            ) : 'Guardar Servicio'}
        </Button>
      </div>
      </form>
    </Form>
  );
}
