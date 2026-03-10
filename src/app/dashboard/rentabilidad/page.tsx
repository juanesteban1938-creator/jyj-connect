'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { DollarSign, LineChart as LineChartIcon, CreditCard, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RentabilidadForms } from '@/components/dashboard/rentabilidad/rentabilidad-forms';
import { Badge } from '@/components/ui/badge';
import type { Transaccion } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function RentabilidadPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('transacciones');
    if (stored) setTransacciones(JSON.parse(stored));
  }, []);

  const metrics = useMemo(() => {
    const ingresos = transacciones.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + t.valor, 0);
    const gastos = transacciones.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + t.valor, 0);
    return { ingresos, gastos, utilidad: ingresos - gastos };
  }, [transacciones]);

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de P&G</h1>
        <p className="page-subtitle">Administración financiera de la flota y rentabilidad.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ingresos Brutos</span>
            <div className="bg-green-50 p-2 rounded-full"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </div>
          <p className="text-2xl font-bold">{currencyFormatter.format(metrics.ingresos)}</p>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gastos Totales</span>
            <div className="bg-red-50 p-2 rounded-full"><LineChartIcon className="h-4 w-4 text-red-600" /></div>
          </div>
          <p className="text-2xl font-bold">{currencyFormatter.format(metrics.gastos)}</p>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Utilidad Neta</span>
            <div className="bg-orange-50 p-2 rounded-full"><CreditCard className="h-4 w-4 text-orange-600" /></div>
          </div>
          <p className="text-2xl font-bold text-orange-600">{currencyFormatter.format(metrics.utilidad)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-4">
          <RentabilidadForms vehiculos={[]} onSave={(t) => {
            const up = [...transacciones, { ...t, id: Date.now().toString() }];
            setTransacciones(up);
            localStorage.setItem('transacciones', JSON.stringify(up));
          }} />
        </div>
        <Card className="lg:col-span-8 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6 bg-white">
          <CardHeader className="p-0 mb-6"><CardTitle className="text-lg font-bold">Histórico de Transacciones</CardTitle></CardHeader>
          <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar transacciones..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-4">FECHA</TableHead>
                  <TableHead className="p-4">TIPO</TableHead>
                  <TableHead className="p-4">DESCRIPCIÓN</TableHead>
                  <TableHead className="p-4 text-right">VALOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacciones.filter(t => t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="p-4 text-sm">{format(new Date(t.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="p-4"><Badge variant="outline" className={`text-[10px] font-bold uppercase ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo}</Badge></TableCell>
                    <TableCell className="p-4 text-sm font-medium">{t.descripcion}</TableCell>
                    <TableCell className={`p-4 text-sm text-right font-bold ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Ingreso' ? '+' : '-'}{currencyFormatter.format(t.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
