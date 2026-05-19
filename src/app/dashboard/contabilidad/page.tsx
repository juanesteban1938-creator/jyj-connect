
'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  DollarSign,
  Loader2,
  FileText,
  User,
  TrendingDown,
  Scale,
  BarChart3,
  Lock,
  AlertCircle,
  Filter,
  History,
  ArrowUpRight,
  PlusCircle,
  Calculator
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { realizarCierreContable, crearAsientoApertura } from '@/lib/accounting-engine';
import { GastoAdminForm } from '@/components/dashboard/contabilidad/gasto-admin-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AsientoContable, CierreFiscal } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIOS = ["2025", "2026", "2027", "2028"];

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState('diario');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTercero, setSelectedTercero] = useState('todos');
  const [consultedPeriod, setConsultedPeriod] = useState('live');
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isGastoOpen, setIsGastoOpen] = useState(false);
  
  const [cierreMes, setCierreMes] = useState(new Date().getMonth().toString());
  const [cierreAnio, setCierreAnio] = useState(new Date().getFullYear().toString());

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const asientosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'asientos_contables'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const cierresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'cierres_fiscales'), orderBy('fechaCierre', 'desc'));
  }, [db, user]);

  const { data: asientosRaw, isLoading } = useCollection<AsientoContable>(asientosQuery);
  const { data: cierresRaw } = useCollection<CierreFiscal>(cierresQuery);
  
  const asientos = asientosRaw || [];
  const cierres = cierresRaw || [];

  const asientosFiltradosPorPeriodo = useMemo(() => {
    if (consultedPeriod === 'live') return asientos;
    const closure = cierres.find(c => c.id === consultedPeriod);
    if (!closure) return asientos;
    const limitDate = closure.fechaCierre instanceof Timestamp ? closure.fechaCierre.toDate() : new Date(closure.fechaCierre);
    return asientos.filter(a => {
      const entryDate = a.fecha instanceof Timestamp ? a.fecha.toDate() : new Date(a.fecha);
      return entryDate <= limitDate;
    });
  }, [asientos, consultedPeriod, cierres]);

  const mayorData = useMemo(() => {
    const map: Record<string, {
      cuentaCodigo: string;
      cuentaNombre: string;
      terceroId: string;
      terceroNombre: string;
      debitos: number;
      creditos: number;
    }> = {};

    asientosFiltradosPorPeriodo.forEach(asiento => {
      asiento.movimientos?.forEach(mov => {
        const key = `${mov.cuentaCodigo}-${mov.terceroId}`;
        if (!map[key]) {
          map[key] = {
            cuentaCodigo: mov.cuentaCodigo,
            cuentaNombre: mov.cuentaNombre,
            terceroId: mov.terceroId,
            terceroNombre: mov.terceroNombre,
            debitos: 0,
            creditos: 0
          };
        }
        if (mov.tipo === 'debito') map[key].debitos += Number(mov.valor) || 0;
        else map[key].creditos += Number(mov.valor) || 0;
      });
    });

    return Object.values(map).map(item => {
      const primerDigito = item.cuentaCodigo[0];
      let saldo = 0;
      if (['1', '5', '6'].includes(primerDigito)) {
        saldo = item.debitos - item.creditos;
      } else {
        saldo = item.creditos - item.debitos;
      }
      return { ...item, saldo };
    }).sort((a, b) => a.cuentaCodigo.localeCompare(b.cuentaCodigo));
  }, [asientosFiltradosPorPeriodo]);

  const listaTerceros = useMemo(() => {
    const unique = new Map();
    mayorData.forEach(m => {
      if (!unique.has(m.terceroId)) {
        unique.set(m.terceroId, m.terceroNombre);
      }
    });
    return Array.from(unique.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [mayorData]);

  const reports = useMemo(() => {
    let activos = 0;
    let pasivos = 0;
    let patrimonioBase = 0;
    let ingresos = 0;
    let costos = 0;
    let gastos = 0;

    let subCajaBancos = 0;
    let subCartera = 0;
    let subRetenciones = 0;

    asientosFiltradosPorPeriodo.forEach(asiento => {
      asiento.movimientos?.forEach(mov => {
        const codigo = mov.cuentaCodigo || '';
        const valor = Number(mov.valor) || 0;
        const tipo = mov.tipo;

        if (codigo.startsWith('1')) {
            const neto = tipo === 'debito' ? valor : -valor;
            activos += neto;
            if (codigo.startsWith('11')) subCajaBancos += neto;
            else if (codigo === '1305') subCartera += neto;
            else if (codigo.startsWith('1355')) subRetenciones += neto;
        }
        else if (codigo.startsWith('2')) pasivos += tipo === 'credito' ? valor : -valor;
        else if (codigo.startsWith('3')) patrimonioBase += tipo === 'credito' ? valor : -valor;
        else if (codigo.startsWith('4')) ingresos += tipo === 'credito' ? valor : -valor;
        else if (codigo.startsWith('5')) gastos += tipo === 'debito' ? valor : -valor;
        else if (codigo.startsWith('6')) costos += tipo === 'debito' ? valor : -valor;
      });
    });

    const utilidadNeta = ingresos - costos - gastos;
    const patrimonioTotal = patrimonioBase + utilidadNeta;

    return {
      balance: { activos, pasivos, patrimonioBase, utilidadNeta, patrimonioTotal, subCajaBancos, subCartera, subRetenciones },
      estadoResultados: { ingresos, costos, gastos, utilidadNeta }
    };
  }, [asientosFiltradosPorPeriodo]);

  const filteredDiario = useMemo(() => {
    return asientosFiltradosPorPeriodo.filter(a => 
      (a.concepto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.movimientos?.some(m => (m.terceroNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.cuentaCodigo || '').includes(searchTerm))
    );
  }, [asientosFiltradosPorPeriodo, searchTerm]);

  const filteredMayor = useMemo(() => {
    return mayorData.filter(m => {
      const matchesSearch = (m.terceroNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.cuentaCodigo || '').includes(searchTerm);
      const matchesTercero = selectedTercero === 'todos' || m.terceroId === selectedTercero;
      return matchesSearch && matchesTercero;
    });
  }, [mayorData, searchTerm, selectedTercero]);

  const handleCierre = async () => {
    if (!confirm(`¿Deseas ejecutar el CIERRE FISCAL?`)) return;
    setIsClosing(true);
    try {
      await realizarCierreContable(db, parseInt(cierreMes), parseInt(cierreAnio), user?.email || 'admin');
      toast({ title: "Cierre Fiscal Exitoso" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al cerrar", description: e.message });
    } finally {
      setIsClosing(false);
    }
  };

  const handleApertura = async () => {
    if (!confirm('¿Deseas registrar el Asiento de Apertura por $80.000.000 COP?')) return;
    setIsOpening(true);
    try {
        await crearAsientoApertura(db);
        toast({ title: "Capital Inicial Registrado" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setIsOpening(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Cargando Sistema Contable...</p>
      </div>
    );
  }

  const hasOpening = asientos.some(a => a.concepto === 'Asiento de Apertura - Capital Inicial');

  return (
    <div className="space-y-8 pb-12 bg-[#F8FAFC] min-h-screen">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Contabilidad Central</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">ERP de gestión de partida doble y estados financieros.</p>
        </div>

        <div className="flex items-center gap-2">
            <Button 
                onClick={() => setIsGastoOpen(true)}
                className="bg-slate-900 text-white font-black text-[10px] uppercase h-11 px-6 rounded-xl shadow-lg"
            >
                <PlusCircle className="h-4 w-4 mr-2" /> Registrar Gasto Admin
            </Button>
            {activeTab === 'estados' && (
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm h-11">
                 <span className="text-[10px] font-black uppercase text-slate-400 px-2">Ver Periodo:</span>
                 <Select value={consultedPeriod} onValueChange={setConsultedPeriod}>
                    <SelectTrigger className="w-[200px] border-none font-bold text-xs uppercase focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live" className="text-xs font-black text-orange-600">EN VIVO</SelectItem>
                      {cierres.map(c => (
                        <SelectItem key={c.id} value={c.id || ''} className="text-xs font-bold uppercase">
                          {MESES[c.mes]} {c.anio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
              </div>
            )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden hover:shadow-md transition-all">
          <div className="p-6 bg-emerald-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Activos Totales</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><DollarSign className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(reports.balance.activos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden hover:shadow-md transition-all">
          <div className="p-6 bg-rose-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Pasivos (CxP)</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><TrendingDown className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(reports.balance.pasivos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden hover:shadow-md transition-all">
          <div className="p-6 bg-orange-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Utilidad Neta</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><Scale className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(reports.estadoResultados.utilidadNeta)}</p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-11 w-full lg:w-auto">
              <TabsTrigger value="diario" className="flex-1 lg:flex-none rounded-lg px-6 font-black uppercase text-[9px] sm:text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none">
                <FileText className="h-3 w-3 mr-2" /> Diario
              </TabsTrigger>
              <TabsTrigger value="mayor" className="flex-1 lg:flex-none rounded-lg px-6 font-black uppercase text-[9px] sm:text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none">
                <User className="h-3 w-3 mr-2" /> Libro Mayor
              </TabsTrigger>
              <TabsTrigger value="estados" className="flex-1 lg:flex-none rounded-lg px-6 font-black uppercase text-[9px] sm:text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-orange-600 shadow-none">
                <BarChart3 className="h-3 w-3 mr-2" /> Estados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full lg:w-auto">
              {activeTab === 'mayor' && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 rounded-xl border border-slate-200 h-11">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <Select value={selectedTercero} onValueChange={setSelectedTercero}>
                    <SelectTrigger className="w-[180px] border-none bg-transparent font-bold text-xs uppercase focus:ring-0">
                      <SelectValue placeholder="Filtrar Tercero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs font-black">TODOS</SelectItem>
                      {listaTerceros.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTab !== 'estados' && (
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Buscar..." className="bg-slate-50 border-slate-200 pl-9 h-11 rounded-xl focus:ring-orange-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              )}
          </div>
        </div>

        <Card className="rounded-3xl shadow-sm border border-slate-100 overflow-hidden bg-white">
            <TabsContent value="diario" className="m-0 border-none">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Fecha</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Concepto</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Cuenta</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Tercero</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">Tipo</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiario.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase text-xs opacity-40">No hay movimientos</TableCell></TableRow>
                  ) : filteredDiario.map((asiento) => (
                    <React.Fragment key={asiento.id || `asiento-${asiento.fecha}-${asiento.sourceId}`}>
                      {asiento.movimientos?.map((mov, idx) => {
                        const dateObj = asiento.fecha instanceof Timestamp ? asiento.fecha.toDate() : new Date(asiento.fecha);
                        return (
                          <TableRow key={`${asiento.id}-${idx}`} className={cn("border-b border-slate-50", idx === 0 && "bg-slate-50/30")}>
                            <TableCell className="p-5">{idx === 0 ? <span className="text-xs font-black text-slate-700">{format(dateObj, 'dd MMM yy', { locale: es }).toUpperCase()}</span> : null}</TableCell>
                            <TableCell className="p-5">{idx === 0 ? <span className="text-xs font-bold text-slate-800 uppercase truncate block max-w-[200px]">{asiento.concepto}</span> : null}</TableCell>
                            <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-black text-orange-600">{mov.cuentaCodigo}</span><span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{mov.cuentaNombre}</span></div></TableCell>
                            <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-bold text-slate-800 uppercase">{mov.terceroNombre}</span><span className="text-[9px] font-black text-slate-400">{mov.terceroId}</span></div></TableCell>
                            <TableCell className="p-5 text-center"><Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5", mov.tipo === 'debito' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>{mov.tipo}</Badge></TableCell>
                            <TableCell className="p-5 text-right font-black text-slate-900">{currencyFormatter.format(mov.valor)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="mayor" className="m-0 border-none">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Cuenta</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Tercero</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Débitos</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Créditos</TableHead>
                    <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Saldo Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMayor.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs opacity-40">Sin registros</TableCell></TableRow>
                  ) : filteredMayor.map((item, idx) => (
                    <TableRow key={`${item.cuentaCodigo}-${item.terceroId}-${idx}`} className="hover:bg-slate-50/30 border-b border-slate-50">
                      <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-black text-slate-900">{item.cuentaCodigo}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{item.cuentaNombre}</span></div></TableCell>
                      <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-black text-slate-800 uppercase">{item.terceroNombre}</span><span className="text-[10px] font-bold text-slate-400">{item.terceroId}</span></div></TableCell>
                      <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.debitos)}</TableCell>
                      <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.creditos)}</TableCell>
                      <TableCell className="p-5 text-right"><div className={cn("inline-flex items-center px-3 py-1.5 rounded-xl font-black text-sm", item.saldo >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{currencyFormatter.format(item.saldo)}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="estados" className="m-0 border-none p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Scale className="h-5 w-5 text-orange-500" />
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Balance General</h2>
                    </div>
                    {!hasOpening && consultedPeriod === 'live' && (
                        <Button onClick={handleApertura} disabled={isOpening} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase h-8 px-4 rounded-lg">
                            {isOpening ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <Calculator className="h-3 w-3 mr-2"/>}
                            Establecer Saldo Inicial
                        </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                            <span className="text-xs font-black uppercase text-slate-500">Activos Totales (1)</span>
                            <span className="text-sm font-black text-slate-900">{currencyFormatter.format(reports.balance.activos)}</span>
                        </div>
                        <div className="pl-6 space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                <span>Caja y Bancos (11)</span>
                                <span>{currencyFormatter.format(reports.balance.subCajaBancos)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                <span>Cartera Clientes (1305)</span>
                                <span>{currencyFormatter.format(reports.balance.subCartera)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                <span>Retenciones a favor (1355)</span>
                                <span>{currencyFormatter.format(reports.balance.subRetenciones)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-xs font-black uppercase text-slate-400">Pasivos Totales (2)</span>
                      <span className="text-sm font-black text-rose-600">{currencyFormatter.format(reports.balance.pasivos)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-xs font-black uppercase text-slate-400">Patrimonio Social (3)</span>
                      <span className="text-sm font-black text-slate-700">{currencyFormatter.format(reports.balance.patrimonioBase)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <span className="text-xs font-black uppercase text-orange-600 italic">Resultado del Ejercicio</span>
                      <span className="text-sm font-black text-orange-600">{currencyFormatter.format(reports.balance.utilidadNeta)}</span>
                    </div>
                    <div className="pt-6 border-t-2 border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-black uppercase text-slate-900">Total Pasivo + Patrimonio</span>
                      <span className="text-lg font-black text-slate-900 border-b-4 border-orange-500 pb-1">{currencyFormatter.format(reports.balance.patrimonioTotal + reports.balance.pasivos)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-12 bg-slate-50 rounded-3xl p-6 border border-dashed border-slate-200">
                    <div className="flex items-center gap-3 mb-4"><AlertCircle className="h-5 w-5 text-slate-400" /><h4 className="text-xs font-black uppercase text-slate-500">Ejecutar Cierre Fiscal</h4></div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-6 font-bold uppercase tracking-tight">Clausura irreversible de periodo.</p>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                           <Select value={cierreMes} onValueChange={setCierreMes}><SelectTrigger className="flex-1 h-10 bg-white border-slate-200 font-bold text-[10px] uppercase"><SelectValue placeholder="Mes" /></SelectTrigger><SelectContent>{MESES.map((m, i) => <SelectItem key={`mes-${i}`} value={i.toString()} className="text-[10px] font-bold uppercase">{m}</SelectItem>)}</SelectContent></Select>
                           <Select value={cierreAnio} onValueChange={setCierreAnio}><SelectTrigger className="flex-1 h-10 bg-white border-slate-200 font-bold text-[10px] uppercase"><SelectValue placeholder="Año" /></SelectTrigger><SelectContent>{ANIOS.map(a => <SelectItem key={`anio-${a}`} value={a} className="text-[10px] font-bold uppercase">{a}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <Button onClick={handleCierre} disabled={isClosing || consultedPeriod !== 'live'} className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase h-11 px-6 rounded-xl w-full shadow-lg shadow-slate-200 transition-all">{isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-3.5 w-3.5" />}{consultedPeriod !== 'live' ? 'VISTA HISTÓRICA' : 'Ejecutar Cierre Fiscal'}</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4"><BarChart3 className="h-5 w-5 text-orange-500" /><h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Estado de Resultados</h2></div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border-b border-slate-50"><span className="text-xs font-black uppercase text-slate-500">Ingresos Operacionales (4)</span><span className="text-sm font-black text-emerald-600">{currencyFormatter.format(reports.estadoResultados.ingresos)}</span></div>
                    <div className="flex justify-between items-center p-3 border-b border-slate-50"><span className="text-xs font-black uppercase text-slate-400">(-) Costos de Operación (6)</span><span className="text-sm font-bold text-slate-600">{currencyFormatter.format(reports.estadoResultados.costos)}</span></div>
                    <div className="flex justify-between items-center p-3 border-b border-slate-50"><span className="text-xs font-black uppercase text-slate-400">(-) Gastos Administrativos (5)</span><span className="text-sm font-bold text-slate-600">{currencyFormatter.format(reports.estadoResultados.gastos)}</span></div>
                    <div className="pt-6 mt-4 flex justify-between items-center bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                      <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Resultado Neto</span><span className="text-lg font-black tracking-tight">Utilidad Real</span></div>
                      <span className="text-2xl font-black text-orange-500">{currencyFormatter.format(reports.estadoResultados.utilidadNeta)}</span>
                    </div>
                  </div>
                  <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border"><div className="flex items-center gap-2 mb-2"><History className="h-4 w-4 text-slate-400" /><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Información de Auditoría</span></div><p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">{consultedPeriod === 'live' ? 'Datos dinámicos en tiempo real.' : `Datos inmutables periodo cerrado.`}</p></div>
                </div>
              </div>
            </TabsContent>
        </Card>
      </div>

      <Dialog open={isGastoOpen} onOpenChange={setIsGastoOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50">
                <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-orange-500" /> Registrar Gasto Administrativo
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-1">Afecta cuenta 5105 y genera micro-asiento GMF.</DialogDescription>
            </div>
            <div className="p-6">
                <GastoAdminForm onDone={() => setIsGastoOpen(false)} />
            </div>
        </DialogContent>
      </Dialog>

      <footer className="text-center pt-8"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">ERP Contable J&J — Cierres Inmutables v4.0</p></footer>
    </div>
  );
}
