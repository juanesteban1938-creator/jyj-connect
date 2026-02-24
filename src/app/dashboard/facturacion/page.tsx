
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, DollarSign, TrendingUp, AlertTriangle, FileText, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CuentaCobro } from '@/components/dashboard/facturacion/cuenta-cobro';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function FacturacionPage() {
  const [servicios, setServicios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [isFacturaOpen, setIsFacturaOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('servicios');
    if (stored) setServicios(JSON.parse(stored));
  }, []);

  const stats = useMemo(() => {
    return servicios.reduce((acc, s) => {
      acc.total += s.valorServicio || 0;
      if (s.estadoPago === 'Pagado') acc.ganancia += (s.valorServicio - (s.costoOperacion || 0));
      if (s.estadoPago === 'Pendiente') acc.cartera += s.saldo || 0;
      return acc;
    }, { total: 0, ganancia: 0, cartera: 0 });
  }, [servicios]);

  const filtered = servicios.filter(s => s.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Facturación y Cartera</h1>
        <p className="page-subtitle">Gestión financiera, control de pagos y estado de cuenta.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Facturación Total</span>
              <div className="bg-blue-50 p-2 rounded-full"><DollarSign className="h-4 w-4 text-blue-600" /></div>
            </div>
            <p className="text-2xl font-bold">{currencyFormatter.format(stats.total)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ganancia Neta</span>
              <div className="bg-green-50 p-2 rounded-full"><TrendingUp className="h-4 w-4 text-green-600" /></div>
            </div>
            <p className="text-2xl font-bold">{currencyFormatter.format(stats.ganancia)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Cartera Pendiente</span>
              <div className="bg-red-50 p-2 rounded-full"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            </div>
            <p className="text-2xl font-bold text-red-600">{currencyFormatter.format(stats.cartera)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="p-4">FECHA</TableHead>
                <TableHead className="p-4">CLIENTE</TableHead>
                <TableHead className="p-4 text-right">VALOR</TableHead>
                <TableHead className="p-4 text-center">ESTADO</TableHead>
                <TableHead className="text-center p-4">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="p-4 text-sm font-medium">{format(new Date(s.fecha), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="p-4 text-sm font-bold">{s.cliente}</TableCell>
                  <TableCell className="p-4 text-sm text-right font-semibold">{currencyFormatter.format(s.valorServicio)}</TableCell>
                  <TableCell className="p-4 text-center">
                    <Badge variant={s.estadoPago === 'Pagado' ? 'default' : 'outline'} className="text-[10px] font-bold uppercase">{s.estadoPago}</Badge>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(s); setIsFacturaOpen(true); }}><FileText className="mr-2 h-4 w-4" /> Ver Cuenta de Cobro</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="max-w-4xl bg-[#f0f0f0] p-0 overflow-hidden border-none">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Vista Previa de Cuenta de Cobro</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          {selected && <CuentaCobro servicio={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
