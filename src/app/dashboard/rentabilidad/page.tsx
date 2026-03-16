'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, LineChart as LineChartIcon, CreditCard, Search, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RentabilidadForms } from '@/components/dashboard/rentabilidad/rentabilidad-forms';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Transaccion } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function RentabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  const metrics = useMemo(() => {
    const ingresos = transacciones.filter(t => t.tipo === 'Ingreso').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    const gastos = transacciones.filter(t => t.tipo === 'Gasto').reduce((sum, t) => sum + (Number(t.valor) || 0), 0);
    return { ingresos, gastos, utilidad: ingresos - gastos };
  }, [transacciones]);

  const handleSave = (transaccionData: Omit<Transaccion, 'id'>) => {
    setIsSaving(true);
    const colRef = collection(db, 'transacciones');
    addDoc(colRef, transaccionData)
      .then(() => toast({ title: "Transacción Registrada" }))
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: transaccionData
        }));
        toast({ variant: "destructive", title: "Error al registrar transacción" });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Desea eliminar este registro contable?')) return;
    const docRef = doc(db, 'transacciones', id);
    deleteDoc(docRef)
      .then(() => toast({ title: "Registro eliminado" }))
      .catch((e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete'
        }));
        toast({ variant: "destructive", title: "No se pudo eliminar el registro" });
      });
  };

  const filteredTransacciones = transacciones.filter(t => 
    t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Gestión de P&G</h1>
        <p className="page-subtitle">Administración financiera de la flota y rentabilidad en la nube.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ingresos Brutos</span>
            <div className="bg-green-50 p-2 rounded-full"><DollarSign className="h-4 w-4 text-green-600" /></div>
          </div>
          <p className="font-bold text-2xl">{currencyFormatter.format(metrics.ingresos)}</p>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gastos Totales</span>
            <div className="bg-red-50 p-2 rounded-full"><LineChartIcon className="h-4 w-4 text-red-600" /></div>
          </div>
          <p className="font-bold text-2xl">{currencyFormatter.format(metrics.gastos)}</p>
        </Card>
        <Card className="rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Utilidad Neta</span>
            <div className="bg-orange-50 p-2 rounded-full"><CreditCard className="h-4 w-4 text-orange-600" /></div>
          </div>
          <p className="text-2xl font-bold text-orange-600">{currencyFormatter.format(metrics.utilidad)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-4">
          <RentabilidadForms 
            vehiculos={vehiculos} 
            onSave={handleSave} 
          />
        </div>
        <Card className="lg:col-span-8 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.08)] border-none p-6 bg-white relative">
          {isTransLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <CardHeader className="p-0 mb-6"><CardTitle className="text-lg font-bold">Histórico de Transacciones</CardTitle></CardHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por descripción o placa..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="p-4">FECHA</TableHead>
                  <TableHead className="p-4">TIPO</TableHead>
                  <TableHead className="p-4">DESCRIPCIÓN</TableHead>
                  <TableHead className="p-4 text-right">VALOR</TableHead>
                  <TableHead className="w-[50px] p-4 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransacciones.map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="p-4 text-sm">{format(new Date(t.fecha), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell className="p-4">
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase ${t.tipo === 'Ingreso' ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                        {t.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t.descripcion}</span>
                        {t.vehiculoPlaca && <span className="text-[10px] font-bold uppercase text-muted-foreground">PLACA: {t.vehiculoPlaca}</span>}
                      </div>
                    </TableCell>
                    <TableCell className={`p-4 text-sm text-right font-bold ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.tipo === 'Ingreso' ? '+' : '-'}{currencyFormatter.format(t.valor)}
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransacciones.length === 0 && !isTransLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center font-medium italic text-muted-foreground">
                      No se encontraron transacciones registradas.
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
