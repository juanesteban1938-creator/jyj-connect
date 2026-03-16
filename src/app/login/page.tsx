'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { 
  Loader2, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Bell, 
  CreditCard, 
  ArrowRight,
  Truck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: "Credenciales inválidas. Por favor verifique sus datos.",
        });
      }
    } catch (err) {
      // Error manejado por el contexto
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      {/* PANEL IZQUIERDO: BRANDING (60%) */}
      <div className="relative hidden lg:flex lg:w-[60%] bg-[#1a1a2e] flex-col justify-center p-16 overflow-hidden">
        {/* Fondo con Gradiente y Patrón Geométrico */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] z-0" />
        <div 
          className="absolute inset-0 opacity-[0.03] z-0" 
          style={{ 
            backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 20px)' 
          }}
        />
        
        {/* Contenido de Branding */}
        <div className="relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-[#F59E0B] p-4 rounded-2xl shadow-2xl shadow-orange-500/20">
              <Truck className="h-12 w-12 text-black" />
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter text-white leading-none">J&J</h1>
              <p className="text-[#F59E0B] font-bold tracking-[0.3em] uppercase text-sm mt-1">Connect V2.0</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-light text-slate-300 mb-12 max-w-md leading-tight">
            Tecnología al servicio del <span className="text-white font-bold italic">transporte especial</span>.
          </h2>

          <div className="space-y-8 max-w-sm">
            <div className="flex items-center gap-5 group">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 group-hover:bg-[#F59E0B]/10 group-hover:border-[#F59E0B]/30 transition-all">
                <ShieldCheck className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-white font-bold">Gestión en tiempo real</p>
                <p className="text-slate-400 text-sm">Control total de su flota y conductores.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 group-hover:bg-[#F59E0B]/10 group-hover:border-[#F59E0B]/30 transition-all">
                <Bell className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-white font-bold">Notificaciones automáticas</p>
                <p className="text-slate-400 text-sm">Sincronización directa con sus clientes.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 group">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 group-hover:bg-[#F59E0B]/10 group-hover:border-[#F59E0B]/30 transition-all">
                <CreditCard className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-white font-bold">Control financiero</p>
                <p className="text-slate-400 text-sm">Rentabilidad y facturación centralizada.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Panel Izquierdo */}
        <div className="absolute bottom-12 left-16 z-10 text-slate-500 text-xs font-medium uppercase tracking-widest">
          © 2026 J&J Connect — Operaciones de Transporte
        </div>
      </div>

      {/* PANEL DERECHO: FORMULARIO (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 sm:p-12 relative bg-white">
        <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          <header className="mb-10">
            <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Bienvenido de nuevo</h3>
            <p className="text-slate-500 font-medium">Ingrese sus credenciales para acceder al sistema.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase text-slate-400 ml-1 tracking-wider">Usuario / Correo</Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nombre@empresa.com" 
                  className="pl-12 h-14 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-[#F59E0B] focus-visible:border-[#F59E0B] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-black uppercase text-slate-400 tracking-wider">Contraseña</Label>
                <button type="button" className="text-[10px] font-bold text-[#F59E0B] hover:underline uppercase tracking-tight">¿Olvidó su clave?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="pl-12 h-14 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-[#F59E0B] focus-visible:border-[#F59E0B] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[#F59E0B] hover:bg-[#e6950a] text-black font-black text-lg rounded-[12px] shadow-xl shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98] transition-all group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>AUTENTICANDO...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>INICIAR SESIÓN</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <footer className="mt-12 text-center">
            <p className="text-slate-400 text-sm">
              ¿No tiene acceso? Contacte con <span className="text-slate-900 font-bold">Soporte Técnico</span>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
