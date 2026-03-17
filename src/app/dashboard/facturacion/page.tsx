'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, DollarSign, TrendingUp, AlertTriangle, FileText, MoreHorizontal, CheckCircle, Mail, Edit, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CuentaCobro } from '@/components/dashboard/facturacion/cuenta-cobro';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AbonoForm, type AbonoFormValues } from '@/components/dashboard/facturacion/abono-form';
import { FacturacionForm, type FacturacionFormValues } from '@/components/dashboard/facturacion/facturacion-form';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function FacturacionPage() {
  const [servicios, setServicios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [isFacturaOpen, setIsFacturaOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const servicesCol = collection(db, 'services');
    const q = query(servicesCol, orderBy('fecha', 'desc'));
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServicios(data);
      }, 
      async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: servicesCol.path,
          operation: 'list'
        }));
      }
    );
    return () => unsubscribe();
  }, [db, user]);

  const stats = useMemo(() => {
    return servicios.reduce((acc, s) => {
      const valor = Number(s.valorServicio) || 0;
      const costo = Number(s.costoOperacion) || 0;
      const anticipo = Number(s.anticipo) || 0;
      const saldo = (s.saldo !== undefined && s.saldo !== null) ? Number(s.saldo) : (valor - anticipo);

      acc.total += valor;
      if (s.estadoPago === 'Pagado') {
        acc.ganancia += (valor - costo);
      }
      if (s.estadoPago === 'Pendiente' || s.estadoPago === 'Anticipo') {
        acc.cartera += saldo;
      }
      return acc;
    }, { total: 0, ganancia: 0, cartera: 0 });
  }, [servicios]);

  const handleMarcarPagada = (servicio: any) => {
    setIsProcessing(true);
    const docRef = doc(db, 'services', servicio.id);
    const valor = Number(servicio.valorServicio) || 0;
    const updates = { estadoPago: 'Pagado', saldo: 0, anticipo: valor };
    
    updateDoc(docRef, updates)
      .then(async () => {
        toast({ title: "✅ Servicio Pagado" });

        if (servicio.emailCliente) {
          toast({ title: "📧 Enviando confirmación de pago..." });
          const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: servicio.emailCliente,
              nroFactura: servicio.consecutivo,
              servicioData: {
                cliente: servicio.clienteNombre || servicio.cliente,
                nit: servicio.nitCliente,
                fecha: servicio.fecha,
                origen: servicio.origen,
                destino: servicio.destino,
                valor: valor,
                conductor: servicio.conductor,
                vehiculo: servicio.vehiculo
              }
            })
          });
          if (response.ok) {
            toast({ title: "📧 Confirmación de pago enviada automáticamente" });
          }
        }
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
        toast({ variant: "destructive", title: "Error al actualizar pago" });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleSaveAbono = (data: AbonoFormValues) => {
    if (!selected) return;
    setIsProcessing(true);
    const docRef = doc(db, 'services', selected.id);
    const valorOriginal = Number(selected.valorServicio) || 0;
    const anticipoAnterior = Number(selected.anticipo) || 0;
    const nuevoAnticipo = anticipoAnterior + Number(data.valorAbono);
    const nuevoSaldo = Math.max(0, valorOriginal - nuevoAnticipo);
    
    const updates = { 
      anticipo: nuevoAnticipo, 
      saldo: nuevoSaldo, 
      estadoPago: data.nuevoEstadoPago,
      metodoPago: data.metodoPago,
      numeroComprobante: data.numeroComprobante,
      banco: data.banco
    };

    updateDoc(docRef, updates)
      .then(async () => {
        setIsAbonoOpen(false);
        toast({ title: "Abono Registrado" });

        if (data.nuevoEstadoPago === 'Pagado' && selected.emailCliente) {
          toast({ title: "📧 Enviando confirmación de pago..." });
          const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selected.emailCliente,
              nroFactura: selected.consecutivo,
              servicioData: {
                cliente: selected.clienteNombre || selected.cliente,
                nit: selected.nitCliente,
                fecha: selected.fecha,
                origen: selected.origen,
                destino: selected.destino,
                valor: valorOriginal,
                conductor: selected.conductor,
                vehiculo: selected.vehiculo
              }
            })
          });
          if (response.ok) {
            toast({ title: "📧 Confirmación de pago enviada automáticamente" });
          }
        }
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
        toast({ variant: "destructive", title: "Error al registrar abono" });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleSaveEdit = (data: FacturacionFormValues) => {
    if (!selected) return;
    setIsProcessing(true);
    const docRef = doc(db, 'services', selected.id);
    const valor = Number(data.valorServicio) || 0;
    const anticipo = Number(data.anticipo) || 0;
    const saldo = valor - anticipo;
    
    updateDoc(docRef, { ...data, saldo })
      .then(async () => {
        setIsEditOpen(false);
        toast({ title: "Facturación Actualizada" });

        if (data.estadoPago === 'Pagado' && selected.emailCliente) {
          toast({ title: "📧 Enviando confirmación de pago..." });
          const response = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selected.emailCliente,
              nroFactura: selected.consecutivo,
              servicioData: {
                cliente: selected.clienteNombre || selected.cliente,
                nit: selected.nitCliente,
                fecha: selected.fecha,
                origen: selected.origen,
                destino: selected.destino,
                valor: valor,
                conductor: selected.conductor,
                vehiculo: selected.vehiculo
              }
            })
          });
          if (response.ok) {
            toast({ title: "📧 Confirmación de pago enviada" });
          }
        }
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data
        }));
        toast({ variant: "destructive", title: "Error al actualizar facturación" });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const filtered = servicios.filter(s => s.cliente?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title mb-0">Facturación y Cartera</h1>
          <p className="page-subtitle mb-0 mt-1">Gestión financiera sincronizada con la nube.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Facturación Total</span>
              <div className="bg-blue-50 p-2 rounded-xl"><DollarSign className="h-4 w-4 text-blue-600" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black">{currencyFormatter.format(stats.total)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Ganancia Neta</span>
              <div className="bg-green-50 p-2 rounded-xl"><TrendingUp className="h-4 w-4 text-green-600" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black">{currencyFormatter.format(stats.ganancia)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cartera Pendiente</span>
              <div className="bg-red-50 p-2 rounded-xl"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-red-600">{currencyFormatter.format(stats.cartera)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." className="pl-9 h-11 bg-white border-slate-200 rounded-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </div>

      <Card className="rounded-2xl shadow-sm border-none overflow-hidden bg-white">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="p-4 font-black text-[10px] uppercase text-slate-400">Fecha</TableHead>
                <TableHead className="p-4 font-black text-[10px] uppercase text-slate-400">Cliente</TableHead>
                <TableHead className="p-4 text-right font-black text-[10px] uppercase text-slate-400">Valor</TableHead>
                <TableHead className="p-4 text-center font-black text-[10px] uppercase text-slate-400">Estado</TableHead>
                <TableHead className="text-center p-4 font-black text-[10px] uppercase text-slate-400"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                  <TableCell className="p-4 text-xs font-bold text-slate-600">{format(new Date(s.fecha), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="p-4 text-sm font-black uppercase text-slate-800">{s.cliente}</TableCell>
                  <TableCell className="p-4 text-sm text-right font-black text-slate-900">{currencyFormatter.format(Number(s.valorServicio) || 0)}</TableCell>
                  <TableCell className="p-4 text-center">
                    <Badge variant={s.estadoPago === 'Pagado' ? 'default' : 'outline'} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md">{s.estadoPago}</Badge>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={isProcessing}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsFacturaOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5"><FileText className="mr-2 h-4 w-4" /> Ver Cuenta de Cobro</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsAbonoOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5"><DollarSign className="mr-2 h-4 w-4" /> Registrar Pago/Abono</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsEditOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5"><Edit className="mr-2 h-4 w-4" /> Editar Facturación</DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsFacturaOpen(true), 100); }} className="rounded-lg font-bold text-xs py-2.5"><Mail className="mr-2 h-4 w-4" /> Enviar por Correo</DropdownMenuItem>
                        {s.estadoPago !== 'Pagado' && (
                          <DropdownMenuItem className="text-green-600 rounded-lg font-bold text-xs py-2.5 bg-green-50/50 mt-1" onClick={() => handleMarcarPagada(s)}><CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pagada</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!user || filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <DollarSign className="h-10 w-10" />
                      <p className="font-bold uppercase text-xs">{!user ? 'Sincronizando sesión...' : 'No se encontraron registros de facturación'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto rounded-3xl bg-[#f0f0f0] p-0 overflow-hidden border-none shadow-2xl" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Vista previa de la cuenta de cobro para el cliente.</DialogDescription>
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Vista Previa de Cuenta de Cobro</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          {selected && <CuentaCobro servicio={selected} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isAbonoOpen} onOpenChange={o => { if(!isProcessing) setIsAbonoOpen(o); }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Formulario para registrar abonos o pagos parciales de servicios.</DialogDescription>
          <div className="p-6 border-b bg-slate-50/50">
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500 text-white">
                <DollarSign className="h-5 w-5" />
              </div>
              Registrar Pago / Abono
            </DialogTitle>
          </div>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {selected && <AbonoForm servicio={selected} onSave={handleSaveAbono} onCancel={() => setIsAbonoOpen(false)} isProcessing={isProcessing} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={o => { if(!isProcessing) setIsEditOpen(o); }}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden flex flex-col" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Formulario para editar detalles de facturación, costos y estados de pago.</DialogDescription>
          <div className="p-6 border-b bg-slate-50/50">
            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500 text-white">
                <Edit className="h-5 w-5" />
              </div>
              Editar Facturación
            </DialogTitle>
          </div>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {selected && <FacturacionForm servicio={selected} onSave={handleSaveEdit} onCancel={() => setIsEditOpen(false)} isProcessing={isProcessing} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
