'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export type MonthlyBilling = {
  mes: string;
  totalFacturado: number;
  totalCostos: number;
  ganancia: number;
  numServicios: number;
};

type Props = {
  data: MonthlyBilling[];
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export function FacturacionMensual({ data }: Props) {
  const sortedData = [...data].sort((a, b) => new Date(b.mes.split(' ')[1], getMonthFromString(b.mes.split(' ')[0])).getTime() - new Date(a.mes.split(' ')[1], getMonthFromString(a.mes.split(' ')[0])).getTime());

  return (
    <ScrollArea className="h-[60vh] w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Total Facturado</TableHead>
            <TableHead className="text-right">Total Costos</TableHead>
            <TableHead className="text-right">Ganancia</TableHead>
            <TableHead className="text-center"># Servicios</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((item) => (
            <TableRow key={item.mes}>
              <TableCell className="font-medium capitalize">{item.mes}</TableCell>
              <TableCell className="text-right">{currencyFormatter.format(item.totalFacturado)}</TableCell>
              <TableCell className="text-right">{currencyFormatter.format(item.totalCostos)}</TableCell>
              <TableCell className="text-right font-semibold text-green-600">
                {currencyFormatter.format(item.ganancia)}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{item.numServicios}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay datos de facturación para mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function getMonthFromString(monthStr: string) {
    const months: { [key: string]: number } = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
        'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };
    return months[monthStr.toLowerCase()];
}
