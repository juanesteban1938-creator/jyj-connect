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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, PlusCircle, Edit, Trash2, Truck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { VehiculoForm } from '@/components/dashboard/vehiculos/vehiculos-form';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Vehiculo } from '@/lib/types';

const ITEMS_PER_PAGE = 8;

export default function VehiculosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Vehiculo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const db = useFirestore();
  const { user } = useUser();

  // Suscripción en tiempo real a la colección de vehículos en la nube
  const vehiculosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'vehiculos'));
  }, [db, user]);

  const { data: vehiculosRaw, isLoading } = useCollection(vehiculosQuery);
  const vehiculos = vehiculosRaw || [];

  const handleSave = async (data: Omit<Vehiculo, 'id'>) => {
    setIsSaving(true);
    const id = selected ? selected.id : (doc(collection(db, 'vehiculos')).id);
    const docRef = doc(db, 'vehiculos', id);
    
    try {
      await setDoc(docRef, { ...data, id }, { merge: true });
      setIsFormOpen(false);
      setSelected(null);
      toast({ title: "Vehículo sincronizado en la nube" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data
      }));
      toast({ variant: "destructive", title: "Error al sincronizar vehículo" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea eliminar este vehículo?')) return;
    const docRef = doc(db, 'vehiculos', id);
    try {
      await deleteDoc(docRef);
      toast({ title: "Vehículo eliminado de la nube" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
      toast({ variant: "destructive", title: "No se pudo eliminar el vehículo" });
    }
  };

  const filtered = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de Vehículos</h1>
        <p className="page-subtitle">Administra la flota de vehículos y sus documentos técnicos en la nube.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa o marca..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isFormOpen} onOpenChange={(o) => { if(!isSaving) { setIsFormOpen(o); if(!o) setSelected(null); } }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Vehículo</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl" aria-describedby={undefined}>
            <DialogDescription className="sr-only">Formulario para la gestión de vehículos, SOAT y revisiones técnicas.</DialogDescription>
            <DialogHeader><DialogTitle>{selected ? 'Editar' : 'Nuevo'} Vehículo</DialogTitle></DialogHeader>
            <VehiculoForm vehiculo={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
            {isSaving && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg z-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-bold uppercase text-muted-foreground">Sincronizando flota...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-4">VEHÍCULO</TableHead>
                  <TableHead className="p-4">TIPO</TableHead>
                  <TableHead className="p-4">CAPACIDAD</TableHead>
                  <TableHead className="p-4">PLACA</TableHead>
                  <TableHead className="text-center p-4">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/30">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-md"><Truck className="h-4 w-4 text-primary" /></div>
                        <span className="font-semibold text-sm">{v.marca} {v.linea}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm">{v.tipoVehiculo}</TableCell>
                    <TableCell className="p-4 text-sm">{v.capacidad} Pas.</TableCell>
                    <TableCell className="p-4 text-sm font-bold uppercase">{v.placa}</TableCell>
                    <TableCell className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelected(v); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(v.id)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                      No se encontraron vehículos registrados.
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
