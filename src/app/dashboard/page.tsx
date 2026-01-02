'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  Users,
  Wallet,
  DollarSign,
  Search,
  LineChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Mock Data - será reemplazada con datos reales de Firestore
const totalVehiculos = 15;
const conductoresActivos = 12;
const carteraPendiente = 2500000;
const ingresosMes = 12500000;

const serviceStatusData = [
  { name: 'Programados', count: 5, fill: 'hsl(var(--chart-1))' },
  { name: 'En Servicio', count: 3, fill: 'hsl(var(--chart-2))' },
  { name: 'Finalizados', count: 12, fill: 'hsl(var(--chart-3))' },
  { name: 'Cancelados', count: 1, fill: 'hsl(var(--chart-4))' },
];

const recentServices = [
  {
    id: 'GA-CCT-101',
    cliente: 'Cliente A',
    fecha: '2024-07-20',
    estado: 'Finalizado',
  },
  {
    id: 'GA-CCT-102',
    cliente: 'Cliente B',
    fecha: '2024-07-22',
    estado: 'En Servicio',
  },
  {
    id: 'GA-CCT-103',
    cliente: 'Cliente C',
    fecha: '2024-07-25',
    estado: 'Programado',
  },
];

const moduleMap: { [key: string]: string } = {
  vehiculos: '/dashboard/vehiculos',
  vehículo: '/dashboard/vehiculos',
  conductores: '/dashboard/conductores',
  conductor: '/dashboard/conductores',
  servicios: '/dashboard/servicios',
  servicio: '/dashboard/servicios',
  facturacion: '/dashboard/facturacion',
  facturación: '/dashboard/facturacion',
  cartera: '/dashboard/facturacion',
  rentabilidad: '/dashboard/rentabilidad',
  'p&g': '/dashboard/rentabilidad',
  monitoreo: '/dashboard/monitoreo',
};

export default function DashboardHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const path = moduleMap[search.toLowerCase().trim()];
      if (path) {
        router.push(path);
      }
    }
  };

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">
          Bienvenido a J&J Connect V2.0
        </h1>
        <p className="text-muted-foreground">
          Tu panel de control para la gestión de transportes.
        </p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Busca un módulo por palabra clave (ej: 'vehiculos') y presiona Enter..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('/dashboard/vehiculos')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Vehículos
            </CardTitle>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehiculos}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('/dashboard/conductores')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conductores Activos
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conductoresActivos}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('/dashboard/facturacion')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cartera Pendiente
            </CardTitle>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {carteraPendiente.toLocaleString('es-CO', {
                style: 'currency',
                currency: 'COP',
              })}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('/dashboard/servicios')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ingresosMes.toLocaleString('es-CO', {
                style: 'currency',
                currency: 'COP',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Estado de Servicios (Este Mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `${value} servicios`}
                />
                <Legend />
                <Bar dataKey="count" name="Servicios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.id}</TableCell>
                    <TableCell>{service.cliente}</TableCell>
                    <TableCell>{service.fecha}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          service.estado === 'Finalizado'
                            ? 'secondary'
                            : service.estado === 'En Servicio'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {service.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
