
import * as XLSX from "xlsx";

export interface Conductor {
  id: string;
  [key: string]: unknown;
}

export interface Vehiculo {
  id: string;
  [key: string]: unknown;
}

export interface AsignacionConductorVehiculo {
  conductorId: string;
  vehiculoId: string;
}

export interface CamposSeleccionados {
  nombres: boolean;
  apellidos: boolean;
  cedula: boolean;
  telefono: boolean;
  direccion: boolean;
  barrio: boolean;
  categoriaLicencia: boolean;
  vencimientoLicencia: boolean;
  placa: boolean;
  marca: boolean;
  linea: boolean;
  modelo: boolean;
  tipoVehiculo: boolean;
  capacidad: boolean;
  vencimientoSoat: boolean;
  vencimientoTecnomecanica: boolean;
  vencimientoTarjetaOperacion: boolean;
  vencimientoRcc: boolean;
  vencimientoRce: boolean;
}

export type TipoReporte = "conductores" | "vehiculos" | "combinado";

// Convierte cualquier valor de fecha a DD/MM/YYYY
function formatearFecha(val: unknown): string {
  if (!val) return "";
  const str = String(val);
  // Detectar ISO Timestamp o guiones
  if (str.includes("T") || str.includes("-")) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  }
  return str;
}

// Lee un campo del objeto con múltiples posibles nombres
function leerCampo(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "";
}

export function generarReporteExcel(
  conductores: Conductor[],
  vehiculos: Vehiculo[],
  asignaciones: AsignacionConductorVehiculo[],
  campos: CamposSeleccionados,
  tipoReporte: TipoReporte
): void {
  const condMap = new Map(conductores.map(c => [c.id, c as Record<string, unknown>]));
  const vehMap  = new Map(vehiculos.map(v => [v.id, v as Record<string, unknown>]));
  const hoy = new Date();
  const fechaHoy = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;

  const wb = XLSX.utils.book_new();

  // ── PORTADA ──────────────────────────────────────────────────────────────
  const portadaData = [
    ["TRANSPORTES ESPECIALES J&J"],
    [""],
    [tipoReporte === "combinado" ? "REPORTE DE CONDUCTORES Y VEHÍCULOS" :
     tipoReporte === "conductores" ? "REPORTE DE CONDUCTORES" : "REPORTE DE VEHÍCULOS"],
    [""],
    [`Fecha de generación: ${fechaHoy}`],
    [`Total registros: ${asignaciones.length}`],
    [""],
    ["Transportes Especiales J&J  |  Documento Confidencial  |  Bogotá D.C., Colombia"],
  ];
  const wsPortada = XLSX.utils.aoa_to_sheet(portadaData);
  wsPortada["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsPortada, "Portada");

  // ── REPORTE ───────────────────────────────────────────────────────────────
  interface ColDef {
    header: string;
    keys: string[];
    esFecha: boolean;
    fieldKey: keyof CamposSeleccionados;
  }

  const COLS_COND: ColDef[] = [
    { header: "Nombres",          keys: ["nombres", "Nombres", "nombre", "name"], fieldKey: "nombres", esFecha: false },
    { header: "Apellidos",        keys: ["apellidos", "Apellidos", "apellido", "lastName"], fieldKey: "apellidos", esFecha: false },
    { header: "Cédula",           keys: ["cedula", "Cedula", "cédula", "documento", "cc", "identificacion"], fieldKey: "cedula", esFecha: false },
    { header: "Teléfono",         keys: ["telefono", "Telefono", "teléfono", "phone", "celular", "movil"], fieldKey: "telefono", esFecha: false },
    { header: "Dirección",        keys: ["direccion", "Direccion", "dirección", "address"], fieldKey: "direccion", esFecha: false },
    { header: "Barrio",           keys: ["barrio", "Barrio", "neighborhood", "localidad"], fieldKey: "barrio", esFecha: false },
    { header: "Cat. Licencia",    keys: ["categoriaLicencia", "categoria", "licenciaCategoria", "catLicencia", "licencia", "licenseCat"], fieldKey: "categoriaLicencia", esFecha: false },
    { header: "Venc. Licencia",   keys: ["vencimientoLicencia", "vencLicencia", "licenciaVencimiento", "fechaVencimientoLicencia"], fieldKey: "vencimientoLicencia", esFecha: true },
  ];

  const COLS_VEH: ColDef[] = [
    { header: "Placa",            keys: ["placa", "Placa", "plate", "matricula"], fieldKey: "placa", esFecha: false },
    { header: "Marca",            keys: ["marca", "Marca", "brand"], fieldKey: "marca", esFecha: false },
    { header: "Línea",            keys: ["linea", "Linea", "línea", "line", "referencia", "lineaVehiculo"], fieldKey: "linea", esFecha: false },
    { header: "Modelo",           keys: ["modelo", "Modelo", "model", "year", "año", "anio"], fieldKey: "modelo", esFecha: false },
    { header: "Tipo",             keys: ["tipoVehiculo", "tipo", "Tipo", "type", "clase", "claseVehiculo"], fieldKey: "tipoVehiculo", esFecha: false },
    { header: "Capacidad",        keys: ["capacidad", "Capacidad", "pasajeros", "capacity", "numPasajeros"], fieldKey: "capacidad", esFecha: false },
    { header: "SOAT Venc.",       keys: ["vencimientoSoat", "soatVencimiento", "soat", "fechaSoat", "vencSoat", "soatFecha", "vencimientoSOAT"], fieldKey: "vencimientoSoat", esFecha: true },
    { header: "Tecnomecánica",    keys: ["vencimientoTecnomecanica", "tecnomecanicaVencimiento", "tecnomecanica", "tecno", "vencTecno"], fieldKey: "vencimientoTecnomecanica", esFecha: true },
    { header: "T. Operación",     keys: ["vencimientoTarjetaOperacion", "tarjetaOperacionVencimiento", "tarjetaOperacion", "toperacion", "vencOperacion"], fieldKey: "vencimientoTarjetaOperacion", esFecha: true },
    { header: "Póliza RCC",       keys: ["vencimientoRcc", "polizaRccVencimiento", "rcc", "polizaRcc", "vencRcc", "numeroPolizaRcc"], fieldKey: "vencimientoRcc", esFecha: true },
    { header: "Póliza RCE",       keys: ["vencimientoRce", "polizaRceVencimiento", "rce", "polizaRce", "vencRce", "numeroPolizaRce"], fieldKey: "vencimientoRce", esFecha: true },
  ];

  const colsActivas: ColDef[] = [];
  if (tipoReporte !== "vehiculos") {
    COLS_COND.forEach(c => { if (campos[c.fieldKey]) colsActivas.push(c); });
  }
  if (tipoReporte !== "conductores") {
    COLS_VEH.forEach(c => { if (campos[c.fieldKey]) colsActivas.push(c); });
  }

  // Construir las filas del reporte
  const rows: string[][] = [colsActivas.map(c => c.header)];

  asignaciones.forEach(asig => {
    const conductor = condMap.get(asig.conductorId) || {};
    const vehiculo = vehMap.get(asig.vehiculoId) || {};
    
    const row = colsActivas.map(col => {
      const val = leerCampo({ ...conductor, ...vehiculo }, ...col.keys);
      return col.esFecha ? formatearFecha(val) : String(val);
    });
    rows.push(row);
  });

  const wsReporte = XLSX.utils.aoa_to_sheet(rows);
  
  // Ajuste automático de anchos de columna
  const wscols = colsActivas.map(() => ({ wch: 20 }));
  wsReporte["!cols"] = wscols;

  XLSX.utils.book_append_sheet(wb, wsReporte, "Reporte");

  // Descarga del archivo
  XLSX.writeFile(wb, `Reporte_JJ_${tipoReporte}_${hoy.toISOString().split('T')[0]}.xlsx`);
}
