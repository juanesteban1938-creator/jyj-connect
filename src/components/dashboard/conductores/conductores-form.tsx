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
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Conductor } from '@/app/dashboard/conductores/page';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(conductor?.avatarUrl || null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const defaultValues = conductor
    ? {
        ...conductor,
        vencimientoLicencia: new Date(conductor.vencimientoLicencia),
      }
    : {
        nombres: '',
        apellidos: '',
        cedula: '',
        direccion: '',
        barrio: '',
        telefono: '',
        categoriaLicencia: 'B1' as 'A2' | 'B1' | 'B2' | 'C1',
      };

  const form = useForm<ConductorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const onSubmit = (data: ConductorFormValues) => {
    onSave({
      id: conductor?.id || '',
      ...data,
      vencimientoLicencia: data.vencimientoLicencia.toISOString(),
      avatarUrl: avatarPreview || `https://i.pravatar.cc/150?u=${data.cedula}`,
    }, newAvatarFile);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
       <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem className="flex flex-col items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || ''} alt="Avatar de conductor" />
                <AvatarFallback>
                  {form.getValues('nombres')?.[0]}
                  {form.getValues('apellidos')?.[0]}
                </AvatarFallback>
              </Avatar>
              <FormControl>
                <div className="relative mt-2">
                  <Button asChild variant="outline">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Foto
                    </label>
                  </Button>
                  <input id="avatar-upload" type="file" className="sr-only" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellidos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cedula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Cédula</FormLabel>
              <FormControl>
                <Input placeholder="123456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección de Residencia</FormLabel>
              <FormControl>
                <Input placeholder="Calle 123 #45-67" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="barrio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barrio</FormLabel>
              <FormControl>
                <Input placeholder="El Poblado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="3001234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="categoriaLicencia"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Categoría de Licencia</FormLabel>
                <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                >
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccione una categoría" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {['A2', 'B1', 'B2', 'C1', 'C2', 'C3'].map((cat) => (
                        <SelectItem key={cat} value={cat}>
                        {cat}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
              control={form.control}
              name="vencimientoLicencia"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="mb-1.5">Vencimiento Licencia</FormLabel>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                      onInteractOutside={(e) => {
                        e.preventDefault();
                      }}
                    >
                       <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <Button type="submit" className="w-full">
          Guardar Conductor
        </Button>
      </form>
    </Form>
  );
}
