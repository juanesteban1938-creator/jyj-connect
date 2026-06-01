
// lib/reportes/excelGenerator.ts
import XLSX from "xlsx-js-style";

export interface Conductor {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  direccion: string;
  barrio: string;
  categoriaLicencia: string;
  vencimientoLicencia: string;
}

export interface Vehiculo {
  id: string;
  placa: string;
  marca: string;
  linea: string;
  modelo: string;
  tipoVehiculo: string;
  capacidad: number;
  vencimientoSoat: string;
  vencimientoTecnomecanica: string;
  vencimientoTarjetaOperacion: string;
  vencimientoRcc: string;
  vencimientoRce: string;
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

const C = {
  AZUL_OSCURO:  "1A2B4A",
  AZUL_MEDIO:   "2E5FA3",
  AZUL_CLARO:   "C6D9F0",
  DORADO:       "C8972B",
  BLANCO:       "FFFFFF",
  GRIS_CLARO:   "F5F7FA",
  GRIS_TEXTO:   "4A4A4A",
  ROJO_SUAVE:   "FADBD8",
  AMARILLO_SUV: "FEF9E7",
};

function cellStyle(opts: {
  bold?: boolean;
  color?: string;
  bgColor?: string;
  fontSize?: number;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "center" | "bottom";
  wrapText?: boolean;
  border?: boolean;
  italic?: boolean;
}): any {
  const style: any = {
    font: {
      name: "Arial",
      sz: opts.fontSize ?? 9,
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: { rgb: opts.color ?? C.GRIS_TEXTO },
    },
    alignment: {
      horizontal: opts.hAlign ?? "center",
      vertical: opts.vAlign ?? "center",
      wrapText: opts.wrapText ?? false,
    },
  };
  if (opts.bgColor) {
    style.fill = { fgColor: { rgb: opts.bgColor }, patternType: "solid" };
  }
  if (opts.border) {
    const b = { style: "thin", color: { rgb: "D0D7E3" } };
    style.border = { top: b, bottom: b, left: b, right: b };
  }
  return style;
}

function headerStyle(): any {
  return {
    font: { name: "Arial", sz: 9, bold: true, color: { rgb: C.BLANCO } },
    fill: { fgColor: { rgb: C.AZUL_OSCURO }, patternType: "solid" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      bottom: { style: "medium", color: { rgb: C.DORADO } },
      left:   { style: "thin",   color: { rgb: C.BLANCO } },
      right:  { style: "thin",   color: { rgb: C.BLANCO } },
      top:    { style: "thin",   color: { rgb: C.BLANCO } },
    },
  };
}

function evaluarVigencia(fechaStr: string): "vencido" | "proximo" | "vigente" {
  if (!fechaStr) return "vigente";
  try {
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return "vigente";
    const hoy   = new Date();
    const diff  = Math.floor((fecha.getTime() - hoy.getTime()) / 86400000);
    if (diff < 0)   return "vencido";
    if (diff <= 90) return "proximo";
  } catch (e) {
    return "vigente";
  }
  return "vigente";
}

function bgVigencia(fechaStr: string, baseEven: boolean): string {
  const v = evaluarVigencia(fechaStr);
  if (v === "vencido") return C.ROJO_SUAVE;
  if (v === "proximo") return C.AMARILLO_SUV;
  return baseEven ? C.AZUL_CLARO : C.BLANCO;
}

export function generarReporteExcel(
  conductores: Conductor[],
  vehiculos: Vehiculo[],
  asignaciones: AsignacionConductorVehiculo[],
  campos: CamposSeleccionados,
  tipoReporte: TipoReporte
): void {
  const wb = XLSX.utils.book_new();
  const condMap = new Map(conductores.map((c) => [c.id, c]));
  const vehMap  = new Map(vehiculos.map((v) => [v.id, v]));
  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  // ── PORTADA ──────────────────────────────────────────────────────────────
  const wsPortada = XLSX.utils.aoa_to_sheet([[]]);
  const subtitulos: Record<TipoReporte, string> = {
    conductores: "REPORTE DE CONDUCTORES",
    vehiculos:   "REPORTE DE VEHÍCULOS",
    combinado:   "REPORTE DE CONDUCTORES Y VEHÍCULOS",
  };

  wsPortada["A1"] = { v: "", s: cellStyle({ bgColor: C.AZUL_OSCURO }) };
  wsPortada["A2"] = { v: "TRANSPORTES ESPECIALES J&J", s: cellStyle({ bold: true, color: C.BLANCO, bgColor: C.AZUL_OSCURO, fontSize: 20 }) };
  wsPortada["A3"] = { v: "", s: cellStyle({ bgColor: C.DORADO }) };
  wsPortada["A4"] = { v: subtitulos[tipoReporte], s: cellStyle({ bold: true, color: C.AZUL_OSCURO, bgColor: C.GRIS_CLARO, fontSize: 14 }) };
  wsPortada["A5"] = { v: "", s: cellStyle({ bgColor: C.DORADO }) };
  wsPortada["A6"] = { v: `Fecha de Generación: ${fechaStr}`, s: cellStyle({ color: C.GRIS_TEXTO, fontSize: 10 }) };
  wsPortada["A7"] = { v: `Total registros: ${asignaciones.length}`, s: cellStyle({ color: C.GRIS_TEXTO, fontSize: 10, italic: true }) };
  wsPortada["A38"] = { v: "Transportes Especiales J&J  |  Documento Confidencial  |  Bogotá D.C., Colombia", s: cellStyle({ color: C.BLANCO, bgColor: C.AZUL_OSCURO, fontSize: 8, italic: true }) };

  wsPortada["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 10 } },
    { s: { r: 37, c: 0 }, e: { r: 37, c: 10 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsPortada, "Portada");

  // ── HOJA DE DATOS ─────────────────────────────────────────────────────────
  interface ColDef {
    label: string; key: string;
    fuente: "conductor" | "vehiculo";
    esFecha: boolean; width: number;
  }

  const COLS_CONDUCTOR: ColDef[] = [
    { label: "Nombres",           key: "nombres",             fuente: "conductor", esFecha: false, width: 18 },
    { label: "Apellidos",         key: "apellidos",           fuente: "conductor", esFecha: false, width: 20 },
    { label: "Cédula",            key: "cedula",              fuente: "conductor", esFecha: false, width: 13 },
    { label: "Teléfono",          key: "telefono",            fuente: "conductor", esFecha: false, width: 14 },
    { label: "Dirección",         key: "direccion",           fuente: "conductor", esFecha: false, width: 28 },
    { label: "Barrio",            key: "barrio",              fuente: "conductor", esFecha: false, width: 18 },
    { label: "Cat. Licencia",     key: "categoriaLicencia",   fuente: "conductor", esFecha: false, width: 10 },
    { label: "Venc. Licencia",    key: "vencimientoLicencia", fuente: "conductor", esFecha: true,  width: 16 },
  ];

  const COLS_VEHICULO: ColDef[] = [
    { label: "Placa",                   key: "placa",                       fuente: "vehiculo", esFecha: false, width: 10 },
    { label: "Marca",                   key: "marca",                       fuente: "vehiculo", esFecha: false, width: 12 },
    { label: "Línea",                   key: "linea",                       fuente: "vehiculo", esFecha: false, width: 14 },
    { label: "Modelo",                  key: "modelo",                      fuente: "vehiculo", esFecha: false, width: 8  },
    { label: "Tipo",                    key: "tipoVehiculo",                fuente: "vehiculo", esFecha: false, width: 12 },
    { label: "Capacidad (Pasajeros)",   key: "capacidad",                   fuente: "vehiculo", esFecha: false, width: 10 },
    { label: "SOAT Vencimiento",        key: "vencimientoSoat",             fuente: "vehiculo", esFecha: true,  width: 16 },
    { label: "Tecnomecánica Venc.",     key: "vencimientoTecnomecanica",    fuente: "vehiculo", esFecha: true,  width: 16 },
    { label: "T. Operación Venc.",      key: "vencimientoTarjetaOperacion", fuente: "vehiculo", esFecha: true,  width: 18 },
    { label: "Póliza RCC Venc.",        key: "vencimientoRcc",              fuente: "vehiculo", esFecha: true,  width: 14 },
    { label: "Póliza RCE Venc.",        key: "vencimientoRce",              fuente: "vehiculo", esFecha: true,  width: 14 },
  ];

  const colsActivas: ColDef[] = [];
  if (tipoReporte !== "vehiculos") {
    COLS_CONDUCTOR.forEach((c) => { if (campos[c.key as keyof CamposSeleccionados]) colsActivas.push(c); });
  }
  if (tipoReporte !== "conductores") {
    COLS_VEHICULO.forEach((c) => { if (campos[c.key as keyof CamposSeleccionados]) colsActivas.push(c); });
  }

  const ws = XLSX.utils.aoa_to_sheet([[]]);
  const merges: XLSX.Range[] = [];
  const totalCols = colsActivas.length;

  // Barra azul oscuro fila 0
  for (let c = 0; c < totalCols; c++) {
    ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: "", s: cellStyle({ bgColor: C.AZUL_OSCURO }) };
  }
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

  // Título fila 1
  ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = {
    v: subtitulos[tipoReporte] + "  —  TRANSPORTES ESPECIALES J&J",
    s: cellStyle({ bold: true, color: C.BLANCO, bgColor: C.AZUL_OSCURO, fontSize: 12 }),
  };
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });

  // Encabezados fila 3
  colsActivas.forEach((col, ci) => {
    ws[XLSX.utils.encode_cell({ r: 3, c: ci })] = { v: col.label, s: headerStyle() };
  });

  // Filas de datos
  asignaciones.forEach((asig, rowIdx) => {
    const conductor = condMap.get(asig.conductorId);
    const vehiculo  = vehMap.get(asig.vehiculoId);
    const isEven    = rowIdx % 2 === 0;
    const baseColor = isEven ? C.AZUL_CLARO : C.BLANCO;

    colsActivas.forEach((col, ci) => {
      const r = rowIdx + 4;
      const fuente = col.fuente === "conductor" ? conductor : vehiculo;
      const val = fuente ? (fuente as any)[col.key] ?? "" : "";
      const addr = XLSX.utils.encode_cell({ r, c: ci });
      let bgColor = baseColor;
      if (col.esFecha) bgColor = bgVigencia(String(val), isEven);
      const isPlaca = col.key === "placa";
      ws[addr] = {
        v: val,
        s: {
          font: { name: "Arial", sz: 9, bold: isPlaca, color: { rgb: isPlaca ? C.AZUL_OSCURO : C.GRIS_TEXTO } },
          fill: { fgColor: { rgb: bgColor }, patternType: "solid" },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top:    { style: "thin", color: { rgb: "D0D7E3" } },
            bottom: { style: "thin", color: { rgb: "D0D7E3" } },
            left:   { style: "thin", color: { rgb: "D0D7E3" } },
            right:  { style: "thin", color: { rgb: "D0D7E3" } },
          },
        },
      };
    });
  });

  ws["!cols"]   = colsActivas.map((c) => ({ wch: c.width }));
  ws["!merges"] = merges;
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");

  // Descargar
  XLSX.writeFile(wb, `Reporte_JJ_${tipoReporte}_${hoy.toISOString().slice(0, 10)}.xlsx`);
}
