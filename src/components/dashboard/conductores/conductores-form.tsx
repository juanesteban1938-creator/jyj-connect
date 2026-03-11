
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
import { Upload, User, IdCard, MapPin, Phone, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Conductor } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  nombres: z.string().min(1, 'El nombre es requerido'),
  apellidos: z.string().min(1, 'El apellido es requerido'),
  cedula: z.string().min(1, 'La cédula es requerida'),
  direccion: z.string().min(1, 'La dirección es requerida'),
  barrio: z.string().min(1, 'El barrio es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  categoriaLicencia: z.enum(['A2', 'B1', 'B2', 'C1', 'C2', 'C3']),
  vencimientoLicencia: z.date({
    required_error: 'La fecha de vencimiento es requerida.',
  }),
  avatarUrl: z.string().optional(),
});

type ConductorFormValues = z.infer<typeof formSchema>;

type Props = {
  conductor: Conductor | null;
  onSave: (conductor: Conductor, newAvatarFile?: File) => void;
};

export function ConductorForm({ conductor, onSave }: Props) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | undefined>(undefined);

  const form = useForm<ConductorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        nombres: '',
        apellidos: '',
        cedula: '',
        direccion: '',
        barrio: '',
        telefono: '',
        categoriaLicencia: 'B1',
        vencimientoLicencia: undefined,
        avatarUrl: '',
    }
  });

  useEffect(() => {
    if (conductor) {
        form.reset({
            ...conductor,
            vencimientoLicencia: new Date(conductor.vencimientoLicencia),
        });
        setAvatarPreview(conductor.avatarUrl || null);
    } else {
        form.reset({
            nombres: '',
            apellidos: '',
            cedula: '',
            direccion: '',
            barrio: '',
            telefono: '',
            categoriaLicencia: 'B1',
            vencimientoLicencia: undefined,
            avatarUrl: '',
        });
        setAvatarPreview(null);
    }
  }, [conductor, form]);
  
  const onSubmit = async (data: ConductorFormValues) => {
    try {
      await onSave({
        id: conductor?.id || '',
        ...data,
        vencimientoLicencia: data.vencimientoLicencia.toISOString(),
        avatarUrl: avatarPreview || `https://i.pravatar.cc/150?u=${data.cedula}`,
      }, newAvatarFile);
    } catch (error) {
      console.error("Error al guardar conductor:", error);
    }
  };
  
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] w-full pr-4">
         <div className="space-y-8 p-1">
          <div className="flex flex-col items-center gap-4">
              <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-md">
                <AvatarImage src={avatarPreview || ''} alt="Avatar" />
                <AvatarFallback className="bg-muted"><User className="h-12 w-12 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <div className="relative">
                  <Button asChild variant="outline" size="sm" className="cursor-pointer">
                    <label htmlFor="avatar-upload" className="flex items-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" /> Subir Fotografía
                    </label>
                  </Button>
                  <input id="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleAvatarChange} />
              </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Datos Personales</h3>
            </div>
            <Separator className="bg-primary/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nombres" render={({ field }) => (
                <FormItem><FormLabel>Nombres</FormLabel><FormControl><Input placeholder="Ej. John" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="apellidos" render={({ field }) => (
                <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Ej. Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cedula" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Número de Cédula</FormLabel><FormControl><div className="relative"><IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="123456789" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Número de Teléfono</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="300 123 4567" className="pl-9" {...field} /></div></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Información de Residencia</h3>
            </div>
            <Separator className="bg-primary/20" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="direccion" render={({ field }) => (
                <FormItem className="md:col-span-3"><FormLabel>Dirección Completa</FormLabel><FormControl><Input placeholder="Calle 123 #45-67" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="barrio" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Barrio</FormLabel><FormControl><Input placeholder="Ej. El Poblado" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <IdCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Licencia de Conducción</h3>
            </div>
            <Separator className="bg-primary/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="categoriaLicencia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría de Licencia</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione categoría" /></SelectTrigger></FormControl>
                    <SelectContent>{['A2', 'B1', 'B2', 'C1', 'C2', 'C3'].map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vencimientoLicencia" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-1.5">Vencimiento de Licencia</FormLabel>
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
            </div>
          </div>
        </div>
      </ScrollArea>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="submit" className="w-full h-11 text-base font-bold">
            {conductor ? 'Actualizar Información' : 'Registrar Conductor'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
