'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Calendar as CalendarIcon, User, Briefcase, MapPin, GripVertical, MinusCircle, PlusCircle, Wallet, Mail, Phone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conductor } from '@/app/dashboard/conductores/page';
import type { Vehiculo } from '@/app/dashboard/vehiculos/page';
import type { Servicio } from '@/app/dashboard/servicios/page';


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
    paradasAdicionales: z.array(z.object({ direccion: z.string() })).max(3),
    direccionDestino: z.string().min(1, 'El destino es requerido'),

    metodoPago: z.enum(['Efectivo', 'Transferencia', 'Facturacion']),
    valorServicio: z.coerce.number().optional(),
    costoOperacion: z.coerce.number().optional(),
    estadoPago: z.enum(['Pendiente', 'Anticipo', 'Pagado', 'Anulado']),
    anticipo: z.coerce.number().optional(),
    numeroComprobante: z.string().optional(),
    banco: z.string().optional(),

}).refine(data => data.esConductorNoRegistrado ? !!data.conductorOtro : !!data.conductorId, {
    message: 'Debe especificar un conductor',
    path: ['conductorId'],
}).refine(data => data.esVehiculoNoRegistrado ? !!data.vehiculoOtro : !!data.vehiculoId, {
    message: 'Debe especificar un vehículo',
    path: ['vehiculoId'],
}).refine(data => data.estadoPago !== 'Anticipo' || (data.estadoPago === 'Anticipo' && data.anticipo !== undefined && data.anticipo > 0), {
    message: 'Debe especificar un valor de anticipo',
    path: ['anticipo']
}).refine(data => data.metodoPago !== 'Transferencia' || (data.metodoPago === 'Transferencia' && data.numeroComprobante && data.banco), {
    message: 'Comprobante y banco son requeridos para transferencia',
    path: ['numeroComprobante']
});


export type ServicioFormValues = z.infer<typeof formSchema>;

type Props = {
  servicio: Servicio | null;
  onSave: (data: ServicioFormValues) => void;
  onCancel: () => void;
  conductores: Conductor[];
  vehiculos: Vehiculo[];
};

const bancosColombia = [
  "Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente", "Banco Popular", "Banco AV Villas",
  "Itaú Corpbanca Colombia", "Scotiabank Colpatria", "GNB Sudameris", "Banco Caja Social", "Citibank Colombia",
  "Banco Agrario de Colombia", "Bancamía", "Banco W", "Bancoomeva", "Banco Falabella", "Banco Pichincha",
  "Banco Serfinanza", "RappiPay", "Lulo Bank", "Nequi",
];

export function ServicioForm({ servicio, onSave, onCancel, conductores, vehiculos }: Props) {
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
      paradasAdicionales: [],
      direccionDestino: '',
      metodoPago: 'Facturacion',
      valorServicio: 0,
      costoOperacion: 0,
      estadoPago: 'Pendiente',
      anticipo: 0,
      numeroComprobante: '',
      banco: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "paradasAdicionales"
  });
  
  useEffect(() => {
    if (servicio) {
        const conductorMatched = conductores.find(c => `${c.nombres} ${c.apellidos}` === servicio.conductor);
        const vehiculoMatched = vehiculos.find(v => v.placa === servicio.vehiculoPlaca);

        form.reset({
            nombreCliente: servicio.cliente,
            nitCliente: servicio.nitCliente || '',
            telefonoCliente: servicio.telefonoCliente || '',
            emailCliente: servicio.emailCliente || '',
            fechaRecogida: servicio.fecha ? parseISO(servicio.fecha) : new Date(),
            horaRecogida: servicio.hora || '00:00',
            direccionRecogida: servicio.origen,
            direccionDestino: servicio.destino,
            paradasAdicionales: (servicio.paradasAdicionales || []).map(p => ({ direccion: p })),
            metodoPago: servicio.metodoPago,
            valorServicio: servicio.valorServicio,
            costoOperacion: servicio.costoOperacion,
            estadoPago: servicio.estadoPago,
            anticipo: servicio.anticipo,
            numeroComprobante: servicio.numeroComprobante,
            banco: servicio.banco,
            esConductorNoRegistrado: !conductorMatched,
            conductorId: conductorMatched?.id || '',
            conductorOtro: servicio.conductor,
            conductorTelefonoOtro: servicio.conductorTelefono,
            esVehiculoNoRegistrado: !vehiculoMatched,
            vehiculoId: vehiculoMatched?.id || '',
            vehiculoOtro: servicio.vehiculoPlaca
        });
    }
  }, [servicio, form, conductores, vehiculos]);

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
  
  const esConductorNoRegistrado = form.watch('esConductorNoRegistrado');
  const esVehiculoNoRegistrado = form.watch('esVehiculoNoRegistrado');
  
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
            
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Información del Cliente</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField name="nombreCliente" control={form.control} render={({ field }) => (
                        <FormItem className="sm:col-span-3"><FormLabel>Nombre del Cliente / Razón Social</FormLabel><FormControl><Input placeholder="Ej. Tech Solutions SAS" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="nitCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>NIT / Cédula</FormLabel><FormControl><Input placeholder="Ej. 900.123.456-1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="telefonoCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input placeholder="Ej. +57 300 123 4567" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="emailCliente" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="cliente@example.com" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Recursos Asignados</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                         <FormField
                            control={form.control}
                            name="esConductorNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            form.setValue('conductorId', '');
                                            form.setValue('conductorOtro', '');
                                            form.setValue('conductorTelefonoOtro', '');
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-bold text-primary">Conductor NO registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {esConductorNoRegistrado ? (
                            <div className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="conductorOtro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre del Conductor</FormLabel>
                                            <FormControl><Input placeholder="Nombre completo..." {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="conductorTelefonoOtro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono del Conductor</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-9" placeholder="Celular..." {...field} value={field.value ?? ''} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ) : (
                             <FormField
                                control={form.control}
                                name="conductorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seleccionar Conductor</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Busque en conductores registrados" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {conductores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombres} {c.apellidos}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                     <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
                        <FormField
                            control={form.control}
                            name="esVehiculoNoRegistrado"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            form.setValue('vehiculoId', '');
                                            form.setValue('vehiculoOtro', '');
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-bold text-primary">Vehículo NO registrado</FormLabel>
                                </FormItem>
                            )}
                        />
                        {esVehiculoNoRegistrado ? (
                            <FormField
                                control={form.control}
                                name="vehiculoOtro"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Placa del Vehículo</FormLabel>
                                        <FormControl><Input placeholder="Escribir placa..." {...field} value={field.value ?? ''}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                           <FormField
                                control={form.control}
                                name="vehiculoId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seleccionar Vehículo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Busque por placa..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>
            </div>

            <Separator />

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
                                    <Input
                                        type="time"
                                        {...field}
                                        className="w-full"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
                 <div className="space-y-2">
                    <FormField name="direccionRecogida" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Dirección de Recogida</FormLabel><FormControl><div className="relative"><Input className="pl-9" placeholder="Dirección principal..." {...field} /><div className="absolute left-3 top-1/2 -translate-y-1/2"><OrigenIcon /></div></div></FormControl><FormMessage /></FormItem>
                    )} />
                    {fields.map((field, index) => (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`paradasAdicionales.${index}.direccion`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="relative">
                                            <Input className="pl-9" placeholder={`Parada adicional ${index + 1}...`} {...field} />
                                            <GripVertical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-red-500" onClick={() => remove(index)}>
                                                <MinusCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                    {fields.length < 3 && (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ direccion: "" })}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Parada
                        </Button>
                    )}
                </div>
                 <FormField name="direccionDestino" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Dirección de Destino</FormLabel><FormControl><div className="relative"><Input className="pl-9" placeholder="Destino final..." {...field} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" /></div></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-semibold">Datos Financieros</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <FormField name="estadoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado del Pago</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                     <FormField name="metodoPago" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Método de Pago</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                </div>
                
                {metodoPago === 'Transferencia' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="numeroComprobante" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de Comprobante</FormLabel>
                                <FormControl><Input placeholder="Ej. 12345678" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="banco" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Banco</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un banco..." /></SelectTrigger></FormControl>
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
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField name="valorServicio" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Venta Servicio</FormLabel><FormControl><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField name="costoOperacion" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Costo Operación</FormLabel><FormControl><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''} /></div></FormControl><FormMessage /></FormItem>
                    )} />
                    {estadoPago === 'Anticipo' && (
                        <FormField name="anticipo" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Valor Anticipo</FormLabel><FormControl><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0.00" {...field} value={field.value ?? ''}/></div></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                     <FormItem>
                        <FormLabel>Saldo Pendiente</FormLabel>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          {servicio ? 'Guardar Cambios' : 'Guardar Servicio'}
        </Button>
      </div>
      </form>
    </Form>
  );
}
