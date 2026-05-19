'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
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
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generarAsientoServicio, generarAsientoRecaudo } from '@/lib/accounting-engine';
import type { AsientoContable } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState('diario');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Suscripción al Libro Diario
  const asientosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'asientos_contables'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const { data: asientosRaw, isLoading } = useCollection<AsientoContable>(asientosQuery);
  const asientos = asientosRaw || [];

  // 1. Lógica del Libro Mayor (Agrupación por Tercero y Cuenta)
  const mayorData = useMemo(() => {
    const map: Record<string, {
      cuentaCodigo: string;
      cuentaNombre: string;
      terceroId: string;
      terceroNombre: string;
      debitos: number;
      creditos: number;
    }> = {};

    asientos.forEach(asiento => {
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
  }, [asientos]);

  // 2. Lógica de Estados Financieros (P&G y Balance)
  const reports = useMemo(() => {
    let activos = 0;
    let pasivos = 0;
    let patrimonioBase = 0;
    let ingresos = 0;
    let costos = 0;
    let gastos = 0;

    asientos.forEach(asiento => {
      asiento.movimientos?.forEach(mov => {
        const codigo = mov.cuentaCodigo || '';
        const valor = Number(mov.valor) || 0;
        const tipo = mov.tipo;

        if (codigo.startsWith('1')) {
          activos += tipo === 'debito' ? valor : -valor;
        } else if (codigo.startsWith('2')) {
          pasivos += tipo === 'credito' ? valor : -valor;
        } else if (codigo.startsWith('3')) {
          patrimonioBase += tipo === 'credito' ? valor : -valor;
        } else if (codigo.startsWith('4')) {
          ingresos += tipo === 'credito' ? valor : -valor;
        } else if (codigo.startsWith('5')) {
          gastos += tipo === 'debito' ? valor : -valor;
        } else if (codigo.startsWith('6')) {
          costos += tipo === 'debito' ? valor : -valor;
        }
      });
    });

    const utilidadNeta = ingresos - costos - gastos;
    const patrimonioTotal = patrimonioBase + utilidadNeta;

    return {
      balance: { activos, pasivos, patrimonioBase, utilidadNeta, patrimonioTotal },
      estadoResultados: { ingresos, costos, gastos, utilidadNeta }
    };
  }, [asientos]);

  // Filtrado de Datos
  const filteredDiario = useMemo(() => {
    return asientos.filter(a => 
      (a.concepto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.movimientos?.some(m => 
        (m.terceroNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.cuentaCodigo || '').includes(searchTerm)
      )
    );
  }, [asientos, searchTerm]);

  const filteredMayor = useMemo(() => {
    return mayorData.filter(m => 
      (m.terceroNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.terceroId || '').includes(searchTerm) ||
      (m.cuentaCodigo || '').includes(searchTerm)
    );
  }, [mayorData, searchTerm]);

  const handleMigrate = async () => {
    if (!confirm('¿Deseas sincronizar los servicios históricos con la contabilidad?')) return;
    setIsMigrating(true);
    let generados = 0;
    try {
      const servicesSnap = await getDocs(collection(db, 'services'));
      for (const serviceDoc of servicesSnap.docs) {
        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as any;
        const checkQuery = query(
          collection(db, 'asientos_contables'), 
          where('sourceId', '==', serviceData.id),
          where('sourceModule', '==', 'services')
        );
        const checkSnap = await getDocs(checkQuery);
        if (checkSnap.empty) {
          await generarAsientoServicio(db, serviceData);
          const saldo = Number(serviceData.saldo);
          if (serviceData.estadoPago === 'Pagado' || (serviceData.saldo !== undefined && saldo <= 0)) {
            const valorRecaudo = Number(serviceData.valorServicio) || 0;
            const metodo = serviceData.metodoPago || 'Transferencia';
            await generarAsientoRecaudo(db, serviceData, valorRecaudo, metodo);
          }
          generados++;
        }
      }
      toast({ title: "Migración Exitosa", description: `Se han sincronizado ${generados} servicios.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error en Migración", description: error.message });
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
        <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Sincronizando Libro Diario...</p>
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
        
        <Button 
          onClick={handleMigrate} 
          disabled={isMigrating}
          className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] uppercase tracking-wider px-6 h-12 rounded-xl shadow-lg shadow-orange-200 transition-all"
        >
          {isMigrating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> PROCESANDO...</>
          ) : (
            <><History className="mr-2 h-4 w-4" /> Ejecutar Migración Histórica</>
          )}
        </Button>
      </header>

      {/* KPI Cards (Resumen Superior) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm border-none overflow-hidden transition-all hover:shadow-md">
          <div className="p-6 bg-emerald-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Activos Totales</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><DollarSign className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(reports.balance.activos)}</p>
          </div>
        </Card>

        <Card className="rounded-2xl shadow-sm border-none overflow-hidden transition-all hover:shadow-md">
          <div className="p-6 bg-rose-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Pasivos (Cuentas por Pagar)</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><TrendingDown className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(reports.balance.pasivos)}</p>
          </div>
        </Card>

        <Card className="rounded-2xl shadow-sm border-none overflow-hidden transition-all hover:shadow-md">
          <div className="p-6 bg-orange-500 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase opacity-90 tracking-widest">Utilidad Neta del Ejercicio</span>
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

          {activeTab !== 'estados' && (
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={activeTab === 'diario' ? "Buscar concepto o cuenta..." : "Buscar por tercero o cuenta..."}
                className="bg-slate-50 border-slate-200 text-slate-900 pl-9 h-11 rounded-xl focus:ring-orange-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )}
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
                      <TableRow><TableCell colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase text-xs">No hay movimientos registrados.</TableCell></TableRow>
                    ) : filteredDiario.map((asiento) => (
                      asiento.movimientos?.map((mov, idx) => {
                        const dateObj = asiento.fecha instanceof Timestamp ? asiento.fecha.toDate() : new Date(asiento.fecha);
                        return (
                          <TableRow key={`${asiento.id}-${idx}`} className={cn("border-b border-slate-50 hover:bg-slate-50/30", idx === 0 && "border-t-2 border-t-slate-100")}>
                            <TableCell className="p-5">{idx === 0 ? <span className="text-xs font-black text-slate-700">{format(dateObj, 'dd MMM yy', { locale: es }).toUpperCase()}</span> : null}</TableCell>
                            <TableCell className="p-5">{idx === 0 ? <span className="text-xs font-bold text-slate-800 uppercase truncate block max-w-[250px]">{asiento.concepto}</span> : null}</TableCell>
                            <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-black text-orange-600">{mov.cuentaCodigo}</span><span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{mov.cuentaNombre}</span></div></TableCell>
                            <TableCell className="p-5"><div className="flex flex-col"><span className="text-xs font-bold text-slate-800 uppercase">{mov.terceroNombre}</span><span className="text-[9px] font-black text-slate-400">{mov.terceroId}</span></div></TableCell>
                            <TableCell className="p-5 text-center"><Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5", mov.tipo === 'debito' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100")}>{mov.tipo}</Badge></TableCell>
                            <TableCell className="p-5 text-right"><span className={cn("text-sm font-black", mov.tipo === 'debito' ? "text-slate-900" : "text-slate-500")}>{currencyFormatter.format(mov.valor)}</span></TableCell>
                          </TableRow>
                        );
                      })
                    ))}
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
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Suma Débitos</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Suma Créditos</TableHead>
                      <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Saldo Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMayor.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs">No se han generado saldos consolidados.</TableCell></TableRow>
                    ) : filteredMayor.map((item, idx) => (
                      <TableRow key={`${item.cuentaCodigo}-${item.terceroId}-${idx}`} className="hover:bg-slate-50/30 border-b border-slate-50">
                        <TableCell className="p-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{item.cuentaCodigo}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{item.cuentaNombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 uppercase">{item.terceroNombre}</span>
                            <span className="text-[10px] font-bold text-slate-400">{item.terceroId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.debitos)}</TableCell>
                        <TableCell className="p-5 text-right text-xs font-bold text-slate-600">{currencyFormatter.format(item.creditos)}</TableCell>
                        <TableCell className="p-5 text-right">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm",
                            item.saldo === 0 ? "bg-slate-50 text-slate-400" :
                            item.saldo > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {item.saldo > 0 ? <ArrowUpRight className="h-3 w-3" /> : item.saldo < 0 ? <TrendingDown className="h-3 w-3" /> : null}
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
                      <span className="text-xs font-black uppercase text-orange-600 italic">Utilidad del Ejercicio (Incluida)</span>
                      <span className="text-sm font-black text-orange-600">{currencyFormatter.format(reports.balance.utilidadNeta)}</span>
                    </div>
                    <div className="pt-6 border-t-2 border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-black uppercase text-slate-900">Total Pasivo + Patrimonio</span>
                      <span className="text-lg font-black text-slate-900 border-b-4 border-orange-500 pb-1">{currencyFormatter.format(reports.balance.patrimonioTotal + reports.balance.pasivos)}</span>
                    </div>
                  </div>
                </div>

                {/* Estado de Resultados */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Estado de Resultados (P&G)</h2>
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
                    <div className="pt-6 mt-4 flex justify-between items-center bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Utilidad Neta Real</span>
                        <span className="text-lg font-black tracking-tight">Resultado del Ejercicio</span>
                      </div>
                      <span className="text-2xl font-black text-orange-500">{currencyFormatter.format(reports.estadoResultados.utilidadNeta)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <footer className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
          <FileText className="h-3 w-3 text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo Contable J&J — Consolidación Estándar v3.0</p>
        </div>
      </footer>
    </div>
  );
}
