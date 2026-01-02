'use client';
import {
  AlertTriangle,
  ArrowUp,
  Briefcase,
  DollarSign,
  Plus,
  Route,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const StatCard = ({
  title,
  value,
  icon,
  change,
  changeType,
  iconBgColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  iconBgColor: string;
}) => (
  <Card className="transition-all hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgColor}`}
      >
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className="text-xs text-muted-foreground">
          <span
            className={
              changeType === 'positive'
                ? 'text-green-600'
                : changeType === 'negative'
                ? 'text-red-600'
                : ''
            }
          >
            {change}
          </span>{' '}
          vs el mes anterior
        </p>
      )}
    </CardContent>
  </Card>
);

export default function DashboardHomePage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bienvenido, Administrador</h2>
          <p className="text-muted-foreground">
            Aquí tienes un resumen de tu operación.
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar módulo..." className="pl-9" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Vehículos"
          value="15"
          icon={<Briefcase className="h-5 w-5 text-blue-500" />}
          change="+2"
          changeType="positive"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Conductores Activos"
          value="12"
          icon={<Users className="h-5 w-5 text-orange-500" />}
          change="+1"
          changeType="positive"
          iconBgColor="bg-orange-100"
        />
        <StatCard
          title="Cartera Pendiente"
          value="$1.2M"
          icon={<DollarSign className="h-5 w-5 text-red-500" />}
          change="+$200k"
          changeType="negative"
          iconBgColor="bg-red-100"
        />
        <StatCard
          title="Ingresos del Mes"
          value="$8.7M"
          icon={<ArrowUp className="h-5 w-5 text-green-500" />}
          change="+15%"
          changeType="positive"
          iconBgColor="bg-green-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 relative overflow-hidden bg-primary/10">
           <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <h3 className="font-headline text-2xl font-bold text-gray-800 dark:text-white">
                  Estado de los Servicios
                </h3>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Tienes <span className="font-bold text-primary">3 incidentes</span> pendientes y{' '}
                  <span className="font-bold text-primary">5 nuevos conductores</span> por aprobar.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Servicio
                  </Button>
                  <Button variant="outline">Ver Reportes</Button>
                </div>
              </div>
               <div className="absolute -right-20 -top-10 z-0 text-primary/10">
                <svg
                  width="300"
                  height="300"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M-1.49012e-06 120.37C-1.49012e-06 87.0557 26.8629 60.1928 60.1772 60.1928V60.1928H139.823C173.137 60.1928 200 87.0557 200 120.37V155.228C200 174.524 184.516 190.008 165.22 190.008H34.7798C15.4839 190.008 -1.49012e-06 174.524 -1.49012e-06 155.228V120.37Z"
                    fill="currentColor"
                  />
                  <rect
                    x="30"
                    y="85"
                    width="140"
                    height="40"
                    rx="8"
                    fill="hsl(var(--background))"
                  />
                  <circle cx="55" cy="155" r="15" fill="hsl(var(--background))" />
                  <circle cx="145" cy="155" r="15" fill="hsl(var(--background))" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Servicios Recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Servicio #523</p>
                <p className="text-sm text-muted-foreground">Cliente: Constructora XYZ</p>
              </div>
              <Badge variant="outline">Finalizado</Badge>
            </div>
             <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Servicio #522</p>
                <p className="text-sm text-muted-foreground">Cliente: Eventos SAS</p>
              </div>
              <Badge variant="outline">Finalizado</Badge>
            </div>
             <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Servicio #521</p>
                <p className="text-sm text-muted-foreground">Cliente: Colegio ABC</p>
              </div>
              <Badge className="bg-green-100 text-green-800">En Curso</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
