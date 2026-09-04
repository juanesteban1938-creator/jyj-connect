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
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Building2, Globe } from 'lucide-react';

const países = [
  { code: '+57', label: '🇨🇴 +57', name: 'Colombia' },
  { code: '+1', label: '🇺🇸 +1', name: 'EE.UU. / Canadá' },
  { code: '+507', label: '🇵🇦 +507', name: 'Panamá' },
  { code: '+52', label: '🇲🇽 +52', name: 'México' },
  { code: '+58', label: '🇻🇪 +58', name: 'Venezuela' },
  { code: '+34', label: '🇪🇸 +34', name: 'España' },
];

const formSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es requerida'),
  nit: z.string().min(1, 'El NIT/Documento es requerido'),
  prefijoTelefono: z.string().default('+57'),
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
      prefijoTelefono: '+57',
      telefono: '',
      email: '',
      tipo: 'Particular',
    }
  });

  useEffect(() => {
    if (cliente) {
        let prefijoEncontrado = '+57';
        let numeroLimpio = cliente.telefono || '';
        
        for (const p of países) {
            if (numeroLimpio.startsWith(p.code)) {
                prefijoEncontrado = p.code;
                numeroLimpio = numeroLimpio.replace(p.code, '');
                break;
            }
        }

        form.reset({
          razonSocial: cliente.razonSocial || '',
          nit: cliente.nit || '',
          prefijoTelefono: prefijoEncontrado,
          telefono: numeroLimpio,
          email: cliente.email || '',
          tipo: cliente.tipo || 'Particular',
        });
    } else {
        form.reset({
          razonSocial: '',
          nit: '',
          prefijoTelefono: '+57',
          telefono: '',
          email: '',
          tipo: 'Particular',
        });
    }
  }, [cliente, form]);
  
  const onSubmit = (data: ClienteFormValues) => {
    // Unificar teléfono
    const telefonoFinal = `${data.prefijoTelefono}${data.telefono.replace(/\D/g, '')}`;
    const { prefijoTelefono, ...rest } = data;
    onSave({ ...rest, telefono: telefonoFinal });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] w-full pr-4">
         <div className="space-y-8 p-1">
          {/* Identificación del Cliente */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Identificación Legal</h3>
            </div>
            <Separator className="bg-primary/20" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="razonSocial"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Razón Social / Nombre Completo</FormLabel>
                    <FormControl><Input placeholder="Ej. Tecnologías del Sur S.A.S" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nit"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>NIT / Documento Identidad</FormLabel>
                    <FormControl><Input placeholder="900.123.456-1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Seleccione tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['Institucional', 'Corporativo', 'ONG', 'Turismo', 'Particular'].map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Datos de Contacto */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold uppercase tracking-tight">Contacto Directo</h3>
            </div>
            <Separator className="bg-primary/20" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormItem className="md:col-span-1">
                <FormLabel>Número Telefónico</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="prefijoTelefono"
                    render={({ field }) => (
                      <FormItem className="w-[100px] shrink-0">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 bg-slate-50">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {países.map(p => (
                              <SelectItem key={p.code} value={p.code} className="text-xs font-bold">
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormItem>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Correo Electrónico (Facturación)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="cliente@correo.com" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

       <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="min-w-[150px] font-bold uppercase tracking-wide">
            {cliente ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
       </div>
      </form>
    </Form>
  );
}
