
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
import type { Cliente } from '@/lib/types';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es requerida'),
  nit: z.string().min(1, 'El NIT/Documento es requerido'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('El correo no es válido').optional().or(z.literal('')),
  tipo: z.enum(['Institucional', 'Corporativo', 'ONG', 'Turismo', 'Particular']),
});

type ClienteFormValues = z.infer<typeof formSchema>;

type Props = {
  cliente: Cliente | null;
  onSave: (cliente: Omit<Cliente, 'id'>) => void;
  onCancel: () => void;
};

export function ClienteForm({ cliente, onSave, onCancel }: Props) {
  
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      razonSocial: '',
      nit: '',
      telefono: '',
      email: '',
      tipo: 'Particular',
    }
  });

  useEffect(() => {
    if (cliente) {
        form.reset(cliente);
    } else {
        form.reset({
          razonSocial: '',
          nit: '',
          telefono: '',
          email: '',
          tipo: 'Particular',
        });
    }
  }, [cliente, form]);
  
  const onSubmit = (data: ClienteFormValues) => {
    onSave(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] w-full">
         <div className="space-y-4 p-1">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                control={form.control}
                name="razonSocial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social / Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Tecnologías del Sur S.A.S" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIT / Documento de Identidad</FormLabel>
                    <FormControl>
                      <Input placeholder="900.123.456-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cliente</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Institucional', 'Corporativo', 'ONG', 'Turismo', 'Particular'].map((cat) => (
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

            <div className="sm:col-span-2">
               <h3 className="font-medium my-2">Información de Contacto</h3>
            </div>
             <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+57 300 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="contacto@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </ScrollArea>

       <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            {cliente ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
       </div>
      </form>
    </Form>
  );
}
