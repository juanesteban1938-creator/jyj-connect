import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { AsientoContable, MovimientoContable, Servicio, Cliente, Transaccion } from './types';

/**
 * CONSTANTES DE TASAS IMPOSITIVAS (COLOMBIA)
 */
const TASA_RETEFUENTE = 0.04; // 4% para servicios en general
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

  // Usamos un margen de error mínimo por decimales
  return Math.abs(debito - credito) < 0.01;
}

/**
 * Registra un asiento contable en la colección central.
 */
export async function registrarAsiento(db: Firestore, asiento: Omit<AsientoContable, 'id' | 'fecha' | 'totalDebito' | 'totalCredito'>) {
  const totalDebito = asiento.movimientos
    .filter(m => m.tipo === 'debito')
    .reduce((acc, curr) => acc + curr.valor, 0);
  
  const totalCredito = asiento.movimientos
    .filter(m => m.tipo === 'credito')
    .reduce((acc, curr) => acc + curr.valor, 0);

  if (!validarPartidaDoble(asiento.movimientos)) {
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
 * GENERADORES AUTOMÁTICOS DE ASIENTOS
 */

/**
 * Genera asiento de causación para un servicio.
 */
export async function generarAsientoServicio(db: Firestore, servicio: Servicio, cliente: Cliente) {
  const valorBase = Number(servicio.valorServicio);
  const movimientos: MovimientoContable[] = [];
  const impuestos = [];

  // 1. Crédito a Ingresos (Siempre el 100% de la venta)
  movimientos.push({
    cuentaCodigo: CUENTAS.INGRESOS_TRANSPORTE.codigo,
    cuentaNombre: CUENTAS.INGRESOS_TRANSPORTE.nombre,
    tipo: 'credito',
    valor: valorBase,
    terceroNombre: cliente.razonSocial,
    terceroNit: cliente.nit
  });

  if (cliente.tipo !== 'Particular') {
    // Es Persona Jurídica -> Aplicar Deducciones
    const valorRetefuente = Math.round(valorBase * TASA_RETEFUENTE);
    const valorReteICA = Math.round(valorBase * TASA_RETEICA);
    const saldoNeto = valorBase - valorRetefuente - valorReteICA;

    // Débito Impuestos a Favor
    movimientos.push({
      cuentaCodigo: CUENTAS.RETEFUENTE_FAVOR.codigo,
      cuentaNombre: CUENTAS.RETEFUENTE_FAVOR.nombre,
      tipo: 'debito',
      valor: valorRetefuente
    });
    movimientos.push({
      cuentaCodigo: CUENTAS.RETEICA_FAVOR.codigo,
      cuentaNombre: CUENTAS.RETEICA_FAVOR.nombre,
      tipo: 'debito',
      valor: valorReteICA
    });

    // Débito a Clientes (Neto)
    movimientos.push({
      cuentaCodigo: CUENTAS.CLIENTES.codigo,
      cuentaNombre: CUENTAS.CLIENTES.nombre,
      tipo: 'debito',
      valor: saldoNeto,
      terceroNombre: cliente.razonSocial,
      terceroNit: cliente.nit
    });

    impuestos.push({ tipo: 'retefuente' as const, valor: valorRetefuente, base: valorBase });
    impuestos.push({ tipo: 'reteica' as const, valor: valorReteICA, base: valorBase });
  } else {
    // Es Persona Natural -> Causar 100% a Clientes
    movimientos.push({
      cuentaCodigo: CUENTAS.CLIENTES.codigo,
      cuentaNombre: CUENTAS.CLIENTES.nombre,
      tipo: 'debito',
      valor: valorBase,
      terceroNombre: cliente.razonSocial,
      terceroNit: cliente.nit
    });
  }

  return registrarAsiento(db, {
    concepto: `Causación Servicio ${servicio.consecutivo} - ${cliente.razonSocial}`,
    sourceId: servicio.id,
    sourceModule: 'services',
    movimientos,
    impuestosAsociados: impuestos
  });
}

/**
 * Genera asiento de pago (Recaudo de Cartera).
 */
export async function generarAsientoRecaudo(db: Firestore, servicio: Servicio, valorPago: number, metodo: string) {
  const movimientos: MovimientoContable[] = [];

  // 1. Débito a Caja o Bancos
  const cuentaDestino = metodo === 'Efectivo' ? CUENTAS.CAJA : CUENTAS.BANCOS;
  movimientos.push({
    cuentaCodigo: cuentaDestino.codigo,
    cuentaNombre: cuentaDestino.nombre,
    tipo: 'debito',
    valor: valorPago
  });

  // 2. Crédito a Clientes (Disminuye deuda)
  movimientos.push({
    cuentaCodigo: CUENTAS.CLIENTES.codigo,
    cuentaNombre: CUENTAS.CLIENTES.nombre,
    tipo: 'credito',
    valor: valorPago,
    terceroNombre: servicio.clienteNombre || servicio.cliente,
    terceroNit: servicio.nitCliente
  });

  return registrarAsiento(db, {
    concepto: `Recaudo de Cartera - Servicio ${servicio.consecutivo}`,
    sourceId: servicio.id,
    sourceModule: 'pagos',
    movimientos
  });
}

/**
 * Genera asiento de gasto con regla 4x1000.
 */
export async function generarAsientoGasto(db: Firestore, transaccion: Transaccion) {
  const valorGasto = Number(transaccion.valor);
  const movimientos: MovimientoContable[] = [];
  
  // 1. Débito al Gasto
  movimientos.push({
    cuentaCodigo: CUENTAS.GASTOS_OPERATIVOS.codigo,
    cuentaNombre: `Gasto: ${transaccion.descripcion}`,
    tipo: 'debito',
    valor: valorGasto
  });

  // 2. Crédito a Bancos
  movimientos.push({
    cuentaCodigo: CUENTAS.BANCOS.codigo,
    cuentaNombre: CUENTAS.BANCOS.nombre,
    tipo: 'credito',
    valor: valorGasto
  });

  // ASIENTO PRINCIPAL DEL GASTO
  await registrarAsiento(db, {
    concepto: `Gasto Operativo: ${transaccion.descripcion} (${transaccion.vehiculoPlaca || 'General'})`,
    sourceId: transaccion.id,
    sourceModule: 'rentabilidad',
    movimientos
  });

  // REGLA DEL 4x1000 (Si el pago sale de Bancos)
  const valorGMF = Math.round(valorGasto * TASA_GMF);
  if (valorGMF > 0) {
    const movsGMF: MovimientoContable[] = [
      {
        cuentaCodigo: CUENTAS.GASTO_GMF.codigo,
        cuentaNombre: CUENTAS.GASTO_GMF.nombre,
        tipo: 'debito',
        valor: valorGMF
      },
      {
        cuentaCodigo: CUENTAS.BANCOS.codigo,
        cuentaNombre: CUENTAS.BANCOS.nombre,
        tipo: 'credito',
        valor: valorGMF
      }
    ];

    await registrarAsiento(db, {
      concepto: `Gravamen Movimientos Financieros (GMF 4x1000) - Transacción ${transaccion.id}`,
      sourceId: transaccion.id,
      sourceModule: 'rentabilidad',
      movimientos: movsGMF,
      impuestosAsociados: [{ tipo: 'gmf_4x1000', valor: valorGMF, base: valorGasto }]
    });
  }
}
