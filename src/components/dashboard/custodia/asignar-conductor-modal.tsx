
'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Conductor } from '@/lib/types';
import type { Envio } from '@/lib/custodia-types';

interface Props {
  envio: Envio | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AsignarConductorModal({ envio, isOpen, onClose }: Props) {
  const [selectedConductorId, setSelectedConductorId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Consulta en modo Solo Lectura a la colección de conductores existente
  const conductoresQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'conductores'));
  }, [db, user]);

  const { data: conductores, isLoading: loadingCond } = useCollection<Conductor>(conductoresQuery);

  const handleSave = async () => {
    if (!envio || !selectedConductorId || !db) return;

    setIsSaving(true);
    const conductor = conductores?.find(c => c.id === selectedConductorId);
    
    try {
      const docRef = doc(db, 'envios', envio.id);
      await updateDoc(docRef, {
        conductorId: selectedConductorId,
        conductorNombre: conductor ? `${conductor.nombres} ${conductor.apellidos}` : 'Conductor Asignado',
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Conductor Asignado",
        description: `Se ha vinculado a ${conductor?.nombres} con el envío ${envio.consecutivo}.`
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de asignación",
        description: "No se pudo actualizar el registro del envío."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <div className="p-2 rounded-xl bg-orange-500 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            Asignar Custodio
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase text-slate-400 mt-1">
            Servicio {envio?.consecutivo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
              Personal Disponible (Flota J&J)
            </Label>
            <Select value={selectedConductorId} onValueChange={setSelectedConductorId}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold bg-slate-50">
                <SelectValue placeholder={loadingCond ? "Cargando..." : "Seleccionar conductor..."} />
              </SelectTrigger>
              <SelectContent>
                {conductores?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold text-xs uppercase">
                    {c.nombres} {c.apellidos} — {c.categoriaLicencia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase text-[10px]">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !selectedConductorId}
            className="bg-slate-900 text-white font-black uppercase text-[10px] h-11 px-6 rounded-xl shadow-lg"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
