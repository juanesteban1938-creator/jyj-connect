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

        // Envío automático de confirmación de pago
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

        // Si el servicio queda totalmente pagado, enviar correo automáticamente
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

        // Si se marca como pagado manualmente en la edición, también enviar correo
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
      <header>
        <h1 className="page-title">Facturación y Cartera</h1>
        <p className="page-subtitle">Gestión financiera sincronizada con la nube.</p>
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
        {isProcessing && <Loader2 className="ml-4 h-5 w-5 animate-spin text-primary" />}
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
                  <TableCell className="p-4 text-sm text-right font-semibold">{currencyFormatter.format(Number(s.valorServicio) || 0)}</TableCell>
                  <TableCell className="p-4 text-center">
                    <Badge variant={s.estadoPago === 'Pagado' ? 'default' : 'outline'} className="text-[10px] font-bold uppercase">{s.estadoPago}</Badge>
                  </TableCell>
                  <TableCell className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isProcessing}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsFacturaOpen(true), 100); }}><FileText className="mr-2 h-4 w-4" /> Ver Cuenta de Cobro</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsAbonoOpen(true), 100); }}><DollarSign className="mr-2 h-4 w-4" /> Registrar Pago/Abono</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsEditOpen(true), 100); }}><Edit className="mr-2 h-4 w-4" /> Editar Facturación</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setSelected(s); setTimeout(() => setIsFacturaOpen(true), 100); }}><Mail className="mr-2 h-4 w-4" /> Enviar por Correo</DropdownMenuItem>
                        {s.estadoPago !== 'Pagado' && (
                          <DropdownMenuItem className="text-green-600" onClick={() => handleMarcarPagada(s)}><CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pagada</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!user || filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                    {!user ? 'Sincronizando sesión...' : 'No se encontraron registros de facturación.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isFacturaOpen} onOpenChange={setIsFacturaOpen}>
        <DialogContent className="max-w-4xl bg-[#f0f0f0] p-0 overflow-hidden border-none" aria-describedby={undefined}>
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
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Formulario para registrar abonos o pagos parciales de servicios.</DialogDescription>
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Registrar Pago / Abono</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          <DialogHeader><DialogTitle>Registrar Pago / Abono</DialogTitle></DialogHeader>
          {selected && <AbonoForm servicio={selected} onSave={handleSaveAbono} onCancel={() => setIsAbonoOpen(false)} isProcessing={isProcessing} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={o => { if(!isProcessing) setIsEditOpen(o); }}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogDescription className="sr-only">Formulario para editar detalles de facturación, costos y estados de pago.</DialogDescription>
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Editar Facturación</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          <DialogHeader><DialogTitle>Editar Facturación</DialogTitle></DialogHeader>
          {selected && <FacturacionForm servicio={selected} onSave={handleSaveEdit} onCancel={() => setIsEditOpen(false)} isProcessing={isProcessing} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
