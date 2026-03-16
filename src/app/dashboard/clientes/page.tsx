'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  PlusCircle,
  MoreHorizontal,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ClienteForm } from '@/components/dashboard/clientes/cliente-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Cliente } from '@/lib/types';

const ITEMS_PER_PAGE = 8;

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const clientesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'clientes'));
  }, [db, user]);

  const servicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'services'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const { data: clientesRaw, isLoading } = useCollection(clientesQuery);
  const { data: serviciosRaw } = useCollection(servicesQuery);
  
  const clientes = clientesRaw || [];
  const servicios = serviciosRaw || [];
  
  const handleSave = async (clienteData: Omit<Cliente, 'id'>) => {
    setIsSaving(true);
    const id = selectedCliente ? selectedCliente.id : clienteData.nit.replace(/\W/g, '');
    const docRef = doc(db, 'clientes', id);
    
    try {
      await setDoc(docRef, { ...clienteData, id, nombre: clienteData.razonSocial }, { merge: true });
      setIsFormOpen(false);
      setSelectedCliente(null);
      toast({ title: "Cliente Guardado" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: clienteData
      }));
      toast({ variant: "destructive", title: "Error al guardar cliente" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea eliminar este cliente?')) return;
    const docRef = doc(db, 'clientes', id);
    try {
      await deleteDoc(docRef);
      toast({ title: "Cliente eliminado" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
      toast({ variant: "destructive", title: "No se pudo eliminar el cliente" });
    }
  };

  const filtered = clientes.filter(c => 
    (c.razonSocial || c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Cartera de Clientes</h1>
        <p className="page-subtitle">Gestione la información de sus clientes en la nube.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o NIT..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Dialog open={isFormOpen} onOpenChange={o => { if(!isSaving) { setIsFormOpen(o); if(!o) setSelectedCliente(null); } }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl" aria-describedby={undefined}>
            <DialogDescription className="sr-only">Formulario para la gestión de clientes en J&J Connect.</DialogDescription>
            <VisuallyHidden><DialogHeader><DialogTitle>{selectedCliente ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader></VisuallyHidden>
            <DialogHeader><DialogTitle>{selectedCliente ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
            <ClienteForm 
              cliente={selectedCliente} 
              onSave={handleSave} 
              onCancel={() => setIsFormOpen(false)}
              isSaving={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50px] p-4 text-center">
                    <Checkbox checked={selectedRows.length === paginated.length && paginated.length > 0} onCheckedChange={(checked) => setSelectedRows(checked ? paginated.map(c => c.id) : [])} />
                  </TableHead>
                  <TableHead className="p-4">CLIENTE / RAZÓN SOCIAL</TableHead>
                  <TableHead className="p-4">NIT / DOCUMENTO</TableHead>
                  <TableHead className="p-4">CONTACTO</TableHead>
                  <TableHead className="p-4">ÚLTIMO SERVICIO</TableHead>
                  <TableHead className="w-[100px] text-center p-4">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => {
                  const ultimoServicio = servicios.find(s => s.nitCliente === c.nit);
                  const iniciales = (c.razonSocial || c.nombre || '?').substring(0, 2).toUpperCase();
                  
                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="p-4 text-center">
                        <Checkbox checked={selectedRows.includes(c.id)} onCheckedChange={(checked) => setSelectedRows(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {iniciales}
                          </div>
                          <div className="flex flex-col">
                            <div className="font-semibold text-sm leading-tight text-foreground">
                              {c.razonSocial || c.nombre || 'Sin nombre'}
                            </div>
                            {c.tipo && (
                              <Badge variant="outline" className="text-[9px] mt-1 uppercase h-4 px-1 border-primary/20 text-primary/70 font-bold w-fit">
                                {c.tipo}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-muted-foreground text-sm font-medium">
                        {c.nit}
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium"><Phone className="h-3 w-3" />{c.telefono}</div>
                        {c.email && <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium"><Mail className="h-3 w-3" />{c.email}</div>}
                      </TableCell>
                      <TableCell className="p-4">
                        {ultimoServicio ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="font-bold flex items-center gap-1 text-primary uppercase text-[10px]">
                              <CalendarDays className="h-2.5 w-2.5"/> {format(new Date(ultimoServicio.fecha), 'dd/MM/yyyy')}
                            </p>
                            <p className="text-muted-foreground truncate max-w-[160px] font-medium text-[9px] uppercase tracking-tight">
                              {ultimoServicio.origen} ➔ {ultimoServicio.destino}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic font-bold uppercase opacity-40">Sin servicios</span>
                        )}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedCliente(c); setTimeout(() => setIsFormOpen(true), 100); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-12 text-center text-muted-foreground">
                      No se encontraron clientes registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages || 1}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
