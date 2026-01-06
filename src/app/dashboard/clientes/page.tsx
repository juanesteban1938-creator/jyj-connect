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
  Home,
  Mail,
  Phone,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Servicio } from '@/app/dashboard/servicios/page';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type Cliente = {
  id: string; // nitCliente can serve as a unique ID
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
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedServicios = localStorage.getItem('servicios');
      const clientesMap = new Map<string, Cliente>();

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

      setClientes(Array.from(clientesMap.values()));

    } catch (error) {
      console.error("Failed to process clients from localStorage", error);
      toast({
        variant: "destructive",
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos de los clientes. Intente recargar la página.",
      });
    }
  }, [toast]);
  
  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean | string) => {
    const currentIds = paginatedClientes.map(c => c.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...currentIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const filteredClientes = clientes.filter(
    (c) =>
      c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isAllOnPageSelected = paginatedClientes.length > 0 && paginatedClientes.every(v => selectedRows.includes(v.id));
  
  const getBadgeVariant = (tipo: Cliente['tipo']) => {
    switch (tipo) {
      case 'Institucional': return 'bg-blue-100 text-blue-800';
      case 'Corporativo': return 'bg-purple-100 text-purple-800';
      case 'ONG': return 'bg-green-100 text-green-800';
      case 'Turismo': return 'bg-yellow-100 text-yellow-800';
      case 'Particular': return 'bg-gray-100 text-gray-800';
      default: return 'secondary';
    }
  };

  const downloadExcel = () => {
    if (filteredClientes.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay datos para exportar",
        description: "Filtre los clientes que desea descargar.",
      });
      return;
    }
    try {
        const dataToExport = filteredClientes.map(({ id, ...rest }) => rest);
        const csvContent = "data:text/csv;charset=utf-8," 
          + [Object.keys(dataToExport[0]), ...dataToExport.map(item => Object.values(item))].map(e => e.join(",")).join("\n");
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `clientes_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(error) {
        toast({
            variant: "destructive",
            title: "Error al descargar",
            description: "No se pudo generar el archivo Excel.",
        });
    }
  };

  return (
    <div className="space-y-6">
       <header className="flex items-center space-x-2">
        <Home className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">/</span>
        <p className="font-medium text-foreground">Clientes</p>
      </header>
      <div>
        <h1 className="text-3xl font-bold">Cartera de Clientes</h1>
        <p className="text-muted-foreground">
          Gestione de forma centralizada la información de sus clientes. Visualice, edite y mantenga actualizada la base de datos de contactos para una operación eficiente.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por Nombre, NIT o Teléfono..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
           <Button variant="outline" className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" onClick={downloadExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
       {selectedRows.length > 0 && (
         <div className="flex items-center justify-start gap-2 rounded-md bg-muted p-2">
            <Badge variant="secondary" className="px-2 py-1">{selectedRows.length} Seleccionado(s)</Badge>
             <Button variant="ghost" size="sm" disabled>
                <Edit className="mr-2 h-4 w-4"/>
                Editar
            </Button>
             <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" disabled>
                <Trash2 className="mr-2 h-4 w-4"/>
                Eliminar
            </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox
                    onCheckedChange={handleSelectAll}
                    checked={isAllOnPageSelected}
                    aria-label="Seleccionar todas las filas de la página actual"
                    />
                </TableHead>
                <TableHead>CLIENTE / RAZÓN SOCIAL</TableHead>
                <TableHead>NIT / DOCUMENTO</TableHead>
                <TableHead>TELÉFONO</TableHead>
                <TableHead>CORREO ELECTRÓNICO</TableHead>
                <TableHead className="w-[100px] text-center">ACCIONES</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedClientes.map((cliente) => (
                <TableRow key={cliente.id} data-state={selectedRows.includes(cliente.id) ? 'selected' : ''}>
                    <TableCell>
                        <Checkbox
                            checked={selectedRows.includes(cliente.id)}
                            onCheckedChange={() => handleSelectRow(cliente.id)}
                            aria-label={`Seleccionar fila para ${cliente.razonSocial}`}
                        />
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{cliente.razonSocial}</div>
                        <Badge variant="outline" className={cn("font-normal", getBadgeVariant(cliente.tipo))}>{cliente.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cliente.nit}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{cliente.telefono}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        {cliente.email ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${cliente.email}`} className="hover:underline">{cliente.email}</a>
                        </div>
                        ) : (
                            <span className="text-muted-foreground/50">No disponible</span>
                        )}
                    </TableCell>
                    <TableCell className="text-center">
                        <Button variant="ghost" size="icon" disabled>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </TableCell>
                </TableRow>
                ))}
                 {paginatedClientes.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No se encontraron clientes.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
         <div className="flex flex-col items-center justify-between gap-4 p-4 border-t md:flex-row">
          <div className="text-sm text-muted-foreground">
            Mostrando <strong>{filteredClientes.length > 0 ? Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredClientes.length) : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredClientes.length)}</strong> de <strong>{filteredClientes.length}</strong> clientes
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
             <div className="flex items-center gap-1">
                {Array.from({ length: totalPages > 4 ? 4 : totalPages }, (_, i) => {
                    if(totalPages > 4 && i === 2) return <span key="ellipsis" className="px-2">...</span>
                    if(totalPages > 4 && i === 3) return (
                        <Button key={totalPages} variant={currentPage === totalPages ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)}>
                            {totalPages}
                        </Button>
                    )
                    const pageNum = i + 1;
                    return (
                        <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                            {pageNum}
                        </Button>
                    )
                })}
             </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
