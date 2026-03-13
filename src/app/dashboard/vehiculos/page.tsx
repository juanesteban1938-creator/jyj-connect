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
import { Search, MoreHorizontal, PlusCircle, Edit, Trash2, Truck, Loader2, Users, CalendarDays, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { VehiculoForm } from '@/components/dashboard/vehiculos/vehiculos-form';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Vehiculo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
      toast({ title: "Flota Actualizada", description: "Los datos técnicos han sido sincronizados." });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data
      }));
      toast({ variant: "destructive", title: "Error de Guardado" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea eliminar este vehículo de la flota?')) return;
    const docRef = doc(db, 'vehiculos', id);
    try {
      await deleteDoc(docRef);
      toast({ title: "Vehículo Eliminado" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
      toast({ variant: "destructive", title: "Acción no autorizada" });
    }
  };

  const filtered = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.linea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Flota de Vehículos</h1>
          <p className="page-subtitle mb-0 mt-1">Supervisión técnica y documental de las unidades.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(o) => { if(!isSaving) { setIsFormOpen(o); if(!o) setSelected(null); } }}>
          <DialogTrigger asChild>
            <Button className="btn-action bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-200">
              <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl" aria-describedby={undefined}>
            <DialogDescription className="sr-only">Gestión técnica de vehículos.</DialogDescription>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Ficha Técnica del Vehículo</DialogTitle>
            </DialogHeader>
            <VehiculoForm vehiculo={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
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
            placeholder="Buscar por placa, marca o línea..."
            className="pl-9 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-sm font-black uppercase text-muted-foreground tracking-widest">Sincronizando flota...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Marca / Referencia</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Tipo</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Capacidad</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Modelo</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Matrícula</TableHead>
                  <TableHead className="text-center p-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <TableCell className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase leading-tight">{v.marca} {v.linea}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">Propietario J&J</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-5">
                      <Badge variant="outline" className="font-black text-[10px] uppercase border-blue-100 text-blue-600 bg-blue-50/30">
                        {v.tipoVehiculo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm font-bold">{v.capacidad} Pasajeros</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-sm font-bold">{v.modelo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-lg w-fit">
                        <Tag className="h-3 w-3 text-orange-400" />
                        <span className="text-xs font-black tracking-widest">{v.placa.toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
                            <MoreHorizontal className="h-5 w-5 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl">
                          <DropdownMenuItem onClick={() => { setSelected(v); setIsFormOpen(true); }} className="rounded-lg font-bold text-xs py-2.5">
                            <Edit className="mr-2 h-4 w-4 text-slate-400" /> Editar Ficha
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 rounded-lg font-bold text-xs py-2.5" onClick={() => handleDelete(v.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Retirar de Flota
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-20 text-center text-muted-foreground opacity-40">
                      <div className="flex flex-col items-center gap-3">
                        <Truck className="h-12 w-12" />
                        <p className="font-black uppercase text-xs">No hay vehículos registrados</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-5 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Página {currentPage} de {totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg font-bold text-xs" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</Button>
                <Button variant="outline" size="sm" className="rounded-lg font-bold text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
