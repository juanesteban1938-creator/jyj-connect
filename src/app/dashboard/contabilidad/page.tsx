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
  FileText, 
  Search, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  ShieldCheck,
  Building,
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
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 bg-slate-950 rounded-3xl">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <p className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Sincronizando Libro Diario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 space-y-8 rounded-3xl overflow-hidden border border-slate-900 shadow-2xl">
      {/* Header Corporativo */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Contabilidad Central</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Libro diario inmutable y balance de saldos bajo norma local.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-md">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocolo de Partida Doble Activo</span>
        </div>
      </header>

      {/* Tarjetas de Resumen (Premium Dark) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative group hover:border-orange-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building className="h-12 w-12 text-white" />
          </div>
          <CardContent className="p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Activos Totales (Caja/Bancos/Cxc)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-white">{metrics.activos}</h3>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative group hover:border-orange-500/30 transition-all">
          <CardContent className="p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Pasivos (Cuentas por Pagar)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-white">{metrics.pasivos}</h3>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-orange-500/20 border shadow-2xl shadow-orange-500/5 overflow-hidden relative group hover:border-orange-500/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-6">
            <p className="text-[10px] font-black text-orange-500/70 uppercase tracking-[0.2em] mb-2">Utilidad Neta del Ejercicio</p>
            <div className="flex items-baseline gap-2">
              <h3 className={cn("text-2xl font-black", metrics.isPositive ? "text-emerald-400" : "text-rose-400")}>
                {metrics.utilidad}
              </h3>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección Libro Diario */}
      <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" /> Movimientos del Libro Diario
          </CardTitle>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar por concepto o cuenta..." 
              className="bg-slate-950 border-slate-800 text-white pl-9 h-10 rounded-xl focus:ring-orange-500 placeholder:text-slate-600"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-slate-950/50">
              <TableRow className="border-b border-slate-800">
                <TableHead className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Fecha</TableHead>
                <TableHead className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Concepto / Descripción</TableHead>
                <TableHead className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Cuenta</TableHead>
                <TableHead className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-center">Tipo</TableHead>
                <TableHead className="p-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAsientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-20 text-center text-slate-600 font-bold uppercase text-xs">
                    No se han registrado asientos contables aún.
                  </TableCell>
                </TableRow>
              ) : filteredAsientos.map((asiento) => (
                asiento.movimientos?.map((mov, idx) => (
                  <TableRow 
                    key={`${asiento.id}-${idx}`} 
                    className={cn(
                      "border-b border-slate-800/50 transition-colors hover:bg-slate-800/20",
                      idx === 0 && "border-t-2 border-t-slate-800"
                    )}
                  >
                    <TableCell className="p-4">
                      {idx === 0 ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-300">
                            {asiento.fecha ? format(asiento.fecha.toDate ? asiento.fecha.toDate() : new Date(asiento.fecha), 'dd MMM yy', { locale: es }).toUpperCase() : 'N/A'}
                          </span>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="p-4">
                      {idx === 0 ? (
                        <div className="flex flex-col max-w-[300px]">
                          <span className="text-xs font-bold text-white uppercase truncate">{asiento.concepto}</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mt-0.5">ID: {asiento.sourceId?.substring(0, 8)}...</span>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-orange-400/80 tracking-widest">{mov.cuentaCodigo}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[200px]">{mov.cuentaNombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                        mov.tipo === 'debito' 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      )}>
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <span className={cn(
                        "text-sm font-black",
                        mov.tipo === 'debito' ? "text-white" : "text-slate-400"
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
      
      {/* Footer Footer Info */}
      <footer className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">J&J Accounting Ledger Protocol — Verified for FY2026</p>
      </footer>
    </div>
  );
}
