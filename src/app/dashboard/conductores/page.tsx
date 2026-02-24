'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConductorForm } from '@/components/dashboard/conductores/conductores-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isBefore, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export type Conductor = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  direccion: string;
  barrio: string;
  telefono: string;
  categoriaLicencia: 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3';
  vencimientoLicencia: string;
  avatarUrl?: string;
};

const ITEMS_PER_PAGE = 5;

export default function ConductoresPage() {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('conductores');
    if (stored) {
      setConductores(JSON.parse(stored));
    }
  }, []);

  const handleSave = (conductorData: Conductor) => {
    let updated;
    if (selectedConductor) {
      updated = conductores.map(c => c.id === selectedConductor.id ? conductorData : c);
    } else {
      updated = [...conductores, { ...conductorData, id: Date.now().toString() }];
    }
    setConductores(updated);
    localStorage.setItem('conductores', JSON.stringify(updated));
    setIsFormOpen(false);
    toast({ title: "Conductor guardado con éxito" });
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
        <p className="page-subtitle">Administra la información, licencias y estado de tu flota.</p>
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
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if(!open) setSelectedConductor(null); }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Conductor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{selectedConductor ? 'Editar' : 'Nuevo'} Conductor</DialogTitle></DialogHeader>
            <ConductorForm conductor={selectedConductor} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
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
                      <DropdownMenuItem className="text-red-500" onClick={() => {
                        const up = conductores.filter(x => x.id !== c.id);
                        setConductores(up);
                        localStorage.setItem('conductores', JSON.stringify(up));
                      }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages || 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}>Siguiente</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
