'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Transaccion, Vehiculo } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

const gastoSchema = z.object({
  vehiculoId: z.string().min(1, 'Seleccione un vehículo'),
  fecha: z.date({ required_error: 'La fecha es requerida' }),
  categoria: z.enum(['Combustible', 'Mantenimiento', 'Peajes', 'Salarios conductor', 'Salarios monitora', 'Otros']),
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

function GastoForm({ vehiculos, onSave, onDone }: { vehiculos: Vehiculo[]; onSave: (data: GastoFormValues) => void, onDone: () => void }) {
  const form = useForm<GastoFormValues>({
    resolver: zodResolver(gastoSchema),
    defaultValues: { vehiculoId: '', categoria: 'Combustible', descripcion: '', valor: 0 },
  });

  async function onSubmit(data: GastoFormValues) {
    try {
      await onSave(data);
      form.reset();
      onDone();
    } catch (e) {
      console.error("Error al registrar gasto:", e);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="vehiculoId" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Vehículo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField name="fecha" control={form.control} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <div className="relative">
                <DatePicker
                  selected={field.value}
                  onChange={(date) => field.onChange(date)}
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Fecha"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField name="categoria" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['Combustible', 'Mantenimiento', 'Peajes', 'Salarios conductor', 'Salarios monitora', 'Otros'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
          )}/>
        </div>
        <FormField name="descripcion" control={form.control} render={({field}) => (
          <FormItem><FormLabel>Descripción</FormLabel><FormControl><Input placeholder="Detalle del gasto" {...field} /></FormControl><FormMessage/></FormItem>
        )} />
        <FormField name="valor" control={form.control} render={({field}) => (
          <FormItem><FormLabel>Valor</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="number" className="pl-9" placeholder="0" {...field} /></div></FormControl><FormMessage/></FormItem>
        )} />
        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">Registrar Gasto</Button>
      </form>
    </Form>
  );
}

function IngresoForm({ vehiculos, onSave, onDone }: { vehiculos: Vehiculo[]; onSave: (data: IngresoFormValues) => void, onDone: () => void }) {
  const form = useForm<IngresoFormValues>({
    resolver: zodResolver(ingresoSchema),
    defaultValues: { vehiculoId: '', descripcion: '', valor: 0 },
  });

  async function onSubmit(data: IngresoFormValues) {
    try {
      await onSave(data);
      form.reset();
      onDone();
    } catch (e) {
      console.error("Error al registrar ingreso:", e);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="vehiculoId" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Vehículo (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl><SelectContent>{vehiculos.map(v => <SelectItem key={v.id} value={v.id}>{v.marca} {v.linea} ({v.placa})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField name="fecha" control={form.control} render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Fecha</FormLabel>
            <div className="relative">
              <DatePicker
                selected={field.value}
                onChange={(date) => field.onChange(date)}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                dateFormat="dd/MM/yyyy"
                placeholderText="Fecha"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
            <FormMessage />
          </FormItem>
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
            No genera registro en Facturación. Para ello, cree un servicio.
          </AlertDescription>
        </Alert>
        <Button type="submit" className="w-full">Registrar Ingreso</Button>
      </form>
    </Form>
  );
}

export function RentabilidadForms(props: Props) {
  const [activeTab, setActiveTab] = useState('gasto');

  const handleGastoSave = (data: GastoFormValues) => {
    const vehiculo = props.vehiculos.find(v => v.id === data.vehiculoId);
    props.onSave({
      tipo: 'Gasto',
      ...data,
      fecha: data.fecha.toISOString(),
      vehiculoPlaca: vehiculo?.placa,
    });
  };

  const handleIngresoSave = (data: IngresoFormValues) => {
    const vehiculo = props.vehiculos.find(v => v.id === data.vehiculoId);
    props.onSave({
        tipo: 'Ingreso',
        categoria: 'Servicio',
        ...data,
        fecha: data.fecha.toISOString(),
        vehiculoPlaca: vehiculo?.placa,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Transacción</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gasto">Gasto</TabsTrigger>
            <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
          </TabsList>
          <TabsContent value="gasto" className="pt-4">
            <GastoForm vehiculos={props.vehiculos} onSave={handleGastoSave} onDone={() => {}} />
          </TabsContent>
          <TabsContent value="ingreso" className="pt-4">
            <IngresoForm vehiculos={props.vehiculos} onSave={handleIngresoSave} onDone={() => {}}/>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
