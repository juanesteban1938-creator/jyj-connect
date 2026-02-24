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
  Search,
  FileDown,
  Edit,
  Trash2,
  Mail,
  Phone,
  PlusCircle,
  MoreHorizontal,
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
import { Servicio } from '@/app/dashboard/servicios/page';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type Cliente = {
  id: string; 
  razonSocial: string;
  nit: string;
  telefono: string;
  email?: string;
  tipo: 'Institucional' | 'Corporativo' | 'ONG' | 'Turismo' | 'Particular';
};

const ITEMS_PER_PAGE = 5;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedClientes = localStorage.getItem('clientes');
      const storedServicios = localStorage.getItem('servicios');
      const clientesMap = new Map<string, Cliente>();

      if (storedClientes) {
        const parsedClientes: Cliente[] = JSON.parse(storedClientes);
        parsedClientes.forEach(c => clientesMap.set(c.id, c));
      }

      if (storedServicios) {
        const servicios: Servicio[] = JSON.parse(storedServicios);
        const tipoClienteMap = new Map<string, Cliente['tipo']>([
            ['Colegio San Pedro', 'Institucional'],
            ['Tecnologías del Sur S.A.S', 'Corporativo'],
            ['Fundación Esperanza', 'ONG'],
            ['Hotel Mirador Andes', 'Turismo'],
        ]);

        servicios.forEach(servicio => {
          if (servicio.nitCliente && !clientesMap.has(servicio.nitCliente)) {
            const tipo = tipoClienteMap.get(servicio.cliente) || 'Particular';
            clientesMap.set(servicio.nitCliente, {
              id: servicio.nitCliente,
              razonSocial: servicio.cliente,
              nit: servicio.nitCliente,
              telefono: servicio.telefonoCliente,
              email: servicio.emailCliente,
              tipo: tipo,
            });
          }
        });
      }
      
      if (clientesMap.size === 0) {
          const dummyClientes: Cliente[] = [
                { id: '890.987.654-2', razonSocial: 'Colegio San Pedro', nit: '890.987.654-2', telefono: '+57 601 234 5678', email: 'admin@sanpedro.edu.co', tipo: 'Institucional' },
                { id: '900.123.456-1', razonSocial: 'Tecnologías del Sur S.A.S', nit: '900.123.456-1', telefono: '+57 300 555 1234', email: 'contacto@tecsur.com', tipo: 'Corporativo' },
                { id: '860.002.331-5', razonSocial: 'Fundación Esperanza', nit: '860.002.331-5', telefono: '+57 601 555 9876', email: 'info@esperanza.org', tipo: 'ONG' },
                { id: '901.555.777-0', razonSocial: 'Hotel Mirador Andes', nit: '901.555.777-0', telefono: '+57 311 444 2222', email: 'reservas@mirador.com', tipo: 'Turismo' },
                { id: '52.345.678', razonSocial: 'Marta Lucía Gómez', nit: '52.345.678', telefono: '+57 310 999 8877', email: 'marta.gomez@gmail.com', tipo: 'Particular' },
            ];
            dummyClientes.forEach(c => clientesMap.set(c.id, c));
      }

      const allClientes = Array.from(clientesMap.values());
      setClientes(allClientes);
      localStorage.setItem('clientes', JSON.stringify(allClientes));
    } catch (error) {
      console.error("Failed to process clients", error);
    }
  }, []);
  
  const handleSave = (clienteData: Omit<Cliente, 'id'>) => {
    let updatedClientes;
    const isEditing = selectedCliente && clientes.some(c => c.id === selectedCliente.id);

    if (isEditing && selectedCliente) {
      updatedClientes = clientes.map((c) =>
        c.id === selectedCliente.id ? { ...selectedCliente, ...clienteData } : c
      );
    } else {
      const newCliente = { ...clienteData, id: clienteData.nit };
      updatedClientes = [...clientes, newCliente];
    }
    localStorage.setItem('clientes', JSON.stringify(updatedClientes));
    setClientes(updatedClientes);
    
    toast({
      title: "¡Éxito!",
      description: `El cliente ha sido ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
    });

    setIsFormOpen(false);
    setSelectedCliente(null);
  };

  const handleDelete = (id: string) => {
    const updatedClientes = clientes.filter((c) => c.id !== id);
    localStorage.setItem('clientes', JSON.stringify(updatedClientes));
    setClientes(updatedClientes);
    toast({ title: "Cliente Eliminado", variant: "destructive" });
  };

  const filteredClientes = clientes.filter(
    (c) =>
      c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Cartera de Clientes</h1>
        <p className="page-subtitle">Gestione de forma centralizada la información de sus clientes.</p>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o NIT..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
           <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setSelectedCliente(null); }}>
            <DialogTrigger asChild>
              <Button className="btn-action">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
              </DialogHeader>
              <ClienteForm
                cliente={selectedCliente}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                <TableHead className="w-[50px] p-4 text-center">
                    <Checkbox
                      checked={paginatedClientes.length > 0 && paginatedClientes.every(c => selectedRows.includes(c.id))}
                      onCheckedChange={(checked) => {
                        const currentIds = paginatedClientes.map(c => c.id);
                        if (checked) {
                          setSelectedRows(prev => [...new Set([...prev, ...currentIds])]);
                        } else {
                          setSelectedRows(prev => prev.filter(id => !currentIds.includes(id)));
                        }
                      }}
                    />
                </TableHead>
                <TableHead className="p-4">CLIENTE / RAZÓN SOCIAL</TableHead>
                <TableHead className="p-4">NIT / DOCUMENTO</TableHead>
                <TableHead className="p-4">CONTACTO</TableHead>
                <TableHead className="w-[100px] text-center p-4">ACCIONES</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedClientes.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-muted/30">
                    <TableCell className="p-4 text-center">
                        <Checkbox
                            checked={selectedRows.includes(cliente.id)}
                            onCheckedChange={() => {
                              setSelectedRows(prev => 
                                prev.includes(cliente.id) ? prev.filter(id => id !== cliente.id) : [...prev, cliente.id]
                              );
                            }}
                        />
                    </TableCell>
                    <TableCell className="p-4">
                        <div className="font-semibold text-sm">{cliente.razonSocial}</div>
                        <Badge variant="outline" className="text-[10px] mt-1 uppercase">{cliente.tipo}</Badge>
                    </TableCell>
                    <TableCell className="p-4 text-muted-foreground text-sm">{cliente.nit}</TableCell>
                    <TableCell className="p-4">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{cliente.telefono}</span>
                        </div>
                        {cliente.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{cliente.email}</span>
                        </div>
                        )}
                    </TableCell>
                    <TableCell className="p-4 text-center">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedCliente(cliente); setIsFormOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(cliente.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
         <div className="flex flex-col items-center justify-between gap-4 p-4 border-t md:flex-row bg-muted/10">
          <div className="text-sm text-muted-foreground">
            Mostrando <strong>{filteredClientes.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredClientes.length)}</strong> de <strong>{filteredClientes.length}</strong> clientes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="text-sm font-medium">Pág. {currentPage} de {totalPages || 1}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
