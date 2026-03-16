'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, LineChart as LineChartIcon, CreditCard, Search, Trash2, Loader2, Calendar } from 'lucide-react';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { RentabilidadForms } from '@/components/dashboard/rentabilidad/rentabilidad-forms';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Transaccion } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const MESES = [
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

export default function RentabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  
  // Inicializamos el año en 2026 como mínimo permitido
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return currentYear < 2026 ? '2026' : currentYear.toString();
  });
  
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  // Consultas sincronizadas con la nube
  const transaccionesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'transacciones'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const vehiculosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'vehiculos'));
  }, [db, user]);

  const { data: transaccionesRaw, isLoading: isTransLoading } = useCollection(transaccionesQuery);
  const { data: vehiculosRaw } = useCollection(vehiculosQuery);

  const transacciones = transaccionesRaw || [];
  const vehiculos = vehiculosRaw || [];

  // Filtrado por Periodo (Mes y Año)
  const periodTransacciones = useMemo(() => {
    return transacciones.filter(t => {
      const date = parseISO(t.fecha);
      return getMonth(date).toString() === selectedMonth && getYear(date).toString() === selectedYear;
    });
  }, [transacciones, selectedMonth, selectedYear]);

  // Métricas exclusivas del periodo seleccionado
  const metrics = useMemo(() => {
    const ingresos = periodTransacciones.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    const gastos = periodTransacciones.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    return { ingresos, gastos, utilidad: ingresos - gastos };
  }, [periodTransacciones]);

  const handleSave = (transaccionData: Omit<Transaccion, 'id'>) => {
    setIsSaving(true);
    const colRef = collection(db, 'transacciones');
    
    // Escritura no bloqueante
    addDoc(colRef, transaccionData)
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: transaccionData
        }));
        toast({ variant: "destructive", title: "Error al registrar transacción" });
      });
    
    toast({ title: "Transacción Registrada" });
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Desea eliminar este registro contable?')) return;
    const docRef = doc(db, 'transacciones', id);
    
    // Eliminación no bloqueante
    deleteDoc(docRef)
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
        toast({ variant: "destructive", title: "No se pudo eliminar el registro" });
      });
    
    toast({ title: "Registro eliminado" });
  };

  const filteredTransacciones = periodTransacciones.filter(t => 
    t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const years = useMemo(() => {
    const startYear = 2026; // Rango actualizado: 2026 en adelante
    const endYear = 2036;
    const yearsArray = [];
    for (let y = startYear; y <= endYear; y++) {
      yearsArray.push(y.toString());
    }
    return yearsArray;
  }, []);

  return (
    <div className="page-container">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de P&G</h1>
          <p className="page-subtitle mb-0 mt-1">Administración financiera por periodos mensuales.</p>
        </div>
        
        <Card className="border-none shadow-sm bg-white p-1 rounded-xl flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 text-primary">
            <Calendar className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Periodo:</span>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] h-9 border-none font-bold text-xs uppercase focus:ring-0">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map(m => <SelectItem key={m.value} value={m.value} className="text-xs uppercase font-bold">{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 border-none font-bold text-xs focus:ring-0">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>
      </header>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase opacity-80 tracking-widest">Ingresos Periodo</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><DollarSign className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.ingresos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-6 bg-gradient-to-br from-rose-600 to-rose-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase opacity-80 tracking-widest">Gastos Periodo</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><LineChartIcon className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.gastos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-6 bg-gradient-to-br from-orange-600 to-orange-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase opacity-80 tracking-widest">Utilidad Neta</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><CreditCard className="h-5 w-5 text-white" /></div>
            </div>
            <p className="text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.utilidad)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-4">
          <RentabilidadForms 
            vehiculos={vehiculos} 
            onSave={handleSave} 
          />
        </div>
        <Card className="lg:col-span-8 rounded-2xl shadow-sm border-none overflow-hidden bg-white relative">
          {isTransLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          )}
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold uppercase tracking-tight">Histórico de Transacciones</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar descripción o placa..." 
                  className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-xs" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Fecha</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Tipo</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Descripción</TableHead>
                  <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-right">Valor</TableHead>
                  <TableHead className="w-[50px] p-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransacciones.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <TableCell className="p-5 text-xs font-bold text-slate-600">{format(parseISO(t.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="p-5">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${t.tipo === 'Ingreso' ? 'text-green-600 bg-green-50 border-green-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                        {t.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{t.descripcion}</span>
                        {t.vehiculoPlaca && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge className="bg-slate-900 text-white text-[8px] font-black tracking-widest px-1.5 h-4">
                              {t.vehiculoPlaca.toUpperCase()}
                            </Badge>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{t.categoria}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={`p-5 text-sm text-right font-black ${t.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.tipo === 'Ingreso' ? '+' : '-'}{currencyFormatter.format(t.valor)}
                    </TableCell>
                    <TableCell className="p-5 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransacciones.length === 0 && !isTransLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <LineChartIcon className="h-12 w-12" />
                        <p className="font-black uppercase text-xs">Sin movimientos en este periodo</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
