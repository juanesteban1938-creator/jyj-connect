'use client';
import {
  ArrowUp,
  Briefcase,
  DollarSign,
  Plus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
               <div className="absolute -right-16 -top-10 z-0 text-primary/20">
                <svg
                  width="250"
                  height="250"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M183.333 54.1667V100C183.333 104.233 181.7 108.3 178.8 111.533C175.9 114.767 172.033 116.667 166.667 116.667H33.3333C27.9667 116.667 24.1 114.767 21.2 111.533C18.3 108.3 16.6667 104.233 16.6667 100V54.1667H100V41.6667H16.6667C12.1667 41.6667 8.33333 43.4 5 46.8C1.66667 50.2 0 54.1667 0 58.3333V158.333C0 161.467 0.5 164.533 1.5 167.5C2.5 170.467 3.83333 173.1 5.5 175.4C7.16667 177.7 9.16667 179.6 11.5 181.1C13.8333 182.6 16.5 183.333 19.5 183.333H22.8333C23.5 185.933 24.8 188.167 26.7333 190.033C28.6667 191.9 31.0667 192.933 33.9333 193.133C34.2333 192.2 34.6 191.333 35.0333 190.533C35.4667 189.733 35.9333 189.033 36.4333 188.433C37.4333 189.6 38.6333 190.5 40.0333 191.133C41.4333 191.767 42.9333 192.067 44.5333 192.033C48.8333 192.033 52.1333 190.533 54.4333 187.533C56.7333 184.533 57.9 180.9 57.9 176.633C57.9 175.733 57.8 174.833 57.6 173.933H142.233C142.033 174.833 141.933 175.733 141.933 176.633C141.933 180.9 143.1 184.533 145.4 187.533C147.7 190.533 151.033 192.033 155.4 192.033C157 192.033 158.5 191.733 159.9 191.133C161.3 190.533 162.533 189.6 163.6 188.433C164.1 189.033 164.567 189.733 165 190.533C165.433 191.333 165.8 192.2 166.1 193.133C168.967 192.933 171.367 191.9 173.3 190.033C175.233 188.167 176.533 185.933 177.2 183.333H180.5C183.5 183.333 186.167 182.6 188.5 181.1C190.833 179.6 192.833 177.7 194.5 175.4C196.167 173.1 197.5 170.467 198.5 167.5C199.5 164.533 200 161.467 200 158.333V58.3333C200 54.1667 198.333 50.2 195 46.8C191.667 43.4 187.833 41.6667 183.333 41.6667H116.667V54.1667H183.333ZM41.6667 179.167C40.2667 179.167 39.1333 178.633 38.2667 177.567C37.4 176.5 36.9667 175.233 36.9667 173.767C36.9667 172.3 37.4 171.033 38.2667 169.967C39.1333 168.9 40.2667 168.367 41.6667 168.367C43.0667 168.367 44.2333 168.9 45.1667 169.967C46.1 171.033 46.5667 172.3 46.5667 173.767C46.5667 175.233 46.1 176.5 45.1667 177.567C44.2333 178.633 43.0667 179.167 41.6667 179.167ZM158.333 179.167C156.933 179.167 155.8 178.633 154.933 177.567C154.067 176.5 153.633 175.233 153.633 173.767C153.633 172.3 154.067 171.033 154.933 169.967C155.8 168.9 156.933 168.367 158.333 168.367C159.733 168.367 160.9 168.9 161.833 169.967C162.767 171.033 163.233 172.3 163.233 173.767C163.233 175.233 162.767 176.5 161.833 177.567C160.9 178.633 159.733 179.167 158.333 179.167ZM25 104.167H41.6667V125H25V104.167ZM50 104.167H66.6667V125H50V104.167ZM75 104.167H91.6667V125H75V104.167Z"
                    fill="currentColor"
                  />
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
