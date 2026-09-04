'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldCheck, UserPlus, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UsuarioPanel } from '@/lib/custodia-types';

const MODULOS = [
  { id: 'tablero', label: 'Tablero Principal' },
  { id: 'servicios', label: 'Pasajeros - Servicios' },
  { id: 'conductores', label: 'Pasajeros - Conductores' },
  { id: 'vehiculos', label: 'Pasajeros - Vehículos' },
  { id: 'clientes', label: 'Cartera Clientes' },
  { id: 'analitica', label: 'Finanzas - Analítica' },
  { id: 'contabilidad', label: 'Finanzas - Libro Mayor' },
  { id: 'custodia_envios', label: 'Custodia - Envíos' },
  { id: 'custodia_config', label: 'Custodia - Configuración' },
  { id: 'whatsapp_bandeja', label: 'Bandeja Nova' },
  { id: 'whatsapp_status', label: 'Estado de Nova' },
  { id: 'gps', label: 'Seguimiento GPS' },
];

export default function GestionUsuariosPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', nombre: '', modulos: [] as string[] });
  
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser) return null;
    return query(collection(db, 'usuarios_panel'));
  }, [db, currentUser]);

  const { data: usuarios, isLoading } = useCollection<UsuarioPanel>(usersQuery);

  const handleSaveUser = async () => {
    if (!newUser.email || !newUser.nombre) return;
    setIsSaving(true);
    try {
      const userId = newUser.email.replace(/\W/g, '_');
      const docRef = doc(db, 'usuarios_panel', userId);
      
      await setDoc(docRef, {
        id: userId,
        email: newUser.email,
        nombre: newUser.nombre,
        rol: 'operador',
        modulos_permitidos: newUser.modulos,
        fecha_creacion: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Usuario Actualizado", description: "Los permisos han sido sincronizados." });
      setIsFormOpen(false);
      setNewUser({ email: '', nombre: '', modulos: [] });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los permisos." });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModulo = (modId: string) => {
    setNewUser(prev => ({
      ...prev,
      modulos: prev.modulos.includes(modId) 
        ? prev.modulos.filter(m => m !== modId) 
        : [...prev.modulos, modId]
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desea revocar el acceso a este usuario?')) return;
    try {
      await deleteDoc(doc(db, 'usuarios_panel', id));
      toast({ title: "Acceso Revocado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar" });
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Gestión de Accesos</h1>
          <p className="text-slate-500 text-sm font-medium">Control de roles y módulos permitidos para operadores del panel.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs h-11 px-6 rounded-xl shadow-lg">
              <UserPlus className="h-4 w-4 mr-2" /> Nuevo Operador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Perfil de Operador</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</label>
                  <Input value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} placeholder="Ej. Ana García" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Correo Corporativo</label>
                  <Input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="ana@jyj.com" className="rounded-xl h-11" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400">Módulos Permitidos</label>
                <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-2xl border">
                  {MODULOS.map(mod => (
                    <div key={mod.id} className="flex items-center space-x-3">
                      <Checkbox 
                        id={mod.id} 
                        checked={newUser.modulos.includes(mod.id)} 
                        onCheckedChange={() => toggleModulo(mod.id)}
                        className="rounded-md border-orange-500 data-[state=checked]:bg-orange-500"
                      />
                      <label htmlFor={mod.id} className="text-xs font-bold text-slate-700 uppercase cursor-pointer">{mod.label}</label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveUser} disabled={isSaving} className="w-full bg-slate-900 text-white font-black h-12 rounded-xl">
                {isSaving ? <Loader2 className="animate-spin" /> : "Guardar y Asignar Roles"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="rounded-3xl shadow-sm border-none overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Usuario</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Módulos Activos</TableHead>
                <TableHead className="p-5 font-black text-[10px] text-slate-400 uppercase">Rol</TableHead>
                <TableHead className="w-[50px] p-5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios?.map(u => (
                <TableRow key={u.id} className="border-b border-slate-50">
                  <TableCell className="p-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase">{u.nombre}</span>
                      <span className="text-[10px] font-bold text-slate-400">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <div className="flex flex-wrap gap-1">
                      {u.modulos_permitidos?.map(m => (
                        <Badge key={m} variant="outline" className="text-[8px] font-black uppercase px-2 py-0 border-orange-100 text-orange-600 bg-orange-50/30">
                          {m}
                        </Badge>
                      ))}
                      {(!u.modulos_permitidos || u.modulos_permitidos.length === 0) && (
                        <span className="text-[10px] text-slate-300 italic font-bold">SIN ACCESOS</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-5">
                    <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] uppercase">
                      {u.rol}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-5">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
        <div>
          <p className="text-xs font-black text-amber-900 uppercase mb-1">Nota de Seguridad</p>
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            La creación de nuevos usuarios requiere que el correo electrónico ya esté registrado en Firebase Authentication. 
            Este módulo gestiona exclusivamente los permisos de visibilidad y acceso a datos dentro del panel.
          </p>
        </div>
      </div>
    </div>
  );
}
