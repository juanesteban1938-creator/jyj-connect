import { Firestore, collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { AsientoContable, MovimientoContable, Servicio, Cliente, Transaccion } from './types';

/**
 * CONSTANTES DE TASAS IMPOSITIVAS (COLOMBIA 2026)
 */
const TASA_RETEFUENTE = 0.035; // 3.5% para servicios de transporte
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
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  
  const credito = movimientos
    .filter(m => m.tipo === 'credito')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  return Math.round(debito) === Math.round(credito);
}

/**
 * Registra un asiento contable en la colección central.
 */
export async function registrarAsiento(db: Firestore, asiento: Omit<AsientoContable, 'id' | 'fecha' | 'totalDebito' | 'totalCredito'>) {
  const totalDebito = Math.round(asiento.movimientos
    .filter(m => m.tipo === 'debito')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));
  
  const totalCredito = Math.round(asiento.movimientos
    .filter(m => m.tipo === 'credito')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0));

  // VALIDACIÓN DE PARTIDA DOBLE
  if (!validarPartidaDoble(asiento.movimientos)) {
    console.error('Inconsistencia en Asiento:', JSON.stringify(asiento.movimientos, null, 2));
    throw new Error(`Inconsistencia Contable: Débitos (${totalDebito}) no coinciden con Créditos (${totalCredito})`);
  }

  // VALIDACIÓN OBLIGATORIA DE TERCEROS
  asiento.movimientos.forEach((mov, idx) => {
    if (!mov.terceroId || !mov.terceroNombre) {
      throw new Error(`Error en línea ${idx + 1}: El tercero (ID y Nombre) es obligatorio para el cumplimiento contable.`);
    }
  });

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
    const valorBase = Math.round(Number(servicio.valorServicio) || 0);
    const costoOperacion = Math.round(Number(servicio.costoOperacion) || 0);
    
    if (valorBase <= 0) return;

    const idCliente = servicio.nitCliente || 'NIT-PENDIENTE';
    const nombreCliente = servicio.clienteNombre || servicio.cliente || 'CLIENTE-PENDIENTE';
    const idConductor = servicio.conductorId || 'CC-PENDIENTE';
    const nombreConductor = servicio.conductor || 'CONDUCTOR-PENDIENTE';

    const movimientos: MovimientoContable[] = [];
    const impuestos = [];

    // Obtener tipo de cliente (Jurídico/Natural)
    let esJuridico = false;
    if (servicio.nitCliente) {
        try {
            const clienteDoc = await getDoc(doc(db, 'clientes', servicio.nitCliente));
            if (clienteDoc.exists()) {
                const cData = clienteDoc.data();
                esJuridico = cData.tipo !== 'Particular' && cData.tipo !== undefined;
            }
        } catch (e) {
            console.warn('[Engine] No se pudo verificar tipo de cliente, asumiendo Natural.');
        }
    }

    // 1. CAUSACIÓN DEL INGRESO (CRÉDITO)
    movimientos.push({
      cuentaCodigo: CUENTAS.INGRESOS_TRANSPORTE.codigo,
      cuentaNombre: CUENTAS.INGRESOS_TRANSPORTE.nombre,
      tipo: 'credito',
      valor: valorBase,
      terceroId: idCliente,
      terceroNombre: nombreCliente
    });

    // 2. CAUSACIÓN DEL ACTIVO (DÉBITO)
    if (esJuridico) {
      const valorRetefuente = Math.round(valorBase * TASA_RETEFUENTE);
      const valorReteICA = Math.round(valorBase * TASA_RETEICA);
      const saldoNeto = valorBase - valorRetefuente - valorReteICA;

      movimientos.push({ cuentaCodigo: CUENTAS.RETEFUENTE_FAVOR.codigo, cuentaNombre: CUENTAS.RETEFUENTE_FAVOR.nombre, tipo: 'debito', valor: valorRetefuente, terceroId: idCliente, terceroNombre: nombreCliente });
      movimientos.push({ cuentaCodigo: CUENTAS.RETEICA_FAVOR.codigo, cuentaNombre: CUENTAS.RETEICA_FAVOR.nombre, tipo: 'debito', valor: valorReteICA, terceroId: idCliente, terceroNombre: nombreCliente });
      movimientos.push({ 
        cuentaCodigo: CUENTAS.CLIENTES.codigo, 
        cuentaNombre: CUENTAS.CLIENTES.nombre, 
        tipo: 'debito', 
        valor: saldoNeto, 
        terceroId: idCliente, 
        terceroNombre: nombreCliente 
      });

      impuestos.push({ tipo: 'retefuente' as any, valor: valorRetefuente, base: valorBase });
      impuestos.push({ tipo: 'reteica' as any, valor: valorReteICA, base: valorBase });
    } else {
      movimientos.push({ 
        cuentaCodigo: CUENTAS.CLIENTES.codigo, 
        cuentaNombre: CUENTAS.CLIENTES.nombre, 
        tipo: 'debito', 
        valor: valorBase, 
        terceroId: idCliente, 
        terceroNombre: nombreCliente 
      });
    }

    await registrarAsiento(db, {
      concepto: `Causación Ingreso: Servicio ${servicio.consecutivo} - ${nombreCliente}`,
      sourceId: servicio.id,
      sourceModule: 'services',
      movimientos,
      impuestosAsociados: impuestos
    });

    // 3. CAUSACIÓN DEL COSTO (Si hay costo definido)
    if (costoOperacion > 0) {
        const movsCosto: MovimientoContable[] = [
            { cuentaCodigo: CUENTAS.COSTO_VENTA.codigo, cuentaNombre: CUENTAS.COSTO_VENTA.nombre, tipo: 'debito', valor: costoOperacion, terceroId: idConductor, terceroNombre: nombreConductor },
            { cuentaCodigo: CUENTAS.OPERADORES.codigo, cuentaNombre: CUENTAS.OPERADORES.nombre, tipo: 'credito', valor: costoOperacion, terceroId: idConductor, terceroNombre: nombreConductor }
        ];

        await registrarAsiento(db, {
            concepto: `Causación Costo: Servicio ${servicio.consecutivo} - Conductor: ${nombreConductor}`,
            sourceId: servicio.id,
            sourceModule: 'services',
            movimientos: movsCosto
        });
    }
  } catch (e: any) {
    console.error('[Engine] Fallo en causación:', e.message);
  }
}

export async function generarAsientoRecaudo(db: Firestore, servicio: Servicio, valorPago: number, metodo: string) {
  try {
    const monto = Math.round(Number(valorPago) || 0);
    if (monto <= 0) return;

    const idCliente = servicio.nitCliente || 'NIT-PENDIENTE';
    const nombreCliente = servicio.clienteNombre || servicio.cliente || 'CLIENTE-PENDIENTE';

    const movimientos: MovimientoContable[] = [
      { 
        cuentaCodigo: metodo === 'Efectivo' ? CUENTAS.CAJA.codigo : CUENTAS.BANCOS.codigo, 
        cuentaNombre: metodo === 'Efectivo' ? CUENTAS.CAJA.nombre : CUENTAS.BANCOS.nombre, 
        tipo: 'debito', 
        valor: monto,
        terceroId: idCliente,
        terceroNombre: nombreCliente
      },
      { 
        cuentaCodigo: CUENTAS.CLIENTES.codigo, 
        cuentaNombre: CUENTAS.CLIENTES.nombre, 
        tipo: 'credito', 
        valor: monto, 
        terceroId: idCliente,
        terceroNombre: nombreCliente 
      }
    ];

    await registrarAsiento(db, {
      concepto: `Recaudo Cartera: Servicio ${servicio.consecutivo} - Pago vía ${metodo}`,
      sourceId: servicio.id,
      sourceModule: 'pagos',
      movimientos
    });
  } catch (e: any) {
    console.error('[Engine] Fallo en recaudo:', e.message);
  }
}

export async function generarAsientoGasto(db: Firestore, transaccion: Transaccion) {
  try {
    const valor = Math.round(Number(transaccion.valor) || 0);
    if (valor <= 0) return;

    const idTercero = transaccion.terceroId || 'NIT-901456789-1'; // NIT Empresa por defecto para gastos generales
    const nombreTercero = transaccion.terceroNombre || 'Transportes Especiales J&J';

    const movimientos: MovimientoContable[] = [
      { cuentaCodigo: CUENTAS.GASTOS_OPERATIVOS.codigo, cuentaNombre: `Gasto: ${transaccion.descripcion}`, tipo: 'debito', valor, terceroId: idTercero, terceroNombre: nombreTercero },
      { cuentaCodigo: CUENTAS.BANCOS.codigo, cuentaNombre: CUENTAS.BANCOS.nombre, tipo: 'credito', valor, terceroId: idTercero, terceroNombre: nombreTercero }
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
          { cuentaCodigo: CUENTAS.GASTO_GMF.codigo, cuentaNombre: CUENTAS.GASTO_GMF.nombre, tipo: 'debito', valor: valorGMF, terceroId: idTercero, terceroNombre: nombreTercero },
          { cuentaCodigo: CUENTAS.BANCOS.codigo, cuentaNombre: CUENTAS.BANCOS.nombre, tipo: 'credito', valor: valorGMF, terceroId: idTercero, terceroNombre: nombreTercero }
        ]
      });
    }
  } catch (e: any) {
    console.error('[Engine] Fallo en gasto:', e.message);
  }
}
