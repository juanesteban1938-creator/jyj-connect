import { NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

const C = {
  AZUL_OSC:  "1A2B4A",
  AZUL_MED:  "2E5FA3",
  AZUL_CLAR: "C6D9F0",
  DORADO:    "C8972B",
  BLANCO:    "FFFFFF",
  GRIS:      "F5F7FA",
  GRIS_TEXT: "4A4A4A",
  ROJO:      "FADBD8",
  AMARILLO:  "FEF9E7",
};

function fmtFecha(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  if (s.includes("T") || s.includes("-")) {
    const d = new Date(s);
    if (!isNaN(d.getTime()))
      return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  return s;
}

function vigenciaColor(fechaStr: string): string {
  const s = fmtFecha(fechaStr);
  if (!s) return "";
  const p = s.split("/");
  if (p.length !== 3) return "";
  const d = new Date(`${p[2]}-${p[1]}-${p[0]}`);
  const diff = Math.floor((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return C.ROJO;
  if (diff <= 90) return C.AMARILLO;
  return "";
}

export async function POST(req: Request) {
  let input;
  try {
    const rawBody = await req.text();
    input = rawBody.trim() ? JSON.parse(rawBody) : null;
    if (!input) throw new Error("Cuerpo de petición vacío");
  } catch (e) {
    return NextResponse.json({ error: "Petición JSON inválida." }, { status: 400 });
  }

  try {
    const { conductores, vehiculos, asignaciones, tipoReporte } = input;
    const wb = new ExcelJS.Workbook();
    const hoy = new Date();
    const fechaHoy = `${String(hoy.getDate()).padStart(2,"0")}/${String(hoy.getMonth()+1).padStart(2,"0")}/${hoy.getFullYear()}`;

    // ── PORTADA ──
    const portada = wb.addWorksheet("Portada");
    portada.views = [{ showGridLines: false }];
    for (let i = 1; i <= 11; i++) portada.getColumn(i).width = 13;

    portada.addRow([]).height = 8;
    const r2 = portada.addRow(["TRANSPORTES ESPECIALES J&J"]);
    r2.height = 60;
    portada.mergeCells(`A2:K2`);
    r2.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    r2.getCell(1).font = { name:"Arial", size:26, bold:true, color:{argb:"FF"+C.BLANCO} };
    r2.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

    const r3 = portada.addRow([""]); r3.height = 6;
    portada.mergeCells("A3:K3");
    r3.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.DORADO} };

    const titulo = tipoReporte === "combinado" ? "REPORTE DE CONDUCTORES Y VEHÍCULOS" :
                   tipoReporte === "conductores" ? "REPORTE DE CONDUCTORES" : "REPORTE DE VEHÍCULOS";
    const r4 = portada.addRow([titulo]); r4.height = 40;
    portada.mergeCells("A4:K4");
    r4.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.GRIS} };
    r4.getCell(1).font = { name:"Arial", size:16, bold:true, color:{argb:"FF"+C.AZUL_OSC} };
    r4.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

    const r5 = portada.addRow([""]); r5.height = 6;
    portada.mergeCells("A5:K5");
    r5.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.DORADO} };

    const infoRows = [
      `Fecha de generación: ${fechaHoy}`,
      `Total registros: ${asignaciones.length}`,
      `Tipo de reporte: ${titulo}`,
    ];

    infoRows.forEach(txt => {
      const r = portada.addRow([txt]); 
      r.height = 24;
      portada.mergeCells(`A${r.number}:K${r.number}`);
      r.getCell(1).font = { name:"Arial", size:10, color:{argb:"FF"+C.GRIS_TEXT} };
      r.getCell(1).alignment = { horizontal:"center", vertical:"middle" };
    });

    const rPie = portada.addRow(["Transportes Especiales J&J  |  Documento Confidencial  |  Bogotá D.C., Colombia"]);
    rPie.height = 20;
    portada.mergeCells(`A${rPie.number}:K${rPie.number}`);
    rPie.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    rPie.getCell(1).font = { name:"Arial", size:9, italic:true, color:{argb:"FF"+C.BLANCO} };
    rPie.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

    // ── HOJA REPORTE ──
    const ws = wb.addWorksheet("Reporte");
    ws.views = [{ showGridLines: false, state:"frozen", ySplit:4 }];
    
    const COLS = [
      { h:"Nombres",       k:"nombres", w:18 },
      { h:"Apellidos",     k:"apellidos", w:22 },
      { h:"Cédula",        k:"cedula", w:13 },
      { h:"Placa",         k:"placa", w:10 },
      { h:"SOAT Venc.",    k:"vencimientoSoat", w:16 },
      { h:"Tecnomecánica", k:"vencimientoTecnomecanica", w:16 }
    ];

    COLS.forEach((col, i) => { ws.getColumn(i+1).width = col.w; });
    const f4 = ws.addRow(COLS.map(c => c.h));
    
    const buffer = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    
    return NextResponse.json({ 
      base64, 
      filename: `Reporte_JJ_${tipoReporte}_${hoy.toISOString().slice(0,10)}.xlsx` 
    });

  } catch (err: any) {
    console.error('Error en Generación de Excel:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
