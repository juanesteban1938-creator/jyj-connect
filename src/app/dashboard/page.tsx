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
  <Card>
    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
      <div className="space-y-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-2xl font-bold">{value}</div>
      </div>
       <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgColor}`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      {change && (
        <div className="flex items-center text-xs text-muted-foreground">
          <Badge
            variant="secondary"
            className={`flex items-center gap-1 ${
              changeType === 'positive'
                ? 'bg-green-100 text-green-800'
                : changeType === 'negative'
                ? 'bg-red-100 text-red-800'
                : ''
            }`}
          >
            <ArrowUp
              className={`h-3 w-3 ${
                changeType === 'negative' ? 'rotate-180' : ''
              }`}
            />
            {change}
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
);

const ActionCard = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) => (
  <Card className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 hover:bg-accent">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      {icon}
    </div>
    <p className="text-sm font-medium">{title}</p>
  </Card>
);

export default function DashboardHomePage() {
  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden bg-accent">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div>
              <h2 className="font-headline text-3xl font-bold">
                Hola, Administrador
              </h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                Bienvenido al panel de control de J&J Connect V2.0. Tienes{' '}
                <span className="font-bold text-primary">3 incidentes</span> pendientes
                y{' '}
                <span className="font-bold text-primary">
                  5 nuevos conductores
                </span>{' '}
                por aprobar hoy.
              </p>
              <div className="mt-4 flex gap-2">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Servicio
                </Button>
                <Button variant="outline">Ver Reportes</Button>
              </div>
            </div>
            <div className="absolute -right-10 -top-10 opacity-20">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 4H6C4.9 4 4 4.9 4 6V18H3C2.45 18 2 18.45 2 19C2 19.55 2.45 20 3 20H21C21.55 20 22 19.55 22 19C22 18.45 21.55 18 21 18H20V6C20 4.9 19.1 4 18 4ZM6 16V6H18V16H6ZM8.5 11C9.33 11 10 10.33 10 9.5C10 8.67 9.33 8 8.5 8C7.67 8 7 8.67 7 9.5C7 10.33 7.67 11 8.5 11ZM15.5 11C16.33 11 17 10.33 17 9.5C17 8.67 16.33 8 15.5 8C14.67 8 14 8.67 14 9.5C14 10.33 14.67 11 15.5 11Z"/>
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Viajes Activos"
          value="24"
          icon={<Briefcase className="h-5 w-5 text-blue-500" />}
          change="+5%"
          changeType="positive"
          iconBgColor="bg-blue-100"
        />
        <StatCard
          title="Conductores Libres"
          value="8"
          icon={<Users className="h-5 w-5 text-orange-500" />}
          change="0%"
          changeType="neutral"
          iconBgColor="bg-orange-100"
        />
        <StatCard
          title="Ingresos Hoy"
          value="$2.5M"
          icon={<DollarSign className="h-5 w-5 text-green-500" />}
          change="+12%"
          changeType="positive"
          iconBgColor="bg-green-100"
        />
        <StatCard
          title="Alertas Flota"
          value="2"
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          change="!"
          changeType="negative"
          iconBgColor="bg-red-100"
        />
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold">Acciones Rápidas</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard title="Nuevo Servicio" icon={<Plus />} />
          <ActionCard title="Registrar Conductor" icon={<UserPlus />} />
          <ActionCard title="Ver Rutas" icon={<Route />} />
          <ActionCard title="Reportar Incidente" icon={<AlertTriangle />} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Monitoreo en Tiempo Real</h3>
          <Button variant="link" className="text-primary">
            VER MAPA COMPLETO
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
             <Image
              src="https://picsum.photos/seed/map/1200/400"
              alt="Mapa de monitoreo en tiempo real"
              width={1200}
              height={400}
              className="h-auto w-full rounded-lg object-cover"
              data-ai-hint="city map"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
