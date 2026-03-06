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
} from '@/components/ui/dialog';
import { ClienteForm } from '@/components/dashboard/clientes/cliente-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';

export type Cliente = {
  id: string; 
  razonSocial: string;
  nit: string;
  telefono: string;
  email?: string;
  tipo: 'Institucional' | 'Corporativo' | 'ONG' | 'Turismo' | 'Particular';
};

const ITEMS_PER_PAGE = 8;

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const clientesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'clientes'));
  }, [db, user]);

  const { data: clientesRaw, isLoading } = useCollection(clientesQuery);
  const clientes = clientesRaw || [];
  
  const handleSave = async (clienteData: Omit<Cliente, 'id'>) => {
    const id = selectedCliente ? selectedCliente.id : clienteData.nit.replace(/\W/g, '');
    const docRef = doc(db, 'clientes', id);
    
    try {
      await setDoc(docRef, { ...clienteData, id }, { merge: true });
      setIsFormOpen(false);
      setSelectedCliente(null);
      toast({ title: "Cliente Guardado en la Nube" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar cliente" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea eliminar este cliente?')) return;
    try {
      await deleteDoc(doc(db, 'clientes', id));
      toast({ title: "Cliente eliminado" });
    } catch (e) {
      toast({ variant: "destructive", title: "No se pudo eliminar el cliente" });
    }
  };

  const filtered = clientes.filter(c => 
    c.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Cartera de Clientes</h1>
        <p className="page-subtitle">Gestione la información de sus clientes en la nube de J&J Connect.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o NIT..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Dialog open={isFormOpen} onOpenChange={o => { setIsFormOpen(o); if(!o) setSelectedCliente(null); }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <VisuallyHidden><DialogHeader><DialogTitle>{selectedCliente ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader></VisuallyHidden>
            <DialogHeader><DialogTitle>{selectedCliente ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
            <ClienteForm cliente={selectedCliente} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Sincronizando clientes...</p>
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
                  <TableHead className="w-[100px] text-center p-4">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="p-4 text-center"><Checkbox checked={selectedRows.includes(c.id)} onCheckedChange={(checked) => setSelectedRows(prev => checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} /></TableCell>
                    <TableCell className="p-4"><div className="font-semibold text-sm">{c.razonSocial}</div><Badge variant="outline" className="text-[10px] mt-1 uppercase">{c.tipo}</Badge></TableCell>
                    <TableCell className="p-4 text-muted-foreground text-sm">{c.nit}</TableCell>
                    <TableCell className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3 w-3" />{c.telefono}</div>
                      {c.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedCliente(c); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
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
