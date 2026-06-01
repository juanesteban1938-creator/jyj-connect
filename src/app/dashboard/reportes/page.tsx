"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { generarReporteExcel } from "@/lib/reportes/excelGenerator";
import type {
  Conductor, Vehiculo, AsignacionConductorVehiculo,
  CamposSeleccionados, TipoReporte,
} from "@/lib/reportes/excelGenerator";

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

const CAMPOS_DEFAULT: CamposSeleccionados = {
  nombres: true, apellidos: true, cedula: true, telefono: true,
  direccion: true, barrio: true, categoriaLicencia: true, vencimientoLicencia: true,
  placa: true, marca: true, linea: true, modelo: true, tipoVehiculo: true, capacidad: true,
  vencimientoSoat: true, vencimientoTecnomecanica: true,
  vencimientoTarjetaOperacion: true, vencimientoRcc: true, vencimientoRce: true,
};

export default function ReportesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [tipoReporte,  setTipoReporte]  = useState<TipoReporte>("combinado");
  const [campos,       setCampos]       = useState<CamposSeleccionados>(CAMPOS_DEFAULT);
  const [asignaciones, setAsignaciones] = useState<AsignacionConductorVehiculo[]>([]);
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
        setConductores(snapCond.docs.map((d) => ({ id: d.id, ...d.data() } as Conductor)));
        setVehiculos(snapVeh.docs.map((d) => ({ id: d.id, ...d.data() } as Vehiculo)));
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

  const toggleCampo = (key: keyof CamposSeleccionados) =>
    setCampos((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleGenerarExcel = async () => {
    if (asignaciones.length === 0 && tipoReporte === "combinado") return;
    
    // Si es solo conductores o solo vehículos, generamos asignaciones automáticas para el reporte
    let dataAsignaciones = [...asignaciones];
    if (tipoReporte === "conductores") {
        dataAsignaciones = conductores.map(c => ({ conductorId: c.id, vehiculoId: "" }));
    } else if (tipoReporte === "vehiculos") {
        dataAsignaciones = vehiculos.map(v => ({ conductorId: "", vehiculoId: v.id }));
    }

    console.log("=== DIAGNÓSTICO REPORTE ===");
    console.log("Tipo:", tipoReporte);
    console.log("Asignaciones Generadas:", JSON.stringify(dataAsignaciones));
    console.log("Total conductores cargados:", conductores.length);
    console.log("Total vehículos cargados:", vehiculos.length);
    if (conductores.length > 0) console.log("Ejemplo conductor:", JSON.stringify(conductores[0]));
    if (vehiculos.length > 0) console.log("Ejemplo vehículo:", JSON.stringify(vehiculos[0]));

    setGenerando(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      generarReporteExcel(conductores, vehiculos, dataAsignaciones, campos, tipoReporte);
    } finally {
      setGenerando(false);
    }
  };

  const conductoresFiltrados = conductores.filter((c) =>
    `${c.nombres} ${c.apellidos} ${c.cedula}`.toLowerCase().includes(busquedaCond.toLowerCase())
  );
  const vehiculosFiltrados = vehiculos.filter((v) =>
    `${v.placa} ${v.marca} ${v.linea}`.toLowerCase().includes(busquedaVeh.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E5FA3] border-t-transparent" />
        <span className="ml-4 text-[#1A2B4A] font-medium">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-sans">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A2B4A]">Generador de Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura, personaliza y descarga reportes profesionales en Excel
        </p>
      </div>

      {/* Barra de pasos */}
      <div className="flex items-center mb-8 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        {[
          { n: 1, label: "Tipo y campos" },
          { n: 2, label: "Asignar conductor → vehículo" },
          { n: 3, label: "Confirmar y descargar" },
        ].map((p, i) => (
          <div key={p.n} className="flex items-center flex-1">
            <button
              onClick={() => setPaso(p.n as 1 | 2 | 3)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                paso === p.n ? "text-[#2E5FA3]" : paso > p.n ? "text-[#C8972B] cursor-pointer" : "text-gray-400"
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                paso === p.n ? "bg-[#2E5FA3] text-white" : paso > p.n ? "bg-[#C8972B] text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {paso > p.n ? "✓" : p.n}
              </span>
              {p.label}
            </button>
            {i < 2 && <div className="flex-1 h-px bg-gray-200 mx-3" />}
          </div>
        ))}
      </div>

      {/* ── PASO 1 ── */}
      {paso === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-4">¿Qué tipo de reporte necesitas?</h2>
            <div className="grid grid-cols-3 gap-4">
              {([
                { id: "combinado",   icon: "🔗", label: "Combinado",   desc: "Conductor + Vehículo asignado" },
                { id: "conductores", icon: "👤", label: "Conductores", desc: "Solo información de conductores" },
                { id: "vehiculos",   icon: "🚐", label: "Vehículos",   desc: "Solo datos de la flota" },
              ] as const).map((opt) => (
                <button key={opt.id} onClick={() => setTipoReporte(opt.id)}
                  className={`rounded-xl p-4 border-2 text-left transition-all ${
                    tipoReporte === opt.id ? "border-[#2E5FA3] bg-[#EEF4FB]" : "border-gray-200 hover:border-[#C6D9F0]"
                  }`}>
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <div className="font-semibold text-[#1A2B4A] text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#1A2B4A]">Elige los campos a incluir</h2>
              <button onClick={() => setCampos(CAMPOS_DEFAULT)} className="text-xs text-[#2E5FA3] hover:underline">
                Seleccionar todos
              </button>
            </div>
            {tipoReporte !== "vehiculos" && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#2E5FA3]" />
                  <h3 className="text-sm font-semibold text-[#2E5FA3]">Conductor</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CAMPOS_CONDUCTOR.map((campo) => (
                    <label key={campo.key} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={campos[campo.key as keyof CamposSeleccionados]} onChange={() => toggleCampo(campo.key as keyof CamposSeleccionados)} className="accent-[#2E5FA3]" />
                      <span className="text-xs text-gray-700">{campo.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {tipoReporte !== "conductores" && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#C8972B]" />
                  <h3 className="text-sm font-semibold text-[#C8972B]">Vehículo</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CAMPOS_VEHICULO.map((campo) => (
                    <label key={campo.key} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={campos[campo.key as keyof CamposSeleccionados]} onChange={() => toggleCampo(campo.key as keyof CamposSeleccionados)} className="accent-[#C8972B]" />
                      <span className="text-xs text-gray-700">{campo.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setPaso(tipoReporte === "conductores" ? 3 : (tipoReporte === "vehiculos" ? 3 : 2))}
              className="bg-[#2E5FA3] hover:bg-[#1A2B4A] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2 ── */}
      {paso === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-1">Asigna un vehículo a cada conductor</h2>
            <p className="text-xs text-gray-500 mb-5">Solo los conductores con vehículo asignado aparecerán en el reporte.</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <input type="text" placeholder="🔍 Buscar conductor..." value={busquedaCond}
                onChange={(e) => setBusquedaCond(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2E5FA3]" />
              <input type="text" placeholder="🔍 Buscar vehículo (placa/marca)..." value={busquedaVeh}
                onChange={(e) => setBusquedaVeh(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2E5FA3]" />
            </div>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {conductoresFiltrados.map((conductor) => {
                const vehAsignadoId = getVehiculoAsignado(conductor.id);
                const vehAsignado   = vehiculos.find((v) => v.id === vehAsignadoId);
                return (
                  <div key={conductor.id} className={`rounded-xl border p-4 transition-all ${vehAsignadoId ? "border-[#2E5FA3] bg-[#EEF4FB]" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {conductor.nombres?.[0]}{conductor.apellidos?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1A2B4A] truncate">{conductor.nombres} {conductor.apellidos}</p>
                        <p className="text-xs text-gray-400">Cédula: {conductor.cedula} · Lic. {conductor.categoriaLicencia}</p>
                      </div>
                      <div className="text-gray-400 text-lg flex-shrink-0">→</div>
                      <div className="flex-1 min-w-0">
                        <select value={vehAsignadoId} onChange={(e) => asignarVehiculo(conductor.id, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2E5FA3] bg-white">
                          <option value="">— Sin asignar —</option>
                          {vehiculosFiltrados.map((v) => {
                            const ocupado = asignaciones.some((a) => a.vehiculoId === v.id && a.conductorId !== conductor.id);
                            return (
                              <option key={v.id} value={v.id} disabled={ocupado}>
                                {v.placa} — {v.marca} {v.linea} {v.modelo}{ocupado ? " (asignado)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {vehAsignado && (
                        <div className="flex-shrink-0 bg-[#1A2B4A] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                          {vehAsignado.placa}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-[#2E5FA3]">{asignaciones.length}</span> de {conductores.length} conductores asignados
              </p>
              <button onClick={() => setAsignaciones([])} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                Limpiar todo
              </button>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setPaso(1)} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">← Atrás</button>
            <button onClick={() => setPaso(3)} disabled={asignaciones.length === 0}
              className="bg-[#2E5FA3] hover:bg-[#1A2B4A] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3 ── */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#1A2B4A] mb-5">Resumen del reporte</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#EEF4FB] rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#1A2B4A]">{tipoReporte === "conductores" ? conductores.length : (tipoReporte === "vehiculos" ? vehiculos.length : asignaciones.length)}</p>
                <p className="text-xs text-gray-500 mt-1">Registros incluidos</p>
              </div>
              <div className="bg-[#EEF4FB] rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#1A2B4A]">{Object.values(campos).filter(Boolean).length}</p>
                <p className="text-xs text-gray-500 mt-1">Columnas seleccionadas</p>
              </div>
              <div className="bg-[#EEF4FB] rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-[#1A2B4A] mt-2 capitalize">
                  {{ combinado: "Combinado", conductores: "Conductores", vehiculos: "Vehículos" }[tipoReporte]}
                </p>
                <p className="text-xs text-gray-500 mt-1">Tipo de reporte</p>
              </div>
            </div>
            
            {tipoReporte === "combinado" && (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs">
                    <thead>
                    <tr className="bg-[#1A2B4A] text-white">
                        <th className="px-3 py-2 text-left">Conductor</th>
                        <th className="px-3 py-2 text-left">Vehículo</th>
                        <th className="px-3 py-2 text-left">Placa</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                    </tr>
                    </thead>
                    <tbody>
                    {asignaciones.map((asig, i) => {
                        const c = conductores.find((x) => x.id === asig.conductorId);
                        const v = vehiculos.find((x) => x.id === asig.vehiculoId);
                        return (
                        <tr key={i} className={i % 2 === 0 ? "bg-[#C6D9F0]/30" : "bg-white"}>
                            <td className="px-3 py-2 font-medium text-[#1A2B4A]">{c?.nombres} {c?.apellidos}</td>
                            <td className="px-3 py-2 text-gray-600">{v?.marca} {v?.linea} {v?.modelo}</td>
                            <td className="px-3 py-2"><span className="bg-[#1A2B4A] text-white px-2 py-0.5 rounded font-bold">{v?.placa}</span></td>
                            <td className="px-3 py-2 text-gray-500">{v?.tipoVehiculo}</td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">Campos incluidos:</p>
              <div className="flex flex-wrap gap-1.5">
                {[...CAMPOS_CONDUCTOR, ...CAMPOS_VEHICULO].filter((c) => campos[c.key as keyof CamposSeleccionados]).map((c) => (
                  <span key={c.key} className="bg-[#EEF4FB] text-[#2E5FA3] text-xs px-2 py-0.5 rounded-full">{c.label}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button onClick={() => setPaso(tipoReporte === "combinado" ? 2 : 1)}
              className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
              ← Atrás
            </button>
            <button onClick={handleGenerarExcel} disabled={generando || (tipoReporte === "combinado" && asignaciones.length === 0)}
              className="flex items-center gap-2 bg-[#C8972B] hover:bg-[#a87820] disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg">
              {generando ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Generando Excel...</>
              ) : <>📥 Descargar Reporte Excel</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
