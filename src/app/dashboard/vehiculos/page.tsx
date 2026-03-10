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
import { Search, MoreHorizontal, PlusCircle, Edit, Trash2, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VehiculoForm } from '@/components/dashboard/vehiculos/vehiculos-form';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Vehiculo } from '@/lib/types';

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Vehiculo | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('vehiculos');
    if (stored) setVehiculos(JSON.parse(stored));
  }, []);

  const handleSave = (data: Omit<Vehiculo, 'id'>) => {
    let updated;
    if (selected) {
      updated = vehiculos.map(v => v.id === selected.id ? { ...data, id: selected.id } : v);
    } else {
      updated = [...vehiculos, { ...data, id: Date.now().toString() }];
    }
    setVehiculos(updated);
    localStorage.setItem('vehiculos', JSON.stringify(updated));
    setIsFormOpen(false);
    toast({ title: "Vehículo actualizado" });
  };

  const filtered = vehiculos.filter(v => v.placa.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de Vehículos</h1>
        <p className="page-subtitle">Administra la flota de vehículos y sus documentos técnicos.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if(!o) setSelected(null); }}>
          <DialogTrigger asChild>
            <Button className="btn-action"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Vehículo</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader><DialogTitle>{selected ? 'Editar' : 'Nuevo'} Vehículo</DialogTitle></DialogHeader>
            <VehiculoForm vehiculo={selected} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
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
            {filtered.map((v) => (
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
                      <DropdownMenuItem className="text-red-500" onClick={() => {
                        const up = vehiculos.filter(x => x.id !== v.id);
                        setVehiculos(up);
                        localStorage.setItem('vehiculos', JSON.stringify(up));
                      }}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
