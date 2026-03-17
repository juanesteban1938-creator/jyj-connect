
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, LineChart as LineChartIcon, CreditCard, Search, Trash2, Loader2, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { RentabilidadForms } from '@/components/dashboard/rentabilidad/rentabilidad-forms';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Transaccion } from '@/lib/types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const currentYear = new Date().getFullYear();
    return currentYear < 2026 ? '2026' : currentYear.toString();
  });
  
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

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

  const periodTransacciones = useMemo(() => {
    return transacciones.filter(t => {
      const date = parseISO(t.fecha);
      return getMonth(date).toString() === selectedMonth && getYear(date).toString() === selectedYear;
    });
  }, [transacciones, selectedMonth, selectedYear]);

  const metrics = useMemo(() => {
    const ingresos = periodTransacciones.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    const gastos = periodTransacciones.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    return { ingresos, gastos, utilidad: ingresos - gastos };
  }, [periodTransacciones]);

  const handleSave = (transaccionData: Omit<Transaccion, 'id'>) => {
    setIsSaving(true);
    const colRef = collection(db, 'transacciones');
    
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

  const exportToExcel = () => {
    const rows = periodTransacciones.map(t => ({
      Fecha: format(parseISO(t.fecha), 'dd/MM/yyyy'),
      Tipo: t.tipo,
      Descripción: t.descripcion,
      Vehículo: t.vehiculoPlaca || 'N/A',
      Monto: t.valor
    }));

    // Agregar fila de totales
    rows.push({ Fecha: '', Tipo: '', Descripción: '', Vehículo: '', Monto: 0 }); // Espacio
    rows.push({ Fecha: 'TOTAL INGRESOS', Tipo: '', Descripción: '', Vehículo: '', Monto: metrics.ingresos });
    rows.push({ Fecha: 'TOTAL GASTOS', Tipo: '', Descripción: '', Vehículo: '', Monto: metrics.gastos });
    rows.push({ Fecha: 'GANANCIA NETA', Tipo: '', Descripción: '', Vehículo: '', Monto: metrics.utilidad });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rentabilidad");
    XLSX.writeFile(workbook, `Reporte_Rentabilidad_${MESES.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    doc.setFontSize(18);
    doc.text('Transportes Especiales J&J', 14, 20);
    doc.setFontSize(12);
    doc.text(`Reporte de Rentabilidad - ${MESES.find(m => m.value === selectedMonth)?.label} ${selectedYear}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Generado el: ${dateStr}`, 14, 38);

    const tableData = periodTransacciones.map(t => [
      format(parseISO(t.fecha), 'dd/MM/yyyy'),
      t.tipo,
      t.descripcion,
      t.vehiculoPlaca || 'N/A',
      currencyFormatter.format(t.valor)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Tipo', 'Descripción', 'Vehículo', 'Monto']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillStyle: 'fill', fillColor: [245, 158, 11] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setFont('helvetica', 'bold');
    doc.text(`Resumen Financiero Periodo:`, 14, finalY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Ingresos: ${currencyFormatter.format(metrics.ingresos)}`, 14, finalY + 25);
    doc.text(`Total Gastos: ${currencyFormatter.format(metrics.gastos)}`, 14, finalY + 32);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ganancia Neta: ${currencyFormatter.format(metrics.utilidad)}`, 14, finalY + 42);

    doc.save(`Rentabilidad_${selectedMonth}_${selectedYear}.pdf`);
  };

  const filteredTransacciones = periodTransacciones.filter(t => 
    t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const years = useMemo(() => {
    const startYear = 2026;
    const endYear = 2036;
    const yearsArray = [];
    for (let y = startYear; y <= endYear; y++) {
      yearsArray.push(y.toString());
    }
    return yearsArray;
  }, []);

  return (
    <div className="page-container px-4 py-4 sm:px-8 sm:py-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">Gestión de P&G</h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Administración financiera por periodos mensuales.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="h-9 font-bold text-[10px] uppercase border-slate-200 hover:bg-emerald-50">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="h-9 font-bold text-[10px] uppercase border-slate-200 hover:bg-rose-50">
              <FileText className="h-3.5 w-3.5 mr-2 text-rose-600" /> PDF
            </Button>
          </div>

          <Card className="border-none shadow-sm bg-white p-1 rounded-xl flex items-center gap-2 w-full sm:w-auto overflow-x-auto shrink-0">
            <div className="flex items-center gap-2 px-3 text-primary shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Periodo:</span>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-9 border-none font-bold text-xs uppercase focus:ring-0">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map(m => <SelectItem key={m.value} value={m.value} className="text-xs uppercase font-bold">{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[80px] sm:w-[100px] h-9 border-none font-bold text-xs focus:ring-0">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y} className="text-xs font-bold">{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Card>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Ingresos Periodo</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" /></div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.ingresos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-gradient-to-br from-rose-600 to-rose-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Gastos Periodo</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><LineChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" /></div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.gastos)}</p>
          </div>
        </Card>
        <Card className="rounded-2xl shadow-lg border-none overflow-hidden transition-all hover:scale-[1.02]">
          <div className="p-5 sm:p-6 bg-gradient-to-br from-orange-600 to-orange-400 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] sm:text-xs font-bold uppercase opacity-80 tracking-widest">Utilidad Neta</span>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" /></div>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{currencyFormatter.format(metrics.utilidad)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mb-8">
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
          <CardHeader className="bg-slate-50/50 border-b p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-sm sm:text-lg font-bold uppercase tracking-tight">Histórico de Transacciones</CardTitle>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar descripción o placa..." 
                  className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-xs w-full" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50/30">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="p-4 sm:p-5 font-black text-[10px] uppercase text-slate-400">Fecha</TableHead>
                  <TableHead className="p-4 sm:p-5 font-black text-[10px] uppercase text-slate-400">Tipo</TableHead>
                  <TableHead className="p-4 sm:p-5 font-black text-[10px] uppercase text-slate-400">Descripción</TableHead>
                  <TableHead className="p-4 sm:p-5 font-black text-[10px] uppercase text-slate-400 text-right">Valor</TableHead>
                  <TableHead className="w-[50px] p-4 sm:p-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransacciones.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <TableCell className="p-4 sm:p-5 text-xs font-bold text-slate-600 whitespace-nowrap">{format(parseISO(t.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="p-4 sm:p-5">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${t.tipo === 'Ingreso' ? 'text-green-600 bg-green-50 border-green-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                        {t.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 sm:p-5">
                      <div className="flex flex-col min-w-[150px]">
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
                    <TableCell className={`p-4 sm:p-5 text-sm text-right font-black whitespace-nowrap ${t.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.tipo === 'Ingreso' ? '+' : '-'}{currencyFormatter.format(t.valor)}
                    </TableCell>
                    <TableCell className="p-4 sm:p-5 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransacciones.length === 0 && !isTransLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-16 sm:p-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <LineChartIcon className="h-10 w-10 sm:h-12 sm:w-12" />
                        <p className="font-black uppercase text-[10px] sm:text-xs">Sin movimientos en este periodo</p>
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
