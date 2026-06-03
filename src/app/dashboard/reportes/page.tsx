
"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  Settings2, 
  Link as LinkIcon, 
  Download,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TipoReporte = "conductores" | "vehiculos" | "combinado";

const CAMPOS_CONDUCTOR = [
  { key: "nombres",             label: "Nombres" },
  { key: "apellidos",           label: "Apellidos" },
  { key: "cedula",              label: "Cédula" },
  { key: "telefono",            label: "Teléfono" },
  { key: "direccion",           label: "Dirección" },
  { key: "barrio",              label: "Barrio" },
  { key: "categoriaLicencia",   label: "Categoría Licencia" },
  { key: "vencimientoLicencia", label: "Venc. Licencia" },
] as const;

const CAMPOS_VEHICULO = [
  { key: "placa",                       label: "Placa" },
  { key: "marca",                       label: "Marca" },
  { key: "linea",                       label: "Línea" },
  { key: "modelo",                      label: "Modelo" },
  { key: "tipoVehiculo",                label: "Tipo" },
  { key: "capacidad",                   label: "Capacidad" },
  { key: "vencimientoSoat",             label: "SOAT Vencimiento" },
  { key: "vencimientoTecnomecanica",    label: "Tecnomecánica Venc." },
  { key: "vencimientoTarjetaOperacion", label: "T. Operación Venc." },
  { key: "vencimientoRcc",              label: "Póliza RCC Venc." },
  { key: "vencimientoRce",              label: "Póliza RCE Venc." },
] as const;

const CAMPOS_DEFAULT: Record<string, boolean> = {
  nombres: true, apellidos: true, cedula: true, telefono: true,
  direccion: true, barrio: true, categoriaLicencia: true, vencimientoLicencia: true,
  placa: true, marca: true, linea: true, modelo: true, tipoVehiculo: true, capacidad: true,
  vencimientoSoat: true, vencimientoTecnomecanica: true,
  vencimientoTarjetaOperacion: true, vencimientoRcc: true, vencimientoRce: true,
};

export default function ReportesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [conductores, setConductores] = useState<any[]>([]);
  const [vehiculos,   setVehiculos]   = useState<any[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [tipoReporte,  setTipoReporte]  = useState<TipoReporte>("combinado");
  const [campos,       setCampos]       = useState<Record<string, boolean>>(CAMPOS_DEFAULT);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [paso,         setPaso]         = useState<1 | 2 | 3>(1);
  const [generando,    setGenerando]    = useState(false);
  const [busquedaCond, setBusquedaCond] = useState("");
  const [busquedaVeh,  setBusquedaVeh]  = useState("");

  useEffect(() => {
    async function cargarDatos() {
      if (!db || !user) return;
      try {
        const [snapCond, snapVeh] = await Promise.all([
          getDocs(collection(db, "conductores")),
          getDocs(collection(db, "vehiculos")),
        ]);
        setConductores(snapCond.docs.map((d) => ({ id: d.id, ...d.data() })));
        setVehiculos(snapVeh.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [db, user]);

  const getVehiculoAsignado = useCallback(
    (conductorId: string) => asignaciones.find((a) => a.conductorId === conductorId)?.vehiculoId ?? "",
    [asignaciones]
  );

  const asignarVehiculo = (conductorId: string, vehiculoId: string) => {
    setAsignaciones((prev) => {
      const sin = prev.filter((a) => a.conductorId !== conductorId && a.vehiculoId !== vehiculoId);
      if (!vehiculoId) return prev.filter((a) => a.conductorId !== conductorId);
      return [...sin, { conductorId, vehiculoId }];
    });
  };

  const toggleCampo = (key: string) =>
    setCampos((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleGenerarExcel = async () => {
    let dataAsignaciones = [...asignaciones];
    if (tipoReporte === "conductores") {
        dataAsignaciones = conductores.map(c => ({ conductorId: c.id, vehiculoId: "" }));
    } else if (tipoReporte === "vehiculos") {
        dataAsignaciones = vehiculos.map(v => ({ conductorId: "", vehiculoId: v.id }));
    }

    if (dataAsignaciones.length === 0) {
      toast({ variant: "destructive", title: "Sin asignaciones", description: "Debes asignar al menos un vehículo a un conductor." });
      return;
    }

    setGenerando(true);
    try {
      const response = await fetch('/api/generar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductores,
          vehiculos,
          asignaciones: dataAsignaciones,
          tipoReporte,
        }),
      });

      if (!response.ok) throw new Error('Error en el servidor al procesar el Excel');
      
      const result = await response.json();
      const { base64, filename } = result;
      
      const blob = new Blob(
        [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; 
      a.download = filename; 
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Reporte Generado", description: "El archivo se ha descargado con éxito." });
    } catch (err: any) {
      console.error("Error generando reporte:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte profesional." });
    } finally {
      setGenerando(false);
    }
  };

  const conductoresFiltrados = conductores.filter((c) =>
    `${String(c.nombres)} ${String(c.apellidos)} ${String(c.cedula)}`.toLowerCase().includes(busquedaCond.toLowerCase())
  );
  const vehiculosFiltrados = vehiculos.filter((v) =>
    `${String(v.placa)} ${String(v.marca)} ${String(v.linea)}`.toLowerCase().includes(busquedaVeh.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-[0.3em]">Preparando Centro de Reportes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-orange-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Auditoría y Reportes</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-1">Generación de archivos Excel de alta fidelidad para control de flota.</p>
        </div>
      </header>

      {/* Pasos */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        {[
          { n: 1, label: "Filtros y Campos", icon: Settings2 },
          { n: 2, label: "Vincular Unidades", icon: LinkIcon },
          { n: 3, label: "Descarga Final", icon: Download },
        ].map((p, i) => (
          <div key={p.n} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "flex items-center gap-3 transition-all",
              paso === p.n ? "text-orange-600" : paso > p.n ? "text-emerald-500" : "text-slate-300"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center font-black transition-all",
                paso === p.n ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : 
                paso > p.n ? "bg-emerald-500 text-white" : "bg-slate-100"
              )}>
                {paso > p.n ? <CheckCircle className="h-5 w-5" /> : <p.icon className="h-5 w-5" />}
              </div>
              <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest">{p.label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-slate-100 mx-6" />}
          </div>
        ))}
      </div>

      {/* ── PASO 1 ── */}
      {paso === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="lg:col-span-4 rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-8 space-y-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Tipo de Auditoría</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: "combinado",   icon: "🔗", label: "Combinado",   desc: "Cruce Conductor vs Vehículo" },
                  { id: "conductores", icon: "👤", label: "Conductores", desc: "Sábana de personal" },
                  { id: "vehiculos",   icon: "🚐", label: "Vehículos",   desc: "Inventario técnico" },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => setTipoReporte(opt.id as any)}
                    className={cn(
                      "rounded-2xl p-5 border-2 text-left transition-all group",
                      tipoReporte === opt.id ? "border-orange-500 bg-orange-50/30" : "border-slate-100 hover:border-orange-200 bg-white"
                    )}>
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{opt.icon}</div>
                    <div className="font-black text-slate-900 text-xs uppercase tracking-tight">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-8 rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Configuración de Columnas</h2>
                <Button variant="ghost" onClick={() => setCampos(CAMPOS_DEFAULT)} className="text-[10px] font-black uppercase text-orange-500">Reiniciar</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {tipoReporte !== "vehiculos" && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Atributos Conductor</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CAMPOS_CONDUCTOR.map((campo) => (
                        <label key={campo.key} className={cn("flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer", campos[campo.key] ? "bg-indigo-50/50 border-indigo-100" : "bg-slate-50/30 border-transparent hover:border-slate-200")}>
                          <input type="checkbox" checked={campos[campo.key]} onChange={() => toggleCampo(campo.key)} className="accent-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase truncate">{campo.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {tipoReporte !== "conductores" && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Atributos Vehículo</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CAMPOS_VEHICULO.map((campo) => (
                        <label key={campo.key} className={cn("flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer", campos[campo.key] ? "bg-blue-50/50 border-blue-100" : "bg-slate-50/30 border-transparent hover:border-slate-200")}>
                          <input type="checkbox" checked={campos[campo.key]} onChange={() => toggleCampo(campo.key)} className="accent-blue-500" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase truncate">{campo.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={() => setPaso(tipoReporte === "combinado" ? 2 : 3)} className="bg-slate-900 text-white font-black text-xs uppercase h-12 px-10 rounded-2xl shadow-xl">
                  Continuar Auditoría <Loader2 className="ml-2 h-4 w-4 hidden" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── PASO 2 ── */}
      {paso === 2 && (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Asignación de Unidades</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Vincula los conductores con sus vehículos actuales para el cruce de datos.</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500 text-white px-3 py-1 font-black text-[10px]">{asignaciones.length} VÍNCULOS</Badge>
                <Button variant="ghost" onClick={() => setAsignaciones([])} className="text-[10px] font-black uppercase text-red-500">Limpiar Todo</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <input type="text" placeholder="BUSCAR CONDUCTOR..." value={busquedaCond} onChange={(e) => setBusquedaCond(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 ring-orange-500 outline-none" />
              <input type="text" placeholder="BUSCAR PLACA/MECÁNICA..." value={busquedaVeh} onChange={(e) => setBusquedaVeh(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 ring-orange-500 outline-none" />
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
              {conductoresFiltrados.map((conductor) => {
                const vehAsignadoId = getVehiculoAsignado(conductor.id);
                const vehAsignado   = vehiculos.find((v) => v.id === vehAsignadoId);
                return (
                  <div key={conductor.id} className={cn(
                    "rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center gap-4",
                    vehAsignadoId ? "border-orange-500 bg-orange-50/10 shadow-sm" : "border-slate-100 bg-white"
                  )}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                        {conductor.nombres?.[0]}{conductor.apellidos?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-800 uppercase truncate">{conductor.nombres} {conductor.apellidos}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">CÉDULA: {conductor.cedula}</p>
                      </div>
                    </div>
                    <div className="hidden sm:block text-slate-200">→</div>
                    <div className="flex-1">
                      <select 
                        value={vehAsignadoId} 
                        onChange={(e) => asignarVehiculo(conductor.id, e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase focus:ring-2 ring-orange-500 outline-none appearance-none"
                      >
                        <option value="">(SIN VEHÍCULO ASIGNADO)</option>
                        {vehiculosFiltrados.map((v) => {
                          const ocupado = asignaciones.some((a) => a.vehiculoId === v.id && a.conductorId !== conductor.id);
                          return (
                            <option key={v.id} value={v.id} disabled={ocupado}>
                              {v.placa} — {v.marca} {v.linea} {ocupado ? " [EN USO]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {vehAsignado && (
                      <Badge className="bg-slate-900 text-white font-black px-3 h-8 rounded-lg tracking-widest text-[10px]">
                        {vehAsignado.placa}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t">
              <Button variant="ghost" onClick={() => setPaso(1)} className="text-[10px] font-black uppercase text-slate-400">Volver a Configuración</Button>
              <Button onClick={() => setPaso(3)} disabled={asignaciones.length === 0} className="bg-slate-900 text-white font-black text-xs uppercase h-12 px-10 rounded-2xl shadow-xl">
                Finalizar Asignación
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── PASO 3 ── */}
      {paso === 3 && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden text-center p-12">
            <div className="flex justify-center mb-8">
              <div className="h-24 w-24 rounded-[2rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Auditoría Lista para Generar</h2>
            <p className="text-slate-400 text-sm font-medium mb-12">El sistema ha consolidado {asignaciones.length || conductores.length || vehiculos.length} registros con {Object.values(campos).filter(Boolean).length} atributos específicos.</p>
            
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registros</p>
                <p className="text-2xl font-black text-slate-800">{tipoReporte === "combinado" ? asignaciones.length : (tipoReporte === "conductores" ? conductores.length : vehiculos.length)}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Formato</p>
                <p className="text-2xl font-black text-slate-800">.XLSX</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Auditoría</p>
                <p className="text-lg font-black text-orange-600 uppercase truncate">{tipoReporte}</p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-3xl p-6 mb-12 border border-orange-100 flex items-start gap-4 text-left">
              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-orange-700 uppercase leading-relaxed">Nota: El archivo incluirá un semáforo de vigencias (Rojo/Amarillo) basado en la fecha actual para SOAT, Licencias y Tecnico-mecánicas.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="ghost" onClick={() => setPaso(tipoReporte === "combinado" ? 2 : 1)} className="text-[10px] font-black uppercase text-slate-400 h-14 px-8">Ajustar Datos</Button>
              <Button onClick={handleGenerarExcel} disabled={generando} className="bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase h-14 px-12 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 min-w-[280px]">
                {generando ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> PROCESANDO...</> : <><Download className="mr-2 h-5 w-5" /> DESCARGAR REPORTE</>}
              </Button>
            </div>
          </Card>
          
          <footer className="text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Engine: J&J Connect Report System v3.0</p>
          </footer>
        </div>
      )}
    </div>
  );
}
