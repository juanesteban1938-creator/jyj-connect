import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { generarAsientoServicio, generarAsientoRecaudo } from '@/lib/accounting-engine';

export const dynamic = 'force-dynamic';

/**
 * @fileOverview Script de Migración Única
 * Propósito: Sincronizar servicios históricos con el nuevo Motor Contable.
 * Ejecución: Acceder vía GET a /api/migrar-contabilidad
 */

export async function GET() {
  // Inicialización del SDK de Firebase en el entorno del servidor (API Route)
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app);

  let migrados = 0;
  let omitidos = 0;
  let errores = 0;

  try {
    // 1. Obtener todos los servicios del historial
    const servicesSnap = await getDocs(collection(db, 'services'));
    
    console.log(`[Migración] Iniciando procesamiento de ${servicesSnap.size} servicios...`);

    for (const serviceDoc of servicesSnap.docs) {
      try {
        const serviceData = { id: serviceDoc.id, ...serviceDoc.data() } as any;

        // 2. Control de duplicados: Verificar si ya existe un asiento de causación para este serviceId
        const checkQuery = query(
          collection(db, 'asientos_contables'), 
          where('sourceId', '==', serviceData.id),
          where('sourceModule', '==', 'services')
        );
        const checkSnap = await getDocs(checkQuery);

        if (checkSnap.empty) {
          // 3. Disparar Causación Contable (Ingreso vs CxC y Costo vs CxP)
          await generarAsientoServicio(db, serviceData);

          // 4. Si el servicio ya figura como Pagado, disparar el asiento de Recaudo (Bancos vs CxC)
          const saldo = Number(serviceData.saldo);
          if (serviceData.estadoPago === 'Pagado' || saldo <= 0) {
            const valorRecaudo = Number(serviceData.valorServicio) || 0;
            const metodo = serviceData.metodoPago || 'Transferencia';
            
            await generarAsientoRecaudo(db, serviceData, valorRecaudo, metodo);
          }
          migrados++;
        } else {
          omitidos++;
        }
      } catch (err) {
        console.error(`[Migración] Error procesando servicio ${serviceDoc.id}:`, err);
        errores++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Proceso de migración contable finalizado.",
      summary: {
        total_analizados: servicesSnap.size,
        asientos_generados: migrados,
        ya_existentes_omitidos: omitidos,
        fallidos: errores
      }
    });

  } catch (err: any) {
    console.error('[Migración] Error Crítico:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      context: "Asegúrese de tener conexión a Firestore y que las reglas de seguridad permitan la lectura masiva."
    }, { status: 500 });
  }
}
