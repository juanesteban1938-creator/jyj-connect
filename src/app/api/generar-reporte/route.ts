
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
  try {
    const { conductores, vehiculos, asignaciones, tipoReporte } = await req.json();
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

    // Pie portada
    for (let i = portada.rowCount + 1; i <= 37; i++) portada.addRow([]).height = 18;
    const rPie = portada.addRow(["Transportes Especiales J&J  |  Documento Confidencial  |  Bogotá D.C., Colombia"]);
    rPie.height = 20;
    portada.mergeCells(`A${rPie.number}:K${rPie.number}`);
    rPie.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    rPie.getCell(1).font = { name:"Arial", size:9, italic:true, color:{argb:"FF"+C.BLANCO} };
    rPie.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

    // ── HOJA REPORTE ──
    const ws = wb.addWorksheet("Reporte");
    ws.views = [{ showGridLines: false, state:"frozen", ySplit:4 }];
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToWidth = 1;

    const COLS = [
      { h:"Nombres",       k:"nombres",                    f:false, w:18 },
      { h:"Apellidos",     k:"apellidos",                  f:false, w:22 },
      { h:"Cédula",        k:"cedula",                     f:false, w:13 },
      { h:"Teléfono",      k:"telefono",                   f:false, w:14 },
      { h:"Dirección",     k:"direccion",                  f:false, w:28 },
      { h:"Barrio",        k:"barrio",                     f:false, w:16 },
      { h:"Cat. Licencia", k:"categoriaLicencia",          f:false, w:10 },
      { h:"Venc. Licencia",k:"vencimientoLicencia",        f:true,  w:16 },
      { h:"Placa",         k:"placa",                      f:false, w:10 },
      { h:"Marca",         k:"marca",                      f:false, w:12 },
      { h:"Línea",         k:"linea",                      f:false, w:16 },
      { h:"Modelo",        k:"modelo",                     f:false, w:8  },
      { h:"Tipo",          k:"tipoVehiculo",               f:false, w:12 },
      { h:"Capacidad",     k:"capacidad",                  f:false, w:10 },
      { h:"SOAT Venc.",    k:"vencimientoSoat",            f:true,  w:16 },
      { h:"Tecnomecánica", k:"vencimientoTecnomecanica",   f:true,  w:16 },
      { h:"T. Operación",  k:"vencimientoTarjetaOperacion",f:true,  w:18 },
      { h:"Póliza RCC",    k:"vencimientoRcc",             f:true,  w:14 },
      { h:"Póliza RCE",    k:"vencimientoRce",             f:true,  w:14 },
    ];

    COLS.forEach((col, i) => { ws.getColumn(i+1).width = col.w; });
    
    const getColLetter = (n: number) => { 
      let s = "", t = n; 
      while (t > 0) { 
        s = String.fromCharCode(64 + (t % 26 || 26)) + s; 
        t = Math.floor((t - 1) / 26); 
      } 
      return s; 
    };
    const LC = getColLetter(COLS.length);

    // Fila 1: barra
    const f1 = ws.addRow([]); f1.height = 8;
    ws.mergeCells(`A1:${LC}1`);
    f1.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };

    // Fila 2: título
    const f2 = ws.addRow(["TRANSPORTES ESPECIALES J&J  —  " + titulo.toUpperCase()]);
    f2.height = 34;
    ws.mergeCells(`A2:${LC}2`);
    f2.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    f2.getCell(1).font = { name:"Arial", size:13, bold:true, color:{argb:"FF"+C.BLANCO} };
    f2.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

    // Fila 3: grupos
    const f3 = ws.addRow([]); f3.height = 18;
    ws.mergeCells(`A3:${getColLetter(8)}3`);
    const g1 = f3.getCell(1);
    g1.value = "INFORMACIÓN DEL CONDUCTOR";
    g1.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_MED} };
    g1.font = { name:"Arial", size:9, bold:true, color:{argb:"FF"+C.BLANCO} };
    g1.alignment = { horizontal:"center", vertical:"middle" };
    
    ws.mergeCells(`${getColLetter(9)}3:${LC}3`);
    const g2 = f3.getCell(9);
    g2.value = "DATOS DEL VEHÍCULO Y DOCUMENTACIÓN";
    g2.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.DORADO} };
    g2.font = { name:"Arial", size:9, bold:true, color:{argb:"FF"+C.BLANCO} };
    g2.alignment = { horizontal:"center", vertical:"middle" };

    // Fila 4: encabezados
    const f4 = ws.addRow(COLS.map(c => c.h)); f4.height = 36;
    f4.eachCell((cell) => {
      cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
      cell.font = { name:"Arial", size:9, bold:true, color:{argb:"FF"+C.BLANCO} };
      cell.alignment = { horizontal:"center", vertical:"middle", wrapText:true };
      cell.border = {
        bottom:{ style:"medium", color:{argb:"FF"+C.DORADO} },
        left:{ style:"thin", color:{argb:"FF"+C.BLANCO} },
        right:{ style:"thin", color:{argb:"FF"+C.BLANCO} },
      };
    });

    // Filas de datos
    const condMap = new Map(conductores.map((c: any) => [c.id, c]));
    const vehMap  = new Map(vehiculos.map((v: any) => [v.id, v]));

    asignaciones.forEach((asig: any, idx: number) => {
      const cond = condMap.get(asig.conductorId) || {};
      const veh  = vehMap.get(asig.vehiculoId) || {};
      const isEven = idx % 2 === 0;
      const baseColor = isEven ? C.AZUL_CLAR : C.BLANCO;

      const rowVals = COLS.map(col => {
        const src = ["placa","marca","linea","modelo","tipoVehiculo","capacidad","vencimientoSoat","vencimientoTecnomecanica","vencimientoTarjetaOperacion","vencimientoRcc","vencimientoRce"].includes(col.k) ? veh : cond;
        const val = src[col.k];
        return col.f ? fmtFecha(val) : (val ?? "");
      });

      const row = ws.addRow(rowVals); row.height = 22;
      row.eachCell((cell, colNumber) => {
        const col = COLS[colNumber - 1];
        const rawVal = col.f ? String(rowVals[colNumber-1]) : "";
        const vColor = col.f ? vigenciaColor(rawVal) : "";
        const bg = vColor || baseColor;
        
        cell.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+bg} };
        const isPlaca = col.k === "placa";
        cell.font = { name:"Arial", size:9, bold:isPlaca, color:{argb:"FF"+(isPlaca ? C.AZUL_OSC : C.GRIS_TEXT)} };
        cell.alignment = { horizontal:"center", vertical:"middle" };
        cell.border = { 
          top:{style:"thin", color:{argb:"FFD0D7E3"}}, 
          bottom:{style:"thin", color:{argb:"FFD0D7E3"}}, 
          left:{style:"thin", color:{argb:"FFD0D7E3"}}, 
          right:{style:"thin", color:{argb:"FFD0D7E3"}} 
        };
      });
    });

    // Fila total
    const fTot = ws.addRow([`Total: ${asignaciones.length} registros  |  Generado: ${fechaHoy}`]);
    fTot.height = 20;
    ws.mergeCells(`A${fTot.number}:${LC}${fTot.number}`);
    fTot.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    fTot.getCell(1).font = { name:"Arial", size:9, bold:true, color:{argb:"FF"+C.BLANCO} };
    fTot.getCell(1).alignment = { horizontal:"left", vertical:"middle" };

    // Leyenda
    ws.addRow([]).height = 10;
    const fLey = ws.addRow(["LEYENDA DE VIGENCIAS:"]); fLey.height = 16;
    fLey.getCell(1).font = { name:"Arial", size:9, bold:true, color:{argb:"FF"+C.AZUL_OSC} };

    const leyendas = [
      { color: C.BLANCO, label: "Vigente (más de 90 días)" },
      { color: C.AMARILLO, label: "Próximo a vencer (menos de 90 días)" },
      { color: C.ROJO, label: "Documento Vencido" }
    ];

    leyendas.forEach(item => {
      const r = ws.addRow(["", item.label]); r.height = 16;
      r.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+item.color} };
      r.getCell(1).border = { 
        top:{style:"thin",color:{argb:"FFD0D7E3"}}, 
        bottom:{style:"thin",color:{argb:"FFD0D7E3"}}, 
        left:{style:"thin",color:{argb:"FFD0D7E3"}}, 
        right:{style:"thin",color:{argb:"FFD0D7E3"}} 
      };
      r.getCell(2).font = { name:"Arial", size:9, color:{argb:"FF"+C.GRIS_TEXT} };
    });

    // Pie
    for (let i = 0; i < 3; i++) ws.addRow([]).height = 16;
    const fPie = ws.addRow(["Transportes Especiales J&J  |  Documento Confidencial  |  Bogotá D.C., Colombia"]);
    fPie.height = 18;
    ws.mergeCells(`A${fPie.number}:${LC}${fPie.number}`);
    fPie.getCell(1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+C.AZUL_OSC} };
    fPie.getCell(1).font = { name:"Arial", size:8, italic:true, color:{argb:"FF"+C.BLANCO} };
    fPie.getCell(1).alignment = { horizontal:"center", vertical:"middle" };

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
