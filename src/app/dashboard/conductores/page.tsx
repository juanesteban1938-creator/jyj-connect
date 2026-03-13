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
import {
  Search,
  MoreHorizontal,
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConductorForm } from '@/components/dashboard/conductores/conductores-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isBefore, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Conductor } from '@/lib/types';

const ITEMS_PER_PAGE = 8;

export default function ConductoresPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const db = useFirestore();
  const { user } = useUser();

  // Suscripción en tiempo real a la colección de conductores en la nube
  const conductoresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'conductores'));
  }, [db, user]);

  const { data: conductoresRaw, isLoading } = useCollection(conductoresQuery);
  const conductores = conductoresRaw || [];

  const handleSave = async (conductorData: Conductor) => {
    setIsSaving(true);
    // Usar el ID existente para edición o generar uno nuevo
    const id = selectedConductor ? selectedConductor.id : (conductorData.id || doc(collection(db, 'conductores')).id);
    const docRef = doc(db, 'conductores', id);
    
    try {
      await setDoc(docRef, { ...conductorData, id }, { merge: true });
      setIsFormOpen(false);
      setSelectedConductor(null);
      toast({ title: "Conductor sincronizado en la nube" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: conductorData
      }));
      toast({ variant: "destructive", title: "Error al sincronizar datos" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea eliminar este conductor?')) return;
    const docRef = doc(db, 'conductores', id);
    try {
      await deleteDoc(docRef);
      toast({ title: "Conductor eliminado de la nube" });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }));
      toast({ variant: "destructive", title: "No se pudo eliminar el conductor" });
    }
  };

  const filtered = conductores.filter(c => 
    `${c.nombres} ${c.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cedula.includes(searchTerm)
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (isBefore(date, now)) return { color: 'text-red-500', label: 'Vencido', icon: <AlertTriangle className="h-3 w-3" /> };
    if (isBefore(date, addMonths(now, 3))) return { color: 'text-yellow-500', label: 'Próximo', icon: <AlertTriangle className="h-3 w-3" /> };
    return { color: 'text-green-500', label: 'Vigente', icon: <CheckCircle2 className="h-3 w-3" /> };
  };

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de Conductores</h1>
        <p className="page-subtitle">Administra la información, licencias y estado de tu flota en la nube.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cédula..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { if(!isSaving) { setIsFormOpen(open); if(!open) setSelectedConductor(null); } }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Conductor</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogDescription className="sr-only">Formulario para la gestión de conductores y licencias en J&J Connect.</DialogDescription>
            <DialogHeader><DialogTitle>{selectedConductor ? 'Editar' : 'Nuevo'} Conductor</DialogTitle></DialogHeader>
            <ConductorForm conductor={selectedConductor} onSave={handleSave} />
            {isSaving && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
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
            <p className="text-sm font-bold uppercase text-muted-foreground">Sincronizando conductores...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-4">CONDUCTOR</TableHead>
                  <TableHead className="p-4">CONTACTO</TableHead>
                  <TableHead className="p-4">LICENCIA</TableHead>
                  <TableHead className="p-4">ESTADO</TableHead>
                  <TableHead className="text-center p-4">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar><AvatarImage src={c.avatarUrl} /><AvatarFallback>{c.nombres[0]}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-semibold text-sm">{c.nombres} {c.apellidos}</p>
                          <p className="text-xs text-muted-foreground">CC. {c.cedula}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-sm">{c.telefono}</TableCell>
                    <TableCell className="p-4 text-sm font-medium">{c.categoriaLicencia}</TableCell>
                    <TableCell className="p-4">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${getStatus(c.vencimientoLicencia).color}`}>
                        {getStatus(c.vencimientoLicencia).icon}
                        {format(new Date(c.vencimientoLicencia), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedConductor(c); setIsFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                      No se encontraron conductores registrados.
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
