'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, where, Timestamp, limit } from 'firebase/firestore';
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
  PieChart,
  CreditCard,
  Loader2,
  RefreshCcw,
  History,
  FileText,
  User,
  ArrowUpRight,
  TrendingDown,
  Scale,
  BarChart3,
  Lock,
  Calendar,
  AlertCircle,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { registrarAsiento, realizarCierreContable } from '@/lib/accounting-engine';
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
  
  // Estados para el formulario de cierre
  const [cierreMes, setCierreMes] = useState(new Date().getMonth().toString());
  const [cierreAnio, setCierreAnio] = useState(new Date().getFullYear().toString());

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Consultas
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

  // Lógica de filtrado por periodo de consulta (Live vs Histórico)
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

  // 1. Lógica del Libro Mayor
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

  // Lista de terceros únicos para el filtro
  const listaTerceros = useMemo(() => {
    const unique = new Map();
    mayorData.forEach(m => {
      if (!unique.has(m.terceroId)) {
        unique.set(m.terceroId, m.terceroNombre);
      }
    });
    return Array.from(unique.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [mayorData]);

  // 2. Lógica de Estados Financieros
  const reports = useMemo(() => {
    let activos = 0;
    let pasivos = 0;
    let patrimonioBase = 0;
    let ingresos = 0;
    let costos = 0;
    let gastos = 0;

    asientosFiltradosPorPeriodo.forEach(asiento => {
      asiento.movimientos?.forEach(mov => {
        const codigo = mov.cuentaCodigo || '';
        const valor = Number(mov.valor) || 0;
        const tipo = mov.tipo;

        if (codigo.startsWith('1')) activos += tipo === 'debito' ? valor : -valor;
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
      balance: { activos, pasivos, patrimonioBase, utilidadNeta, patrimonioTotal },
      estadoResultados: { ingresos, costos, gastos, utilidadNeta }
    };
  }, [asientosFiltradosPorPeriodo]);

  // Filtrado de tablas
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
    const mesNum = parseInt(cierreMes);
    const anioNum = parseInt(cierreAnio);
    
    if (!confirm(`¿Deseas ejecutar el CIERRE FISCAL del periodo ${MESES[mesNum]} ${anioNum}? Esta acción bloqueará cualquier alteración de datos de este mes en adelante.`)) return;
    
    setIsClosing(true);
    try {
      await realizarCierreContable(db, mesNum, anioNum, user?.email || 'admin');
      toast({ title: "Cierre Fiscal Exitoso", description: `El periodo ${MESES[mesNum]} ${anioNum} ha sido clausurado.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al cerrar", description: e.message });
    } finally {
      setIsClosing(false);
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

  return (
    <div className="space-y-8 pb-12 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Contabilidad Central</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión de partida doble y estados financieros consolidados.</p>
        </div>

        {activeTab === 'estados' && (
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm">
             <span className="text-[10px] font-black uppercase text-slate-400 px-2">Consultar:</span>
             <Select value={consultedPeriod} onValueChange={setConsultedPeriod}>
                <SelectTrigger className="w-[200px] h-9 border-none font-bold text-xs uppercase focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live" className="text-xs font-black text-orange-600">PERIODO ACTUAL (EN VIVO)</SelectItem>
                  {cierres.map(c => (
                    <SelectItem key={c.id} value={c.id || ''} className="text-xs font-bold uppercase">
                      CIERRE: {MESES[c.mes]} {c.anio}
                    </SelectItem>
                  ))}
                </SelectContent>
             </Select>
          </div>
        )}
      </header>

      {/* KPI Cards */}
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
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><CreditCard className="h-5 w-5 text-white" /></div>
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
                      <SelectItem value="todos" className="text-xs font-black">TODOS LOS TERCEROS</SelectItem>
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
                  <Input 
                    placeholder="Buscar..."
                    className="bg-slate-50 border-slate-200 text-slate-900 pl-9 h-11 rounded-xl focus:ring-orange-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
          </div>
        </div>

        <Card className="rounded-3xl shadow-sm border border-slate-100 overflow-hidden bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="diario" className="m-0 border-none">
              <div className="overflow-x-auto">
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
                      <TableRow><TableCell colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase text-xs opacity-40">No hay movimientos en este periodo</TableCell></TableRow>
                    ) : filteredDiario.map((asiento) => asiento.movimientos?.map((mov, idx) => {
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
                    }))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="mayor" className="m-0 border-none">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Cuenta</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest">Tercero / Responsable</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Débitos</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Créditos</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Saldo Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMayor.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs opacity-40">No se encontraron saldos por tercero</TableCell></TableRow>
                    ) : filteredMayor.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/30 border-b border-slate-50">
                        <TableCell className="p-5">
                          <div className="flex flex-col"><span className="text-xs font-black text-slate-900">{item.cuentaCodigo}</span><span className="text-[10px] font-bold text-slate-400 uppercase">{item.cuentaNombre}</span></div>
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex flex-col"><span className="text-xs font-black text-slate-800 uppercase">{item.terceroNombre}</span><span className="text-[10px] font-bold text-slate-400">{item.terceroId}</span></div>
                        </TableCell>
                        <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.debitos)}</TableCell>
                        <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.creditos)}</TableCell>
                        <TableCell className="p-5 text-right">
                          <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm", item.saldo > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                            {currencyFormatter.format(item.saldo)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="estados" className="m-0 border-none p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Balance General */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <Scale className="h-5 w-5 text-orange-500" />
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Balance General</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                      <span className="text-xs font-black uppercase text-slate-500">Activos (1)</span>
                      <span className="text-sm font-black text-slate-900">{currencyFormatter.format(reports.balance.activos)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-xs font-black uppercase text-slate-400">Pasivos (2)</span>
                      <span className="text-sm font-black text-rose-600">{currencyFormatter.format(reports.balance.pasivos)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-xs font-black uppercase text-slate-400">Patrimonio Neto (3)</span>
                      <span className="text-sm font-black text-slate-700">{currencyFormatter.format(reports.balance.patrimonioBase)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <span className="text-xs font-black uppercase text-orange-600 italic">Utilidad del Ejercicio</span>
                      <span className="text-sm font-black text-orange-600">{currencyFormatter.format(reports.balance.utilidadNeta)}</span>
                    </div>
                    <div className="pt-6 border-t-2 border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-black uppercase text-slate-900">Total Pasivo + Patrimonio</span>
                      <span className="text-lg font-black text-slate-900 border-b-4 border-orange-500 pb-1">{currencyFormatter.format(reports.balance.patrimonioTotal + reports.balance.pasivos)}</span>
                    </div>
                  </div>
                  
                  {/* Gestión de Cierre */}
                  <div className="mt-12 bg-slate-50 rounded-3xl p-6 border border-dashed border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-5 w-5 text-slate-400" />
                        <h4 className="text-xs font-black uppercase text-slate-500">Ejecutar Cierre Fiscal</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-6 font-bold uppercase tracking-tight">
                        Seleccione el periodo que desea clausurar. Esta acción es irreversible y garantiza la inmutabilidad de los datos.
                    </p>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                           <Select value={cierreMes} onValueChange={setCierreMes}>
                              <SelectTrigger className="flex-1 h-10 bg-white border-slate-200 font-bold text-[10px] uppercase">
                                <SelectValue placeholder="Mes" />
                              </SelectTrigger>
                              <SelectContent>
                                {MESES.map((m, i) => <SelectItem key={i} value={i.toString()} className="text-[10px] font-bold uppercase">{m}</SelectItem>)}
                              </SelectContent>
                           </Select>
                           <Select value={cierreAnio} onValueChange={setCierreAnio}>
                              <SelectTrigger className="flex-1 h-10 bg-white border-slate-200 font-bold text-[10px] uppercase">
                                <SelectValue placeholder="Año" />
                              </SelectTrigger>
                              <SelectContent>
                                {ANIOS.map(a => <SelectItem key={a} value={a} className="text-[10px] font-bold uppercase">{a}</SelectItem>)}
                              </SelectContent>
                           </Select>
                        </div>
                        <Button 
                            onClick={handleCierre} 
                            disabled={isClosing || consultedPeriod !== 'live'}
                            className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase h-11 px-6 rounded-xl w-full shadow-lg shadow-slate-200 transition-all"
                        >
                            {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-3.5 w-3.5" />}
                            {consultedPeriod !== 'live' ? 'VISTA HISTÓRICA (BLOQUEADO)' : 'Ejecutar Cierre Fiscal'}
                        </Button>
                    </div>
                  </div>
                </div>

                {/* P&G */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Estado de Resultados</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border-b border-slate-50">
                      <span className="text-xs font-black uppercase text-slate-500">Ingresos Operacionales (4)</span>
                      <span className="text-sm font-black text-emerald-600">{currencyFormatter.format(reports.estadoResultados.ingresos)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border-b border-slate-50">
                      <span className="text-xs font-black uppercase text-slate-400">(-) Costos de Operación (6)</span>
                      <span className="text-sm font-bold text-slate-600">{currencyFormatter.format(reports.estadoResultados.costos)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border-b border-slate-50">
                      <span className="text-xs font-black uppercase text-slate-400">(-) Gastos Administrativos (5)</span>
                      <span className="text-sm font-bold text-slate-600">{currencyFormatter.format(reports.estadoResultados.gastos)}</span>
                    </div>
                    <div className="pt-6 mt-4 flex justify-between items-center bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Resultado Neto</span>
                        <span className="text-lg font-black tracking-tight">Utilidad Real</span>
                      </div>
                      <span className="text-2xl font-black text-orange-500">{currencyFormatter.format(reports.estadoResultados.utilidadNeta)}</span>
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border">
                    <div className="flex items-center gap-2 mb-2">
                        <History className="h-4 w-4 text-slate-400" />
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Información de Auditoría</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                      {consultedPeriod === 'live' 
                        ? 'Estás consultando el periodo en vivo. Los datos pueden variar hasta que se ejecute el cierre oficial.' 
                        : `Estás visualizando un periodo histórico cerrado. Los datos son inmutables y corresponden al balance oficial de la fecha.`}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <footer className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo Contable J&J — Cierres Inmutables v3.5</p>
      </footer>
    </div>
  );
}
