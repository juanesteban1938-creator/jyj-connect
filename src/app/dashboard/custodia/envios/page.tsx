
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Package, Search, DollarSign, ShieldCheck, Truck, Activity, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { EnvioForm } from '@/components/dashboard/custodia/envio-form';
import { EnviosTable } from '@/components/dashboard/custodia/envios-table';
import { AsignarConductorModal } from '@/components/dashboard/custodia/asignar-conductor-modal';
import type { Envio } from '@/lib/custodia-types';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
});

export default function EnvioCustodiaPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
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

  const stats = useMemo(() => {
    if (!envios) return { total: 0, fondo: 0, costos: 0, activos: 0 };
    return envios.reduce((acc, e) => {
      if (e.estado !== 'cancelado') {
        acc.total += (e.tarifaTotal || 0);
        acc.fondo += (e.primaRiesgo || 0) + (e.cargoCustodia || 0);
        acc.costos += (e.costoBaseLogistico || 0);
        if (e.estado === 'programado' || e.estado === 'en_transito') {
          acc.activos += 1;
        }
      }
      return acc;
    }, { total: 0, fondo: 0, costos: 0, activos: 0 });
  }, [envios]);

  const handleSaveEnvio = async (data: any) => {
    setIsSaving(true);
    try {
      const esNuevo = !selectedEnvio;
      const id = esNuevo ? `CUST-${Date.now()}` : selectedEnvio.id;
      const docRef = doc(db!, 'envios', id);
      
      const payload = {
        ...data,
        id,
        consecutivo: esNuevo ? `#ENV-${(envios?.length || 0) + 1001}` : selectedEnvio.consecutivo,
        estado: esNuevo ? (data.requiereRevisionManual ? 'requiere_revision_manual' : 'programado') : selectedEnvio.estado,
        createdAt: esNuevo ? serverTimestamp() : selectedEnvio.createdAt,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, payload, { merge: true });
      toast({ title: esNuevo ? "Envío Registrado" : "Envío Actualizado", description: "La logística de custodia ha sido sincronizada exitosamente." });
      setIsFormOpen(false);
      setSelectedEnvio(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el registro." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('¿Desea cancelar este envío blindado?')) return;
    try {
      const docRef = doc(db!, 'envios', id);
      await updateDoc(docRef, { estado: 'cancelado' });
      toast({ title: "Envío Cancelado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const filteredEnvios = envios?.filter(e => 
    e.consecutivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.destino || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.clienteNombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const KPICard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl group transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2 rounded-xl bg-opacity-10", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-1 rounded-full">En Vivo</span>
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">{value}</h3>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">J&J Custodia</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión integral de envíos blindados y transporte de valores.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <a href="/conductor/envio/preview" target="_blank" rel="noopener noreferrer">
              🔍 Simulador App Conductor
            </a>
          </Button>

          <Dialog open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if(!o) setSelectedEnvio(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs h-12 px-8 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95">
                <PlusCircle className="h-5 w-5 mr-2" /> Nuevo Envío Blindado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-5xl lg:max-w-6xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-slate-50">
              <div className="p-0 max-h-[90vh] overflow-y-auto">
                <EnvioForm envio={selectedEnvio} onSave={handleSaveEnvio} isSaving={isSaving} onCancel={() => setIsFormOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Recaudado" value={currencyFormatter.format(stats.total)} icon={DollarSign} colorClass="bg-blue-500 text-blue-600" />
        <KPICard title="Fondo de Custodia" value={currencyFormatter.format(stats.fondo)} icon={ShieldCheck} colorClass="bg-emerald-500 text-emerald-600" />
        <KPICard title="Costos Operativos" value={currencyFormatter.format(stats.costos)} icon={Truck} colorClass="bg-orange-500 text-orange-600" />
        <KPICard title="Envíos Activos" value={`${stats.activos} OPS.`} icon={Activity} colorClass="bg-indigo-500 text-indigo-600" />
      </div>

      <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/30 p-6 sm:p-8 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" /> Historial de Operaciones
            </CardTitle>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por ID, cliente o descripción..." 
                className="pl-9 h-11 bg-white border-slate-200 rounded-xl focus:ring-orange-500 transition-all text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <EnviosTable 
          data={filteredEnvios} 
          isLoading={isLoading} 
          onAsignar={(envio) => { setSelectedEnvio(envio); setIsAssignModalOpen(true); }}
          onEditar={(envio) => { setSelectedEnvio(envio); setIsFormOpen(true); }}
          onCancelar={handleCancelar}
        />
      </Card>

      <AsignarConductorModal 
        envio={selectedEnvio} 
        isOpen={isAssignModalOpen} 
        onClose={() => { setIsAssignModalOpen(false); setSelectedEnvio(null); }} 
      />

      <footer className="text-center pt-8">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">J&J Custodia Engine — Nova Tracker v1.0</p>
      </footer>
    </div>
  );
}
