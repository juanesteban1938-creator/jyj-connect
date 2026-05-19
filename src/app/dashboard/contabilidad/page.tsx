'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  DollarSign,
  PieChart,
  CreditCard,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AsientoContable } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function ContabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const db = useFirestore();
  const { user } = useUser();

  // Suscripción al Libro Diario
  const asientosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'asientos_contables'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const { data: asientosRaw, isLoading } = useCollection<AsientoContable>(asientosQuery);
  const asientos = asientosRaw || [];

  // Cálculos de Resumen Financiero
  const metrics = useMemo(() => {
    let activos = 0;
    let pasivos = 0;
    let ingresos = 0;
    let costosGastos = 0;

    asientos.forEach(asiento => {
      asiento.movimientos?.forEach(mov => {
        const codigo = mov.cuentaCodigo || '';
        const valor = Number(mov.valor) || 0;

        // Reglas de PUC Colombia para Resumen
        if (codigo.startsWith('1')) { // Activos
          activos += mov.tipo === 'debito' ? valor : -valor;
        } else if (codigo.startsWith('2')) { // Pasivos
          pasivos += mov.tipo === 'credito' ? valor : -valor;
        } else if (codigo.startsWith('4')) { // Ingresos
          ingresos += mov.tipo === 'credito' ? valor : -valor;
        } else if (codigo.startsWith('5') || codigo.startsWith('6')) { // Gastos y Costos
          costosGastos += mov.tipo === 'debito' ? valor : -valor;
        }
      });
    });

    return {
      activos: currencyFormatter.format(activos),
      pasivos: currencyFormatter.format(pasivos),
      utilidad: currencyFormatter.format(ingresos - costosGastos),
      isPositive: (ingresos - costosGastos) >= 0
    };
  }, [asientos]);

  // Filtrado de la tabla
  const filteredAsientos = useMemo(() => {
    return asientos.filter(a => 
      a.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.movimientos?.some(m => 
        m.cuentaCodigo?.includes(searchTerm) || 
        m.cuentaNombre?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [asientos, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 bg-white rounded-3xl">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Sincronizando Libro Diario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Corporativo */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Contabilidad Central</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Libro diario inmutable y balance de saldos bajo norma local.</p>
        </div>
      </header>

      {/* Tarjetas de Resumen (Estilo Colorido) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-emerald-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Activos Totales</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{metrics.activos}</p>
          </div>
        </Card>

        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-rose-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Pasivos Totales</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{metrics.pasivos}</p>
          </div>
        </Card>

        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-orange-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Utilidad Neta</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{metrics.utilidad}</p>
          </div>
        </Card>
      </div>

      {/* Sección Libro Diario */}
      <Card className="rounded-3xl shadow-sm border border-slate-100 overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 p-6 sm:p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" /> Movimientos del Libro Diario
          </CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por concepto o cuenta..." 
              className="bg-white border-slate-200 text-slate-900 pl-9 h-11 rounded-xl focus:ring-orange-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Fecha</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Concepto / Descripción</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Cuenta</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">Tipo</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAsientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs">
                    No se han registrado asientos contables aún.
                  </TableCell>
                </TableRow>
              ) : filteredAsientos.map((asiento) => (
                asiento.movimientos?.map((mov, idx) => (
                  <TableRow 
                    key={`${asiento.id}-${idx}`} 
                    className={cn(
                      "border-b border-slate-50 transition-colors hover:bg-slate-50/50",
                      idx === 0 && "border-t-2 border-t-slate-100"
                    )}
                  >
                    <TableCell className="p-5">
                      {idx === 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700">
                            {asiento.fecha ? format(asiento.fecha.toDate ? asiento.fecha.toDate() : new Date(asiento.fecha), 'dd MMM yy', { locale: es }).toUpperCase() : 'N/A'}
                          </span>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="p-5">
                      {idx === 0 ? (
                        <div className="flex flex-col max-w-[300px]">
                          <span className="text-xs font-bold text-slate-800 uppercase truncate">{asiento.concepto}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">ID: {asiento.sourceId?.substring(0, 8)}...</span>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-orange-600 tracking-widest">{mov.cuentaCodigo}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[200px]">{mov.cuentaNombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5 text-center">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                        mov.tipo === 'debito' 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-5 text-right">
                      <span className={cn(
                        "text-sm font-black",
                        mov.tipo === 'debito' ? "text-slate-900" : "text-slate-500"
                      )}>
                        {currencyFormatter.format(Number(mov.valor) || 0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <footer className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">J&J Accounting Ledger Protocol — Verified for FY2026</p>
      </footer>
    </div>
  );
}
