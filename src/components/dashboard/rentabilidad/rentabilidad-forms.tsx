'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/jj-ui/calendar';
import { AlertCircle, CalendarIcon, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Transaccion } from '@/app/dashboard/rentabilidad/page';
import type { Vehiculo } from '@/app/dashboard/vehiculos/page';
import { Alert, AlertDescription } from '@/components/ui/alert';

const gastoSchema = z.object({
  vehiculoId: z.string().min(1, 'Seleccione un vehículo'),
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  categoria: z.enum(['Combustible', 'Mantenimiento', 'Peajes', 'Otros']),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  valor: z.coerce.number().min(1, 'El valor debe ser mayor a 0'),
});

const ingresoSchema = z.object({
  vehiculoId: z.string().optional(),
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  descripcion: z.string().min(1, 'La descripción es requerida'),
  valor: z.coerce.number().min(1, 'El valor debe ser mayor a 0'),
});


type GastoFormValues = z.infer<typeof gastoSchema>;
type IngresoFormValues = z.infer<typeof ingresoSchema>;

type Props = {
  vehiculos: Vehiculo[];
  onSave: (transaccion: Omit<Transaccion, 'id'>) => void;
};

function RegistrarGastoForm({ vehiculos, onSave }: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      vehiculoId: '',
      categoria: 'Combustible',
      descripcion: '',
      valor: 0,
    },
  });

  function onSubmit(data: GastoFormValues) {
    const vehiculo = vehiculos.find(v => v.id === data.vehiculoId);
    onSave({
        tipo: 'Gasto',
        ...data,
        fecha: data.fecha.toISOString(),
        vehiculoPlaca: vehiculo?.placa,
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Gasto</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
             <FormField name="vehiculoId" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Vehículo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
             )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField name="fecha" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" type="button" className={cn("text-sm justify-start text-left font-normal",!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yy') : <span>Fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}><Calendar mode="single" selected={field.value} onSelect={(date) => {if(date) {field.onChange(date); setIsCalendarOpen(false);}}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )}/>
                <FormField name="categoria" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Combustible', 'Mantenimiento', 'Peajes', 'Otros'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                )}/>
            </div>
            <FormField name="descripcion" control={form.control} render={({field}) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Input placeholder="Detalle del gasto" {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <FormField name="valor" control={form.control} render={({field}) => (
                <FormItem><FormLabel>Valor</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0" {...field} /></div></FormControl><FormMessage/></FormItem>
            )} />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">Registrar Gasto</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function RegistrarIngresoForm({ vehiculos, onSave }: Props) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<IngresoFormValues>({
    resolver: zodResolver(ingresoSchema),
    defaultValues: {
      vehiculoId: '',
      descripcion: '',
      valor: 0,
    },
  });

   function onSubmit(data: IngresoFormValues) {
    const vehiculo = vehiculos.find(v => v.id === data.vehiculoId);
    onSave({
        tipo: 'Ingreso',
        categoria: 'Servicio',
        ...data,
        fecha: data.fecha.toISOString(),
        vehiculoPlaca: vehiculo?.placa,
    });
    
    try {
        const storedServicios = localStorage.getItem('servicios');
        const servicios = storedServicios ? JSON.parse(storedServicios) : [];
        const newService = {
            id: new Date().toISOString() + '_ingreso',
            consecutivo: `ING-${Date.now()}`,
            fecha: data.fecha.toISOString(),
            hora: format(new Date(), 'HH:mm'),
            cliente: 'Ingreso Manual',
            nitCliente: 'N/A',
            telefonoCliente: 'N/A',
            clienteIniciales: 'IM',
            origen: 'N/A',
            destino: 'N/A',
            descripcion: data.descripcion,
            valorServicio: data.valor,
            estado: 'Finalizado',
            estadoPago: 'Pagado',
            costoOperacion: 0,
            saldo: 0,
            conductor: 'N/A',
            vehiculo: vehiculo?.placa || 'N/A',
            metodoPago: 'Efectivo',
            paradasAdicionales: [],
        };
        const updatedServicios = [...servicios, newService];
        localStorage.setItem('servicios', JSON.stringify(updatedServicios));
    } catch (e) {
        console.error(e)
    }

    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Ingreso</CardTitle>
      </CardHeader>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
             <FormField name="vehiculoId" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Vehículo (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
             )} />
             <FormField name="fecha" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Fecha</FormLabel><Popover modal open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" type="button" className={cn("text-sm justify-start text-left font-normal",!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yy') : <span>Fecha</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" onPointerDownOutside={(e) => e.preventDefault()}><Calendar mode="single" selected={field.value} onSelect={(date) => {if(date) {field.onChange(date); setIsCalendarOpen(false);}}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
            )}/>
             <FormField name="descripcion" control={form.control} render={({field}) => (
                <FormItem><FormLabel>Concepto</FormLabel><FormControl><Input placeholder="Concepto del ingreso" {...field} /></FormControl><FormMessage/></FormItem>
            )} />
             <FormField name="valor" control={form.control} render={({field}) => (
                <FormItem><FormLabel>Valor</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0" {...field} /></div></FormControl><FormMessage/></FormItem>
            )} />
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Genera un registro simple en Facturación y Cartera.
                </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Registrar Ingreso</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export function RentabilidadForms(props: Props) {
  return (
    <div className="space-y-6">
      <RegistrarGastoForm {...props} />
      <RegistrarIngresoForm {...props} />
    </div>
  );
}
