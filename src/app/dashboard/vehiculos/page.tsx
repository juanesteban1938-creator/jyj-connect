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
  FileDown,
  PlusCircle,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Home,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { VehiculoForm } from '@/components/dashboard/vehiculos/vehiculos-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isBefore, addMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';

export type Vehiculo = {
  id: string;
  marca: string;
  linea: string;
  modelo: string;
  tipoVehiculo: 'BUS' | 'BUSETA' | 'MICROBUS' | 'CAMIONETA' | 'OTRO';
  capacidad: number;
  placa: string;
  numeroPolizaSoat?: string;
  vencimientoSoat?: string;
  numeroPolizaRcc?: string;
  vencimientoRcc?: string;
  numeroPolizaRce?: string;
  vencimientoRce?: string;
  vencimientoTecnomecanica?: string;
  vencimientoTarjetaOperacion?: string;
};

const ITEMS_PER_PAGE = 5;

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedVehiculos = localStorage.getItem('vehiculos');
      if (storedVehiculos) {
        setVehiculos(JSON.parse(storedVehiculos));
      } else {
        const initialVehiculos: Vehiculo[] = [
           {
            id: '1',
            marca: 'Chevrolet',
            linea: 'NPR',
            modelo: '2022',
            tipoVehiculo: 'BUS',
            capacidad: 40,
            placa: 'XYZ-123',
            vencimientoSoat: '2025-08-15',
            vencimientoTecnomecanica: '2025-02-20',
          },
          {
            id: '2',
            marca: 'Mercedes-Benz',
            linea: 'Sprinter',
            modelo: '2023',
            tipoVehiculo: 'BUSETA',
            capacidad: 19,
            placa: 'ABC-456',
            vencimientoSoat: new Date().toISOString(),
            vencimientoTecnomecanica: '2024-11-30',
          },
          {
            id: '3',
            marca: 'Renault',
            linea: 'Master',
            modelo: '2021',
            tipoVehiculo: 'MICROBUS',
            capacidad: 16,
            placa: 'DEF-789',
            vencimientoSoat: addMonths(new Date(), 2).toISOString(),
            vencimientoTecnomecanica: '2025-05-10',
          },
        ];
        localStorage.setItem('vehiculos', JSON.stringify(initialVehiculos));
        setVehiculos(initialVehiculos);
      }
    } catch (error) {
      console.error("Failed to process vehicles from localStorage", error);
      toast({
        variant: "destructive",
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos de los vehículos. Intente recargar la página.",
      });
    }
  }, [toast]);

  const handleSave = (vehiculoData: Omit<Vehiculo, 'id'>) => {
    try {
      let updatedVehiculos;
      const isEditing = selectedVehiculo && vehiculos.some(v => v.id === selectedVehiculo.id);

      if (isEditing && selectedVehiculo) {
        updatedVehiculos = vehiculos.map((v) =>
          v.id === selectedVehiculo.id ? { ...v, ...vehiculoData } : v
        );
      } else {
        const newVehiculo = { ...vehiculoData, id: new Date().toISOString() };
        updatedVehiculos = [...vehiculos, newVehiculo];
      }
      localStorage.setItem('vehiculos', JSON.stringify(updatedVehiculos));
      setVehiculos(updatedVehiculos);
      
      if (!isEditing) {
        const newTotalPages = Math.ceil(updatedVehiculos.length / ITEMS_PER_PAGE);
        setCurrentPage(newTotalPages);
      }

      toast({
        title: "¡Éxito!",
        description: `El vehículo de placas ${vehiculoData.placa} ha sido ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
      });

      setIsFormOpen(false);
      setSelectedVehiculo(null);
    } catch (error) {
       console.error("Error saving vehicle:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "Ocurrió un problema al intentar guardar el vehículo.",
        });
    }
  };

  const handleDelete = (id: string) => {
    const vehiculoToDelete = vehiculos.find((v) => v.id === id);
    if (!vehiculoToDelete) return;

    const updatedVehiculos = vehiculos.filter((v) => v.id !== id);
    localStorage.setItem('vehiculos', JSON.stringify(updatedVehiculos));
    setVehiculos(updatedVehiculos);

    toast({
      title: "Vehículo Eliminado",
      description: `El vehículo de placas ${vehiculoToDelete.placa} ha sido eliminado.`,
      variant: "destructive",
    });
  };

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    const updatedVehiculos = vehiculos.filter((v) => !selectedRows.includes(v.id));
    localStorage.setItem('vehiculos', JSON.stringify(updatedVehiculos));
    setVehiculos(updatedVehiculos);
    
    toast({
      title: `${selectedRows.length} Vehículo(s) Eliminado(s)`,
      description: "Los vehículos seleccionados han sido eliminados.",
      variant: "destructive",
    });

    setSelectedRows([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean | string) => {
    const currentIds = paginatedVehiculos.map(c => c.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...currentIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };
  
  const openEditForm = (vehiculo: Vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setIsFormOpen(true);
  };

  const filteredVehiculos = vehiculos.filter(
    (v) =>
      v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.linea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVehiculos.length / ITEMS_PER_PAGE);
  const paginatedVehiculos = filteredVehiculos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isAllOnPageSelected = paginatedVehiculos.length > 0 && paginatedVehiculos.every(v => selectedRows.includes(v.id));

  const getVencimientoStatus = (dateStr?: string) => {
    if (!dateStr) {
      return {
        color: 'text-gray-400',
        icon: null,
        label: 'N/A',
      };
    }
    try {
      const vencimiento = new Date(dateStr);
      const now = new Date();
      const threeMonthsFromNow = addMonths(now, 3);
      if (isBefore(vencimiento, now)) {
        return {
          color: 'text-red-500',
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Vencido',
        };
      }
      if (isBefore(vencimiento, threeMonthsFromNow)) {
        return {
          color: 'text-yellow-500',
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Próximo a vencer',
        };
      }
      return {
        color: 'text-green-500',
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: 'Vigente',
      };
    } catch (error) {
      return {
        color: 'text-gray-500',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Inválido',
      };
    }
  };

  const downloadExcel = () => {
    if (vehiculos.length === 0) return;
    try {
      const dataToExport = vehiculos.map(({ id, ...rest }) => {
        const formattedRest = Object.fromEntries(
            Object.entries(rest).map(([key, value]) => {
                if(key.startsWith('vencimiento') && typeof value === 'string') {
                    try {
                        return [key, format(new Date(value), 'dd/MM/yyyy')];
                    } catch {
                        return [key, 'Fecha inválida'];
                    }
                }
                return [key, value];
            })
        );
        return formattedRest;
    });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [Object.keys(dataToExport[0]), ...dataToExport.map(item => Object.values(item))].map(e => e.join(",")).join("\n");
      
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", "vehiculos.csv");
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

  const formatDocumentDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  }


  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <Home className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">/</span>
        <p className="font-medium text-foreground">Vehículos</p>
      </header>

      <div>
        <h1 className="text-3xl font-bold">Gestión de Vehículos</h1>
        <p className="text-muted-foreground">
          Administra la flota de vehículos, su documentación y vencimientos.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, marca..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={downloadExcel} className="w-full sm:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Descargar Excel
          </Button>
          <Dialog
            open={isFormOpen}
            onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setSelectedVehiculo(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Vehículo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                </DialogTitle>
              </DialogHeader>
              <VehiculoForm
                vehiculo={selectedVehiculo}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {selectedRows.length > 0 && (
         <div className="flex items-center justify-start gap-2 rounded-md bg-muted p-2">
            <Badge variant="secondary" className="px-2 py-1">{selectedRows.length} Seleccionado(s)</Badge>
             <Button variant="ghost" size="sm" onClick={() => {
                 const vehiculoToEdit = vehiculos.find(c => c.id === selectedRows[0]);
                 if(vehiculoToEdit && selectedRows.length === 1) {
                     openEditForm(vehiculoToEdit);
                 }
             }} disabled={selectedRows.length !== 1}>
                <Edit className="mr-2 h-4 w-4"/>
                Editar
            </Button>
             <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDeleteSelected}>
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
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo y Capacidad</TableHead>
                <TableHead>SOAT</TableHead>
                <TableHead>Tecnomecánica</TableHead>
                <TableHead className="w-[50px]">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedVehiculos.map((vehiculo) => (
                <TableRow key={vehiculo.id} data-state={selectedRows.includes(vehiculo.id) ? 'selected' : ''}>
                    <TableCell>
                    <Checkbox
                        checked={selectedRows.includes(vehiculo.id)}
                        onCheckedChange={() => handleSelectRow(vehiculo.id)}
                        aria-label={`Seleccionar fila para ${vehiculo.placa}`}
                    />
                    </TableCell>
                    <TableCell>
                    <div className="flex items-center gap-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Truck className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                        <p className="font-medium whitespace-nowrap">
                            {vehiculo.marca} {vehiculo.linea}
                        </p>
                        <p className="text-sm text-muted-foreground">
                           Placa: {vehiculo.placa}
                        </p>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>
                    <p className="font-medium whitespace-nowrap">{vehiculo.tipoVehiculo}</p>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                        {vehiculo.capacidad} pasajeros
                    </p>
                    </TableCell>
                    <TableCell>
                        <div className={`flex items-center gap-2 whitespace-nowrap ${getVencimientoStatus(vehiculo.vencimientoSoat).color}`}>
                            {getVencimientoStatus(vehiculo.vencimientoSoat).icon}
                            <span>{formatDocumentDate(vehiculo.vencimientoSoat)}</span>
                        </div>
                    </TableCell>
                     <TableCell>
                        <div className={`flex items-center gap-2 whitespace-nowrap ${getVencimientoStatus(vehiculo.vencimientoTecnomecanica).color}`}>
                            {getVencimientoStatus(vehiculo.vencimientoTecnomecanica).icon}
                            <span>{formatDocumentDate(vehiculo.vencimientoTecnomecanica)}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(vehiculo)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => handleDelete(vehiculo.id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
         <div className="flex flex-col items-center justify-between gap-4 p-4 border-t md:flex-row">
          <div className="text-sm text-muted-foreground">
            {selectedRows.length} de {filteredVehiculos.length} fila(s) seleccionadas.
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
             <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
