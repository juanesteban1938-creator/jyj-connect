import { Firestore, collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { AsientoContable, MovimientoContable, Servicio, Cliente, Transaccion } from './types';

/**
 * CONSTANTES DE TASAS IMPOSITIVAS (COLOMBIA 2026)
 */
const TASA_RETEFUENTE = 0.035; // 3.5% para servicios de transporte (Phase 2 update)
const TASA_RETEICA = 0.00966; // 9.66 por mil
const TASA_GMF = 0.004; // 4x1000

/**
 * Cuentas Contables (PUC Colombia)
 */
export const CUENTAS = {
  CAJA: { codigo: '1105', nombre: 'Caja General' },
  BANCOS: { codigo: '1110', nombre: 'Bancos' },
  CLIENTES: { codigo: '1305', nombre: 'Cuentas por Cobrar Clientes' },
  RETEFUENTE_FAVOR: { codigo: '135515', nombre: 'Anticipo Retefuente' },
  RETEICA_FAVOR: { codigo: '135518', nombre: 'Anticipo ReteICA' },
  PROVEEDORES: { codigo: '2205', nombre: 'Proveedores Nacionales' },
  OPERADORES: { codigo: '2335', nombre: 'Cuentas por Pagar Operadores' },
  INGRESOS_TRANSPORTE: { codigo: '4135', nombre: 'Ingresos por Transporte' },
  COSTO_VENTA: { codigo: '6135', nombre: 'Costo de Venta (Transporte)' },
  GASTO_GMF: { codigo: '5305', nombre: 'Gasto Financiero GMF 4x1000' },
  GASTOS_OPERATIVOS: { codigo: '5135', nombre: 'Gastos Operativos' },
};

/**
 * Valida que un asiento cumpla con el principio de partida doble.
 */
function validarPartidaDoble(movimientos: MovimientoContable[]): boolean {
  const debito = movimientos
    .filter(m => m.tipo === 'debito')
    .reduce((acc, curr) => acc + curr.valor, 0);
  
  const credito = movimientos
    .filter(m => m.tipo === 'credito')
    .reduce((acc, curr) => acc + curr.valor, 0);

  return Math.abs(debito - credito) < 1; // Tolerancia de 1 peso por redondeo
}

/**
 * Registra un asiento contable en la colección central.
 */
export async function registrarAsiento(db: Firestore, asiento: Omit<AsientoContable, 'id' | 'fecha' | 'totalDebito' | 'totalCredito'>) {
  const totalDebito = Math.round(asiento.movimientos
    .filter(m => m.tipo === 'debito')
    .reduce((acc, curr) => acc + curr.valor, 0));
  
  const totalCredito = Math.round(asiento.movimientos
    .filter(m => m.tipo === 'credito')
    .reduce((acc, curr) => acc + curr.valor, 0));

  if (!validarPartidaDoble(asiento.movimientos)) {
    console.error('Inconsistencia detectada:', { deb: totalDebito, cre: totalCredito });
    throw new Error(`Inconsistencia Contable: Débitos (${totalDebito}) no coinciden con Créditos (${totalCredito})`);
  }

  const payload: AsientoContable = {
    ...asiento,
    fecha: serverTimestamp(),
    totalDebito,
    totalCredito
  };

  return addDoc(collection(db, 'asientos_contables'), payload);
}

/**
 * GENERADORES AUTOMÁTICOS DE ASIENTOS (EVENT SOURCING)
 */

export async function generarAsientoServicio(db: Firestore, servicio: Servicio) {
  try {
    const valorBase = Number(servicio.valorServicio);
    const costoOperacion = Number(servicio.costoOperacion) || 0;
    const movimientos: MovimientoContable[] = [];
    const impuestos = [];

    // Obtener tipo de cliente (Jurídico/Natural)
    let esJuridico = false;
    if (servicio.nitCliente) {
        const clienteDoc = await getDoc(doc(db, 'clientes', servicio.nitCliente));
        if (clienteDoc.exists()) {
            const cData = clienteDoc.data();
            esJuridico = cData.tipo !== 'Particular';
        }
    }

    // 1. CAUSACIÓN DEL INGRESO
    movimientos.push({
      cuentaCodigo: CUENTAS.INGRESOS_TRANSPORTE.codigo,
      cuentaNombre: CUENTAS.INGRESOS_TRANSPORTE.nombre,
      tipo: 'credito',
      valor: valorBase,
      terceroNombre: servicio.clienteNombre || servicio.cliente,
      terceroNit: servicio.nitCliente
    });

    if (esJuridico) {
      const valorRetefuente = Math.round(valorBase * TASA_RETEFUENTE);
      const valorReteICA = Math.round(valorBase * TASA_RETEICA);
      const saldoNeto = valorBase - valorRetefuente - valorReteICA;

      movimientos.push({ cuentaCodigo: CUENTAS.RETEFUENTE_FAVOR.codigo, cuentaNombre: CUENTAS.RETEFUENTE_FAVOR.nombre, tipo: 'debito', valor: valorRetefuente });
      movimientos.push({ cuentaCodigo: CUENTAS.RETEICA_FAVOR.codigo, cuentaNombre: CUENTAS.RETEICA_FAVOR.nombre, tipo: 'debito', valor: valorReteICA });
      movimientos.push({ cuentaCodigo: CUENTAS.CLIENTES.codigo, cuentaNombre: CUENTAS.CLIENTES.nombre, tipo: 'debito', valor: saldoNeto, terceroNombre: servicio.cliente, terceroNit: servicio.nitCliente });

      impuestos.push({ tipo: 'retefuente' as any, valor: valorRetefuente, base: valorBase });
      impuestos.push({ tipo: 'reteica' as any, valor: valorReteICA, base: valorBase });
    } else {
      movimientos.push({ cuentaCodigo: CUENTAS.CLIENTES.codigo, cuentaNombre: CUENTAS.CLIENTES.nombre, tipo: 'debito', valor: valorBase, terceroNombre: servicio.cliente, terceroNit: servicio.nitCliente });
    }

    await registrarAsiento(db, {
      concepto: `Causación Ingreso: Servicio ${servicio.consecutivo} - ${servicio.cliente}`,
      sourceId: servicio.id,
      sourceModule: 'services',
      movimientos,
      impuestosAsociados: impuestos
    });

    // 2. CAUSACIÓN DEL COSTO (Si hay costo definido)
    if (costoOperacion > 0) {
        const movsCosto: MovimientoContable[] = [
            { cuentaCodigo: CUENTAS.COSTO_VENTA.codigo, cuentaNombre: CUENTAS.COSTO_VENTA.nombre, tipo: 'debito', valor: costoOperacion },
            { cuentaCodigo: CUENTAS.OPERADORES.codigo, cuentaNombre: CUENTAS.OPERADORES.nombre, tipo: 'credito', valor: costoOperacion, terceroNombre: servicio.conductor }
        ];

        await registrarAsiento(db, {
            concepto: `Causación Costo: Servicio ${servicio.consecutivo} - Conductor: ${servicio.conductor}`,
            sourceId: servicio.id,
            sourceModule: 'services',
            movimientos: movsCosto
        });
    }
  } catch (e) {
    console.error('[Engine] Fallo en causación:', e);
  }
}

export async function generarAsientoRecaudo(db: Firestore, servicio: Servicio, valorPago: number, metodo: string) {
  try {
    const movimientos: MovimientoContable[] = [
      { 
        cuentaCodigo: metodo === 'Efectivo' ? CUENTAS.CAJA.codigo : CUENTAS.BANCOS.codigo, 
        cuentaNombre: metodo === 'Efectivo' ? CUENTAS.CAJA.nombre : CUENTAS.BANCOS.nombre, 
        tipo: 'debito', 
        valor: valorPago 
      },
      { 
        cuentaCodigo: CUENTAS.CLIENTES.codigo, 
        cuentaNombre: CUENTAS.CLIENTES.nombre, 
        tipo: 'credito', 
        valor: valorPago, 
        terceroNombre: servicio.cliente, 
        terceroNit: servicio.nitCliente 
      }
    ];

    await registrarAsiento(db, {
      concepto: `Recaudo Cartera: Servicio ${servicio.consecutivo} - Pago vía ${metodo}`,
      sourceId: servicio.id,
      sourceModule: 'pagos',
      movimientos
    });
  } catch (e) {
    console.error('[Engine] Fallo en recaudo:', e);
  }
}

export async function generarAsientoGasto(db: Firestore, transaccion: Transaccion) {
  try {
    const valor = Number(transaccion.valor);
    const esBanco = true; // Por defecto asumimos bancos para disparar GMF si aplica
    
    const movimientos: MovimientoContable[] = [
      { cuentaCodigo: CUENTAS.GASTOS_OPERATIVOS.codigo, cuentaNombre: `Gasto: ${transaccion.descripcion}`, tipo: 'debito', valor },
      { cuentaCodigo: CUENTAS.BANCOS.codigo, cuentaNombre: CUENTAS.BANCOS.nombre, tipo: 'credito', valor }
    ];

    await registrarAsiento(db, {
      concepto: `Gasto P&G: ${transaccion.descripcion} (${transaccion.vehiculoPlaca || 'General'})`,
      sourceId: transaccion.id,
      sourceModule: 'rentabilidad',
      movimientos
    });

    // REGLA GMF 4x1000
    const valorGMF = Math.round(valor * TASA_GMF);
    if (valorGMF > 0) {
      await registrarAsiento(db, {
        concepto: `GMF 4x1000 - Transacción: ${transaccion.descripcion}`,
        sourceId: transaccion.id,
        sourceModule: 'rentabilidad',
        movimientos: [
          { cuentaCodigo: CUENTAS.GASTO_GMF.codigo, cuentaNombre: CUENTAS.GASTO_GMF.nombre, tipo: 'debito', valor: valorGMF },
          { cuentaCodigo: CUENTAS.BANCOS.codigo, cuentaNombre: CUENTAS.BANCOS.nombre, tipo: 'credito', valor: valorGMF }
        ]
      });
    }
  } catch (e) {
    console.error('[Engine] Fallo en gasto:', e);
  }
}
