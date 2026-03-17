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
  Building2,
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
    <div className="page-container px-4 py-4 sm:px-8 sm:py-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">Cartera de Clientes</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Gestione la información de sus clientes en la nube.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={o => { if(!isSaving) { setIsFormOpen(o); if(!o) setSelectedCliente(null); } }}>
          <DialogTrigger asChild>
            <Button className="btn-action w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-200 h-11 sm:h-12 px-8">
              <PlusCircle className="mr-2 h-5 w-5" /> Añadir Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]" aria-describedby={undefined}>
            <DialogDescription className="sr-only">Formulario para la gestión de clientes en J&J Connect.</DialogDescription>
            <div className="p-6 sm:p-8 border-b bg-slate-50/50">
              <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                {selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <ClienteForm 
                cliente={selectedCliente} 
                onSave={handleSave} 
                onCancel={() => setIsFormOpen(false)}
              />
            </div>
            {isSaving && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </header>

      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o NIT..." 
            className="pl-9 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-orange-500 w-full" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 sm:p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-xs sm:text-sm font-black uppercase text-muted-foreground tracking-widest text-center">Sincronizando clientes...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="w-[50px] p-5 text-center">
                      <Checkbox checked={selectedRows.length === paginated.length && paginated.length > 0} onCheckedChange={(checked) => setSelectedRows(checked ? paginated.map(c => c.id) : [])} />
                    </TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Cliente / Razón Social</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">NIT / Documento</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Contacto</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Último Servicio</TableHead>
                    <TableHead className="text-center p-5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => {
                    const ultimoServicio = servicios.find(s => s.nitCliente === c.nit);
                    const iniciales = (c.razonSocial || c.nombre || '?').substring(0, 2).toUpperCase();
                    
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <TableCell className="p-5 text-center">
                          <Checkbox checked={selectedRows.includes(c.id)} onCheckedChange={(checked) => setSelectedRows(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-black text-xs shadow-sm">
                              {iniciales}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 text-sm uppercase leading-tight truncate">
                                {c.razonSocial || c.nombre || 'Sin nombre'}
                              </p>
                              {c.tipo && (
                                <Badge variant="outline" className="text-[9px] mt-1 uppercase h-4 px-1.5 border-orange-100 text-orange-600 bg-orange-50/30 font-black">
                                  {c.tipo}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-5 text-slate-600 text-sm font-bold whitespace-nowrap">
                          {c.nit}
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-bold whitespace-nowrap">
                              <Phone className="h-3.5 w-3.5 text-slate-300" />{c.telefono}
                            </div>
                            {c.email && (
                              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium truncate max-w-[150px]">
                                <Mail className="h-3.5 w-3.5" />{c.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-5">
                          {ultimoServicio ? (
                            <div className="flex flex-col gap-0.5">
                              <p className="font-black flex items-center gap-1 text-indigo-600 uppercase text-[10px]">
                                <CalendarDays className="h-3 w-3"/> {format(new Date(ultimoServicio.fecha), 'dd/MM/yyyy')}
                              </p>
                              <p className="text-slate-400 truncate max-w-[160px] font-bold text-[9px] uppercase tracking-tight">
                                {ultimoServicio.origen} ➔ {ultimoServicio.destino}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-300 italic font-black uppercase">Sin servicios</span>
                          )}
                        </TableCell>
                        <TableCell className="p-5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
                                <MoreHorizontal className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl">
                              <DropdownMenuItem onClick={() => { setSelectedCliente(c); setTimeout(() => setIsFormOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5">
                                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Editar Cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 rounded-lg font-bold text-xs py-2.5" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Registro
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-20 text-center text-muted-foreground opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <Building2 className="h-12 w-12" />
                          <p className="font-black uppercase text-xs">No hay clientes registrados</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-5 border-t border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Página {currentPage} de {totalPages || 1}
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="rounded-lg font-bold text-xs flex-1 sm:flex-none" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</Button>
                <Button variant="outline" size="sm" className="rounded-lg font-bold text-xs flex-1 sm:flex-none" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}