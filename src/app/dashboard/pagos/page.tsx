'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, Timestamp, getDocs, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  Search, 
  Mail, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Loader2, 
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Landmark,
  RefreshCcw
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function PagosAuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Consultas a Firestore
  const pagosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'pagos_aplicados'), orderBy('fecha', 'desc'));
  }, [db, user]);

  const pendientesCorreoQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'pagos_pendientes_correo'), where('pendiente', '==', true));
  }, [db, user]);

  const { data: pagosRaw, isLoading: loadingPagos } = useCollection(pagosQuery);
  const { data: pendientesCorreo, isLoading: loadingPendientes } = useCollection(pendientesCorreoQuery);

  const pagos = pagosRaw || [];
  const pendientes = pendientesCorreo || [];

  // Estadísticas del día
  const statsDia = useMemo(() => {
    const hoy = pagos.filter(p => {
      const fecha = p.fecha instanceof Timestamp ? p.fecha.toDate() : new Date(p.fecha);
      return isToday(fecha);
    });

    return {
      total: hoy.reduce((acc, p) => acc + (Number(p.valorPago) || 0), 0),
      count: hoy.length,
      completos: hoy.filter(p => p.estadoPago === 'Pagado').length,
      anticipos: hoy.filter(p => p.estadoPago === 'Anticipo').length
    };
  }, [pagos]);

  // Filtrado de tabla
  const filteredPagos = useMemo(() => {
    return pagos.filter(p => {
      const matchesSearch = (p.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.consecutivo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = filterEstado === 'Todos' || p.estadoPago === filterEstado;
      return matchesSearch && matchesEstado;
    });
  }, [pagos, searchTerm, filterEstado]);

  const handleSendEmail = async (pend: any) => {
    setIsProcessing(pend.id);
    try {
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: pend.emailCliente,
          nroFactura: pend.consecutivo,
          servicioData: pend.servicioData || {
            cliente: pend.clienteNombre,
            nit: pend.nitCliente,
            fecha: pend.fechaServicio || new Date().toISOString(),
            valor: pend.valorPago
          }
        })
      });

      if (response.ok) {
        const docRef = doc(db, 'pagos_pendientes_correo', pend.id);
        await updateDoc(docRef, { pendiente: false });
        toast({ title: "Correo Enviado", description: `Confirmación enviada a ${pend.emailCliente}` });
      } else {
        throw new Error('Error al enviar el correo');
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar la notificación de pago." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReconcile = async () => {
    if (!confirm('¿Deseas sincronizar todos los pagos registrados con la cartera? Esto corregirá inconsistencias de saldo.')) return;
    setIsProcessing('reconcile');
    let fixedCount = 0;

    try {
      // Re-consultamos los pagos para asegurar datos frescos
      const pagosSnap = await getDocs(collection(db, 'pagos_aplicados'));
      
      for (const pDoc of pagosSnap.docs) {
        const p = pDoc.data();
        if (p.servicioId) {
          const sRef = doc(db, 'services', p.servicioId);
          const sSnap = await getDoc(sRef);
          
          if (sSnap.exists()) {
            const sData = sSnap.data();
            // Si el estado o el saldo en el servicio no coinciden con el último pago registrado
            if (sData.estadoPago !== p.estadoPago || sData.saldo !== p.saldoNuevo) {
              await updateDoc(sRef, {
                estadoPago: p.estadoPago,
                saldo: p.saldoNuevo,
                // Si el pago fue total, aseguramos que el anticipo sea igual al valor total
                ...(p.estadoPago === 'Pagado' ? { anticipo: sData.valorServicio || p.valorPago } : {})
              });
              fixedCount++;
            }
          }
        }
      }
      toast({ title: "Sincronización Exitosa", description: `Se han actualizado ${fixedCount} servicios en cartera.` });
    } catch (err) {
      console.error('Error en reconciliación:', err);
      toast({ variant: "destructive", title: "Error de Sincronización", description: "No se pudieron reconciliar todos los registros." });
    } finally {
      setIsProcessing(null);
    }
  };

  const exportToExcel = () => {
    const rows = filteredPagos.map(p => ({
      Fecha: format(p.fecha instanceof Timestamp ? p.fecha.toDate() : new Date(p.fecha), 'dd/MM/yyyy HH:mm'),
      Consecutivo: p.consecutivo,
      Cliente: p.clienteNombre,
      'Valor Pagado': p.valorPago,
      Transacción: p.numeroTransaccion,
      'Banco Origen': p.bancoOrigen,
      'Banco Destino': p.bancoDestino,
      'Saldo Anterior': p.saldoAnterior,
      'Saldo Nuevo': p.saldoNuevo,
      Estado: p.estadoPago
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria_Pagos");
    XLSX.writeFile(workbook, `Reporte_Pagos_Nova_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Auditoría de Pagos</h1>
            <Badge className="bg-orange-500 text-white font-black px-3 py-1 rounded-lg">
              {statsDia.count} HOY
            </Badge>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Supervisión de conciliaciones automáticas procesadas por Nova.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleReconcile} 
            disabled={isProcessing === 'reconcile'}
            className="font-black text-[10px] uppercase border-orange-200 text-orange-600 hover:bg-orange-50 h-11"
          >
            {isProcessing === 'reconcile' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Reconciliar Cartera
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="font-black text-[10px] uppercase border-slate-200 hover:bg-emerald-50 h-11">
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Exportar Excel
          </Button>
        </div>
      </header>

      {/* Resumen del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-emerald-100 text-emerald-600 bg-emerald-50">Recaudo Hoy</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Procesado</p>
            <h3 className="text-2xl font-black text-slate-900">{currencyFormatter.format(statsDia.total)}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-blue-100 text-blue-600 bg-blue-50">Conciliaciones</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pagos de Hoy</p>
            <h3 className="text-2xl font-black text-slate-900">{statsDia.count} Operaciones</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Abonos Parciales</p>
            <h3 className="text-2xl font-black text-slate-900">{statsDia.anticipos} Anticipos</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pagos Totales</p>
            <h3 className="text-2xl font-black text-slate-900">{statsDia.completos} Finalizados</h3>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Correos Pendientes */}
      {pendientes.length > 0 && (
        <Alert className="bg-orange-50 border-orange-200 rounded-2xl shadow-lg shadow-orange-100 overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
          <AlertCircle className="h-5 w-5 text-orange-600 mt-1" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div>
              <AlertTitle className="text-orange-900 font-black uppercase text-xs tracking-tight">Acción Requerida: Notificaciones de Pago</AlertTitle>
              <AlertDescription className="text-orange-700 text-sm font-medium">
                Hay {pendientes.length} pagos conciliados por Nova que aún no han sido notificados por correo al cliente.
              </AlertDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendientes.slice(0, 3).map(pend => (
                <Button 
                  key={pend.id}
                  size="sm" 
                  onClick={() => handleSendEmail(pend)}
                  disabled={isProcessing === pend.id}
                  className="bg-white hover:bg-slate-100 text-orange-600 border border-orange-200 font-black text-[10px] uppercase h-8 px-4 shadow-sm"
                >
                  {isProcessing === pend.id ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Mail className="h-3 w-3 mr-2" />}
                  Enviar a {pend.consecutivo}
                </Button>
              ))}
              {pendientes.length > 3 && (
                <Badge className="bg-orange-200 text-orange-800 font-black text-[10px]">+{pendientes.length - 3} MÁS</Badge>
              )}
            </div>
          </div>
        </Alert>
      )}

      {/* Historial de Pagos Aplicados */}
      <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 p-6 sm:p-8 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" /> Historial de Transacciones
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Cliente o Consecutivo..." 
                  className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-xs focus:ring-orange-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                {['Todos', 'Pagado', 'Anticipo'].map(est => (
                  <button
                    key={est}
                    onClick={() => setFilterEstado(est)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all flex-1 sm:flex-none",
                      filterEstado === est ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto w-full">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-b border-slate-100">
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Fecha/Hora</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Consecutivo</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Cliente</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-right">Valor Pagado</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400">Transacción / Banco</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-right">Conciliación (Saldos)</TableHead>
                <TableHead className="p-5 font-black text-[10px] uppercase text-slate-400 text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPagos ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Sincronizando cobros...</p>
                  </TableCell>
                </TableRow>
              ) : filteredPagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-20 text-center opacity-40">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">No se encontraron pagos registrados</p>
                  </TableCell>
                </TableRow>
              ) : filteredPagos.map((p) => {
                const fecha = p.fecha instanceof Timestamp ? p.fecha.toDate() : new Date(p.fecha);
                return (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <TableCell className="p-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{format(fecha, 'dd MMM yyyy', { locale: es }).toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-slate-400">{format(fecha, 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5">
                      <Badge variant="outline" className="font-black text-[10px] border-orange-100 text-orange-600 bg-orange-50/30">
                        {p.consecutivo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex flex-col max-w-[180px]">
                        <span className="text-xs font-black text-slate-800 uppercase truncate">{p.clienteNombre}</span>
                        <span className="text-[10px] font-bold text-slate-400">{p.telefonoCliente}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-5 text-right">
                      <span className="text-sm font-black text-emerald-600">{currencyFormatter.format(p.valorPago)}</span>
                    </TableCell>
                    <TableCell className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                          <Landmark className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{p.numeroTransaccion}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{p.bancoOrigen} ➔ {p.bancoDestino}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 line-through decoration-slate-300">{currencyFormatter.format(p.saldoAnterior)}</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                          <ArrowUpRight className="h-3 w-3 text-orange-500" />
                          {currencyFormatter.format(p.saldoNuevo)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="p-5 text-center">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                        p.estadoPago === 'Pagado' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                      )}>
                        {p.estadoPago}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
