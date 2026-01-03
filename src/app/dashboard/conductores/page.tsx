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
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConductorForm } from '@/components/dashboard/conductores/conductores-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const { toast } = useToast();

  useEffect(() => {
    try {
        const storedConductores = localStorage.getItem('conductores');
        if (storedConductores) {
          setConductores(JSON.parse(storedConductores));
        } else {
           const initialConductores: Conductor[] = [
            {
              id: '1',
              nombres: 'Carlos',
              apellidos: 'Méndez',
              cedula: '1020450332',
              direccion: 'Cra 45 #22-10',
              barrio: 'El Poblado',
              telefono: '3104558899',
              categoriaLicencia: 'C2',
              vencimientoLicencia: '2026-01-24',
              avatarUrl: 'https://i.pravatar.cc/150?u=carlosmendez',
            },
            {
              id: '2',
              nombres: 'Luisa',
              apellidos: 'Pérez',
              cedula: '52340112',
              direccion: 'Calle 10 #5-20',
              barrio: 'Centro',
              telefono: '3127701234',
              categoriaLicencia: 'B1',
              vencimientoLicencia: new Date().toISOString(),
              avatarUrl: 'https://i.pravatar.cc/150?u=luisaperez',
            },
            {
              id: '3',
              nombres: 'Jorge',
              apellidos: 'Ramírez',
              cedula: '79221098',
              direccion: 'Av. Santander #44',
              barrio: 'Laureles',
              telefono: '3001105566',
              categoriaLicencia: 'C3',
              vencimientoLicencia: '2025-12-10',
               avatarUrl: 'https://i.pravatar.cc/150?u=jorgeramirez',
            },
          ];
          localStorage.setItem('conductores', JSON.stringify(initialConductores));
          setConductores(initialConductores);
        }
    } catch (error) {
        console.error("Failed to process conductors from localStorage", error);
        toast({
            variant: "destructive",
            title: "Error al cargar datos",
            description: "No se pudieron cargar los datos de los conductores. Intente recargar la página.",
        });
    }
  }, [toast]);

  const handleSave = (conductorData: Conductor, newAvatarFile?: File) => {
    try {
        let conductor = {...conductorData};
        if (newAvatarFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                conductor.avatarUrl = reader.result as string;
                saveConductor(conductor);
            };
            reader.readAsDataURL(newAvatarFile);
        } else {
            saveConductor(conductor);
        }
    } catch(error) {
        console.error("Error saving conductor:", error);
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: "Ocurrió un problema al intentar guardar el conductor.",
        });
    }
};

  const saveConductor = (conductor: Conductor) => {
      let updatedConductores;
      const isEditing = conductor.id && conductores.some(c => c.id === conductor.id);

      if (isEditing) {
        updatedConductores = conductores.map((c) =>
          c.id === conductor.id ? conductor : c
        );
      } else {
        const newConductor = { ...conductor, id: new Date().toISOString() };
        if(!newConductor.avatarUrl) {
            newConductor.avatarUrl = `https://i.pravatar.cc/150?u=${conductor.cedula}`;
        }
        updatedConductores = [...conductores, newConductor];
      }
      localStorage.setItem('conductores', JSON.stringify(updatedConductores));
      setConductores(updatedConductores);
      
      if (!isEditing) {
        const newTotalPages = Math.ceil(updatedConductores.length / ITEMS_PER_PAGE);
        setCurrentPage(newTotalPages);
      }

      toast({
        title: "¡Éxito!",
        description: `El conductor ${conductor.nombres} ${conductor.apellidos} ha sido ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
      });

      setIsFormOpen(false);
      setSelectedConductor(null);
  }

  const handleDelete = (id: string) => {
    const conductorToDelete = conductores.find((c) => c.id === id);
    if (!conductorToDelete) return;

    const updatedConductores = conductores.filter((c) => c.id !== id);
    localStorage.setItem('conductores', JSON.stringify(updatedConductores));
    setConductores(updatedConductores);

    toast({
        title: "Conductor Eliminado",
        description: `El conductor ${conductorToDelete.nombres} ha sido eliminado.`,
        variant: "destructive",
      });
  };
  
  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    const updatedConductores = conductores.filter((c) => !selectedRows.includes(c.id));
    localStorage.setItem('conductores', JSON.stringify(updatedConductores));
    setConductores(updatedConductores);
    
    toast({
        title: `${selectedRows.length} Conductor(es) Eliminado(s)`,
        description: "Los conductores seleccionados han sido eliminados.",
        variant: "destructive",
      });

    setSelectedRows([]);
  }

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean | string) => {
    const currentIds = paginatedConductores.map(c => c.id);
    if (checked) {
      setSelectedRows(prev => [...new Set([...prev, ...currentIds])]);
    } else {
      setSelectedRows(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };
  
  const openEditForm = (conductor: Conductor) => {
    setSelectedConductor(conductor);
    setIsFormOpen(true);
  }

  const filteredConductores = conductores.filter(
    (c) =>
      c.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cedula.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredConductores.length / ITEMS_PER_PAGE);
  const paginatedConductores = filteredConductores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isAllOnPageSelected = paginatedConductores.length > 0 && paginatedConductores.every(c => selectedRows.includes(c.id));


  const getVencimientoStatus = (dateStr: string) => {
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
            label: 'Fecha inválida',
        };
    }
  };

  const downloadExcel = () => {
    if (conductores.length === 0) return;
    try {
        const dataToExport = conductores.map(({ id, avatarUrl, ...rest }) => ({
            ...rest,
            vencimientoLicencia: format(new Date(rest.vencimientoLicencia), 'dd/MM/yyyy'),
        }));
        const csvContent = "data:text/csv;charset=utf-8," 
          + [Object.keys(dataToExport[0]), ...dataToExport.map(item => Object.values(item))].map(e => e.join(",")).join("\n");
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "conductores.csv");
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
        <p className="font-medium text-foreground">Conductores</p>
      </header>

      <div>
        <h1 className="text-3xl font-bold">Gestión de Conductores</h1>
        <p className="text-muted-foreground">
          Administra la información, licencias y estado de tu flota.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cédula, nombre..."
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
              if (!isOpen) setSelectedConductor(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Conductor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedConductor ? 'Editar Conductor' : 'Añadir Conductor'}
                </DialogTitle>
              </DialogHeader>
              <ConductorForm
                conductor={selectedConductor}
                onSave={handleSave}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {selectedRows.length > 0 && (
         <div className="flex items-center justify-start gap-2 rounded-md bg-muted p-2">
            <Badge variant="secondary" className="px-2 py-1">{selectedRows.length} Seleccionado(s)</Badge>
             <Button variant="ghost" size="sm" onClick={() => {
                 const conductorToEdit = conductores.find(c => c.id === selectedRows[0]);
                 if(conductorToEdit && selectedRows.length === 1) {
                     openEditForm(conductorToEdit);
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
                <TableHead>Conductor</TableHead>
                <TableHead>Información de Contacto</TableHead>
                <TableHead>Categoría Lic.</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="w-[50px]">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedConductores.map((conductor) => (
                <TableRow key={conductor.id} data-state={selectedRows.includes(conductor.id) ? 'selected' : ''}>
                    <TableCell>
                    <Checkbox
                        checked={selectedRows.includes(conductor.id)}
                        onCheckedChange={() => handleSelectRow(conductor.id)}
                        aria-label={`Seleccionar fila para ${conductor.nombres}`}
                    />
                    </TableCell>
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                        <AvatarImage src={conductor.avatarUrl} alt={`Avatar de ${conductor.nombres}`} />
                        <AvatarFallback>
                            {conductor.nombres?.[0]}
                            {conductor.apellidos?.[0]}
                        </AvatarFallback>
                        </Avatar>
                        <div>
                        <p className="font-medium whitespace-nowrap">
                            {conductor.nombres} {conductor.apellidos}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            CC. {conductor.cedula}
                        </p>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>
                    <p className="font-medium whitespace-nowrap">{conductor.telefono}</p>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                        {conductor.direccion}, {conductor.barrio}
                    </p>
                    </TableCell>
                    <TableCell>
                    <Badge variant="outline">{conductor.categoriaLicencia}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className={`flex items-center gap-2 whitespace-nowrap ${getVencimientoStatus(conductor.vencimientoLicencia).color}`}>
                            {getVencimientoStatus(conductor.vencimientoLicencia).icon}
                            <span>{format(new Date(conductor.vencimientoLicencia), 'dd MMM yyyy')}</span>
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
                        <DropdownMenuItem onClick={() => openEditForm(conductor)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => handleDelete(conductor.id)}
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
            {selectedRows.length} de {filteredConductores.length} fila(s) seleccionadas.
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
