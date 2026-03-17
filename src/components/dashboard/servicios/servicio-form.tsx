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
import { Checkbox } from '@/components/ui/checkbox';
import { User, Briefcase, MapPin, Clock, Loader2, DollarSign, Mail, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';
import { useEffect } from 'react';
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
  }, [servicio, conductores, vehiculos]);

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
  
  const handleFormSubmit = async (data: ServicioFormValues) => {
    try {
      await onSave(data);
    } catch (error) {
      console.error("Error al procesar el formulario:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full pr-4">
         <div className="space-y-8 p-1">
            {/* Cliente */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Información del Cliente</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField name="nombreCliente" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Nombre del Cliente / Razón Social</FormLabel>
                            <FormControl><Input placeholder="Ej. Juan Pérez" {...field} className="w-full" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="nitCliente" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>NIT / Cédula</FormLabel>
                            <FormControl><Input placeholder="12345678-9" {...field} className="w-full" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="telefonoCliente" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teléfono de Contacto</FormLabel>
                            <FormControl><Input placeholder="300 123 4567" {...field} className="w-full" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="emailCliente" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Correo Electrónico (Para envío de CxC)</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input className="pl-9 w-full" placeholder="correo@ejemplo.com" {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </div>
            
            {/* Recursos */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Asignación de Recursos</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/5">
                         <FormField
                            control={form.control}
                            name="esConductorNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-bold text-primary text-xs uppercase cursor-pointer">Conductor No Registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {form.watch('esConductorNoRegistrado') ? (
                            <div className="grid grid-cols-1 gap-3">
                                <FormField name="conductorOtro" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Conductor Externo</FormLabel><FormControl><Input {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="conductorTelefonoOtro" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono Externo</FormLabel><FormControl><Input {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        ) : (
                             <FormField name="conductorId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seleccionar Conductor</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Seleccione un conductor..." /></SelectTrigger></FormControl>
                                        <SelectContent>{conductores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                             )} />
                        )}
                    </div>
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/5">
                        <FormField
                            control={form.control}
                            name="esVehiculoNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-bold text-primary text-xs uppercase cursor-pointer">Vehículo No Registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {form.watch('esVehiculoNoRegistrado') ? (
                            <FormField name="vehiculoOtro" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Placa del Vehículo Externo</FormLabel><FormControl><Input placeholder="XXX-000" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                            )} />
                        ) : (
                           <FormField name="vehiculoId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Seleccionar Vehículo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Seleccione un vehículo..." /></SelectTrigger></FormControl>
                                        <SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                           )} />
                        )}
                    </div>
                </div>
            </div>

            {/* Ruta */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Detalles de la Ruta</h3>
                </div>
                <Separator className="bg-primary/20" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fechaRecogida" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha del Servicio</FormLabel>
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
                    )} />
                    <FormField control={form.control} name="horaRecogida" render={({ field }) => (
                        <FormItem>
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
                    
                    <FormField name="direccionRecogida" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel>Dirección de Origen / Recogida</FormLabel><FormControl><Input placeholder="Ej. Calle 123 #45-67" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="direccionDestino" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-2"><FormLabel>Dirección de Destino / Llegada</FormLabel><FormControl><Input placeholder="Ej. Aeropuerto El Dorado" {...field} className="w-full" /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
            </div>

            {/* Financiera */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-bold uppercase tracking-tight">Gestión Financiera</h3>
                </div>
                <Separator className="bg-primary/20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Venta Total</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9 w-full" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="anticipo" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Anticipo / Abono</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9 w-full" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="costoOperacion" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Costo Operación</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9 w-full" {...field} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Saldo Pendiente</FormLabel>
                        <FormControl><Input readOnly disabled className="font-bold text-red-600 bg-muted w-full" value={new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldo)} /></FormControl>
                    </FormItem>
                </div>
            </div>
        </div>
      </ScrollArea>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Cancelar</Button>
        <Button type="submit" className="min-w-[150px] w-full sm:w-auto" disabled={isSaving}>
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                </>
            ) : 'Programar Servicio'}
        </Button>
      </div>
      </form>
    </Form>
  );
}