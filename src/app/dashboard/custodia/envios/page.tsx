
'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Package, MapPin, Calendar, Clock, DollarSign, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EnvioForm } from '@/components/dashboard/custodia/envio-form';
import type { Envio } from '@/lib/custodia-types';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function EnvioCustodiaPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const enviosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'envios'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: envios, isLoading } = useCollection<Envio>(enviosQuery);

  const handleSaveEnvio = async (data: Omit<Envio, 'id' | 'consecutivo' | 'createdAt' | 'estado'>) => {
    setIsSaving(true);
    try {
      const newId = `CUST-${Date.now()}`;
      const docRef = doc(db, 'envios', newId);
      
      const payload = {
        ...data,
        id: newId,
        consecutivo: `JC-${(envios?.length || 0) + 5001}`,
        estado: 'Programado',
        createdAt: serverTimestamp(),
      };

      await setDoc(docRef, payload);
      toast({ title: "Envío Programado", description: "El servicio de custodia ha sido registrado exitosamente." });
      setIsFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el envío." });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEnvios = envios?.filter(e => 
    e.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destino.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Envíos Blindados</h1>
          <p className="text-slate-500 text-sm font-medium">Gestión de logística de custodia y transporte de valores.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs h-11 px-6 rounded-xl shadow-lg">
              <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Envío Blindado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-8 border-b bg-slate-50/50">
              <DialogTitle className="text-xl font-black uppercase flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500 text-white"><Package className="h-5 w-5" /></div>
                Programar Servicio de Custodia
              </DialogTitle>
              <DialogDescription>Complete los datos para generar la cotización de riesgo.</DialogDescription>
            </DialogHeader>
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              <EnvioForm onSave={handleSaveEnvio} isSaving={isSaving} onCancel={() => setIsFormOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/30 p-6 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar envío o paquete..." 
              className="pl-9 h-11 bg-white border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Consecutivo</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Fecha / Ruta</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Paquete / Valor</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase text-right">Tarifa Total</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-orange-500" /></TableCell></TableRow>
              ) : filteredEnvios?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-xs">Sin envíos registrados</TableCell></TableRow>
              ) : filteredEnvios?.map(e => (
                <TableRow key={e.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                  <TableCell className="p-5">
                    <Badge variant="outline" className="font-black text-orange-600 border-orange-100 bg-orange-50/30">{e.consecutivo}</Badge>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 uppercase">{e.origen} ➔ {e.destino}</span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> {e.fecha} <Clock className="h-3 w-3 ml-2" /> {e.hora}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 uppercase truncate max-w-[150px]">{e.descripcion}</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Declarado: {currencyFormatter.format(e.valorDeclarated || e.valorDeclarado)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-slate-900">{currencyFormatter.format(e.tarifaTotal)}</span>
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase px-1.5 mt-1">{e.vehiculo}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="p-5 text-center">
                    <Badge className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                      e.estado === 'Programado' ? "bg-blue-50 text-blue-600" : 
                      e.estado === 'Entregado' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {e.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
