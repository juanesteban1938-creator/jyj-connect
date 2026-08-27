
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Package, Search, DollarSign, ShieldCheck, Truck, Activity } from 'lucide-react';
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

  // CÁLCULO DE KPIs ANALÍTICOS
  const stats = useMemo(() => {
    if (!envios) return { total: 0, fondo: 0, costos: 0, activos: 0 };
    return envios.reduce((acc, e) => {
      if (e.estado !== 'cancelado') {
        acc.total += (e.tarifaTotal || 0);
        acc.fondo += (e.primaRiesgo || 0);
        acc.costos += (e.subtotal || 0);
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
      const newId = `CUST-${Date.now()}`;
      const docRef = doc(db!, 'envios', newId);
      
      const payload = {
        ...data,
        id: newId,
        consecutivo: `#ENV-${(envios?.length || 0) + 1001}`,
        estado: data.requiereRevisionManual ? 'requiere_revision_manual' : 'programado',
        createdAt: serverTimestamp(),
      };

      await setDoc(docRef, payload);
      toast({ title: "Envío Registrado", description: "La logística de custodia ha sido iniciada exitosamente." });
      setIsFormOpen(false);
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
    e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destino.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.conductorNombre?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const KPICard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="border-none shadow-sm bg-white overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2.5 rounded-xl transition-colors", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">En Vivo</span>
        </div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
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
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs h-12 px-8 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95">
              <PlusCircle className="h-5 w-5 mr-2" /> Nuevo Envío Blindado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] sm:max-w-4xl lg:max-w-6xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-8 border-b bg-slate-50/50">
              <DialogTitle className="text-xl font-black uppercase flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                  <Package className="h-5 w-5" />
                </div>
                Consola de Programación Nova
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase text-slate-400 mt-1">
                Configuración logística y análisis de rentabilidad en tiempo real
              </DialogDescription>
            </DialogHeader>
            <div className="p-0 max-h-[85vh] overflow-y-auto">
              <EnvioForm onSave={handleSaveEnvio} isSaving={isSaving} onCancel={() => setIsFormOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Recaudado" 
          value={currencyFormatter.format(stats.total)} 
          icon={DollarSign} 
          colorClass="bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
        />
        <KPICard 
          title="Fondo de Custodia" 
          value={currencyFormatter.format(stats.fondo)} 
          icon={ShieldCheck} 
          colorClass="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
        />
        <KPICard 
          title="Costos Operativos" 
          value={currencyFormatter.format(stats.costos)} 
          icon={Truck} 
          colorClass="bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"
        />
        <KPICard 
          title="Envíos Activos" 
          value={`${stats.activos} Ops.`} 
          icon={Activity} 
          colorClass="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
        />
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
                placeholder="Buscar por ID, descripción o custodio..." 
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
