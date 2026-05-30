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
  Phone,
  IdCard,
  FileSpreadsheet,
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
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Conductor } from '@/lib/types';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

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

  const conductoresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'conductores'));
  }, [db, user]);

  const { data: conductoresRaw, isLoading } = useCollection(conductoresQuery);
  const conductores = conductoresRaw || [];

  const handleSave = (conductorData: Conductor) => {
    setIsSaving(true);
    const id = selectedConductor ? selectedConductor.id : (conductorData.id || doc(collection(db, 'conductores')).id);
    const docRef = doc(db, 'conductores', id);
    
    setDoc(docRef, { ...conductorData, id }, { merge: true })
      .then(() => {
        setIsFormOpen(false);
        setSelectedConductor(null);
        toast({ title: "Información Actualizada", description: "El conductor ha sido sincronizado en la nube." });
      })
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: conductorData
        }));
        toast({ variant: "destructive", title: "Error de Sincronización" });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Desea eliminar este conductor?')) return;
    const docRef = doc(db, 'conductores', id);
    deleteDoc(docRef)
      .then(() => toast({ title: "Conductor Eliminado" }))
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
        toast({ variant: "destructive", title: "Acceso Denegado" });
      });
  };

  const exportToExcel = () => {
    const dataToExport = conductores.map(c => ({
      Nombres: c.nombres,
      Apellidos: c.apellidos,
      Cédula: c.cedula,
      Teléfono: c.telefono,
      Dirección: c.direccion,
      Barrio: c.barrio,
      'Categoría Licencia': c.categoriaLicencia,
      'Vencimiento Licencia': format(new Date(c.vencimientoLicencia), 'dd/MM/yyyy')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conductores");
    XLSX.writeFile(workbook, `Reporte_Conductores_JJ_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast({ title: "Excel Generado", description: "La base de datos de conductores ha sido exportada." });
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
    if (isBefore(date, now)) return { color: 'text-red-600 bg-red-50 border-red-100', label: 'Vencido', icon: <AlertTriangle className="h-3 w-3" /> };
    if (isBefore(date, addMonths(now, 3))) return { color: 'text-orange-600 bg-orange-50 border-orange-100', label: 'Próximo', icon: <AlertTriangle className="h-3 w-3" /> };
    return { color: 'text-green-600 bg-green-50 border-green-100', label: 'Vigente', icon: <CheckCircle2 className="h-3 w-3" /> };
  };

  return (
    <div className="page-container">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">Personal Operativo</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Gestión de conductores y cumplimiento de licencias.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={exportToExcel} 
            className="font-black text-[10px] uppercase border-slate-200 hover:bg-emerald-50 h-11"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Exportar Excel
          </Button>
          <Dialog open={isFormOpen} onOpenChange={(open) => { if(!isSaving) { setIsFormOpen(open); if(!open) setSelectedConductor(null); } }}>
            <DialogTrigger asChild>
              <Button className="btn-action w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-200 h-11">
                <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Conductor
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl mx-auto rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]" aria-describedby={undefined}>
              <DialogDescription className="sr-only">Formulario para la gestión de conductores.</DialogDescription>
              <div className="p-6 sm:p-8 border-b bg-slate-50/50">
                <DialogTitle className="text-lg sm:text-xl font-black">Información del Conductor</DialogTitle>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <ConductorForm conductor={selectedConductor} onSave={handleSave} />
              </div>
              {isSaving && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg z-50">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o cédula..."
            className="pl-9 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-orange-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 sm:p-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-xs sm:text-sm font-black uppercase text-muted-foreground tracking-widest text-center">Sincronizando plantilla...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Conductor</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Identificación</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Contacto</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Licencia</TableHead>
                    <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Vencimiento</TableHead>
                    <TableHead className="text-center p-5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => {
                    const status = getStatus(c.vencimientoLicencia);
                    const iniciales = `${c.nombres[0]}${c.apellidos[0]}`.toUpperCase();
                    
                    return (
                      <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <TableCell className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-11 w-11 border-2 border-white shadow-sm shrink-0">
                              <AvatarImage src={c.avatarUrl} />
                              <AvatarFallback className="bg-orange-500 text-white font-black text-xs">{iniciales}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 text-sm uppercase leading-tight truncate">{c.nombres} {c.apellidos}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight truncate">{c.barrio}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <IdCard className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            <span className="text-sm font-bold whitespace-nowrap">{c.cedula}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            <span className="text-sm font-bold whitespace-nowrap">{c.telefono}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-5">
                          <Badge variant="outline" className="font-black text-xs border-indigo-100 text-indigo-600 bg-indigo-50/30 whitespace-nowrap">
                            CAT. {c.categoriaLicencia}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-5">
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border w-fit text-[10px] font-black uppercase whitespace-nowrap", status.color)}>
                            {status.icon}
                            {format(new Date(c.vencimientoLicencia), 'dd MMM yyyy', { locale: es })}
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
                              <DropdownMenuItem onClick={() => { setSelectedConductor(c); setTimeout(() => setIsFormOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5">
                                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Editar Perfil
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
                          <IdCard className="h-12 w-12" />
                          <p className="font-black uppercase text-xs">No se encontraron registros</p>
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
